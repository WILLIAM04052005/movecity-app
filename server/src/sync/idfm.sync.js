// ============================================================
// Synchronisation IDFM → PostgreSQL.
//  - idempotente : on peut la lancer autant de fois qu'on veut ;
//  - transactionnelle : tout est appliqué ou rien ;
//  - prudente : une station non rapprochée n'est jamais touchée,
//    un ascenseur qui disparaît du flux passe en « inconnu » (jamais « disponible »).
// ============================================================
const fs = require('fs');
const path = require('path');
const { query, transaction } = require('../config/database');
const mapping = require('./idfm.mapping');

function chargerAlias() {
  const brut = JSON.parse(fs.readFileSync(path.join(__dirname, 'alias-stations.json'), 'utf8'));
  return Object.fromEntries(Object.entries(brut).filter(([cle]) => !cle.startsWith('_')));
}

/**
 * @param {object[]} bruts      enregistrements bruts du flux
 * @param {{dryRun?: boolean, purgerDemo?: boolean, alias?: object}} options
 */
async function synchroniser(bruts, { dryRun = false, purgerDemo = false, alias = chargerAlias() } = {}) {
  const { enregistrements, ignores } = mapping.normaliserTout(bruts);
  if (enregistrements.length === 0) {
    // Un flux vide est presque toujours une panne de la source : on ne touche à rien.
    const colonnes = bruts.length ? Object.keys(bruts[0]).slice(0, 8).join(', ') : '';
    throw new Error(
      'Le flux ne contient aucun ascenseur exploitable : synchronisation annulée, base inchangée.' +
        (colonnes
          ? `\n  Colonnes trouvées : ${colonnes}\n  Colonnes attendues : liftId, liftStatus, ZdCId, ZdCName… (jeu « État des ascenseurs »). Ce fichier semble être un autre jeu de données.`
          : '')
    );
  }

  const { rows: stations } = await query('SELECT id_station, nom_station, ref_zdc FROM station');
  const { associations, zonesNonRapprochees } = mapping.rapprocherZones(enregistrements, stations, alias);

  const retenus = enregistrements.filter(e => associations.has(e.zdcId));
  const resume = {
    dryRun,
    recus: bruts.length,
    ignores,
    ascenseurs_valides: enregistrements.length,
    zones: new Set(enregistrements.map(e => e.zdcId)).size,
    stations_rapprochees: [...associations.entries()].map(([zdcId, s]) => ({
      station: s.nom_station,
      zdcId,
      ascenseurs: retenus.filter(e => e.zdcId === zdcId).length
    })),
    stations_sans_donnees: stations
      .filter(s => ![...associations.values()].some(a => a.id_station === s.id_station))
      .map(s => s.nom_station),
    suggestions_alias: mapping.suggestions(zonesNonRapprochees, stations),
    inseres: 0,
    mis_a_jour: 0,
    passes_inconnu: 0,
    demo_supprimes: 0
  };

  if (dryRun || retenus.length === 0) return resume;

  await transaction(async client => {
    const idsStations = [...new Set([...associations.values()].map(s => s.id_station))];

    // 1. Mémoriser la zone IDFM sur la station (clé de rapprochement stable).
    for (const [zdcId, station] of associations) {
      if (!station.ref_zdc) {
        await client.query('UPDATE station SET ref_zdc = $1 WHERE id_station = $2 AND ref_zdc IS NULL', [zdcId, station.id_station]);
      }
    }

    // 2. Upsert des ascenseurs (clé = ref_externe = liftId).
    for (const e of retenus) {
      const { rows } = await client.query(
        `INSERT INTO ascenseur (statut, cause_panne, date_maj, ref_externe, libelle, id_station)
         VALUES ($1, $2, COALESCE($3::timestamptz, now()), $4, $5, $6)
         ON CONFLICT (ref_externe) DO UPDATE
           SET statut = EXCLUDED.statut,
               cause_panne = EXCLUDED.cause_panne,
               date_maj = COALESCE($3::timestamptz, ascenseur.date_maj),
               libelle = EXCLUDED.libelle,
               id_station = EXCLUDED.id_station
         RETURNING (xmax = 0) AS insere`,
        [e.statut, e.cause_panne, e.date_maj, e.ref_externe, e.libelle, associations.get(e.zdcId).id_station]
      );
      if (rows[0].insere) resume.inseres++; else resume.mis_a_jour++;
    }

    // 3. Ascenseurs connus de ces stations mais absents du flux → « inconnu ».
    const refs = retenus.map(e => e.ref_externe);
    const absent = await client.query(
      `UPDATE ascenseur SET statut = 'inconnu', cause_panne = NULL
        WHERE id_station = ANY($1::int[])
          AND ref_externe IS NOT NULL AND ref_externe NOT LIKE 'DEMO-%'
          AND NOT (ref_externe = ANY($2::text[]))
          AND statut <> 'inconnu'`,
      [idsStations, refs]
    );
    resume.passes_inconnu = absent.rowCount;

    // 4. Les ascenseurs de démonstration des stations désormais couvertes par de vraies données disparaissent.
    const demo = await client.query(
      `DELETE FROM ascenseur WHERE ref_externe LIKE 'DEMO-%' AND ($1::boolean OR id_station = ANY($2::int[]))`,
      [purgerDemo, idsStations]
    );
    resume.demo_supprimes = demo.rowCount;
  });

  return resume;
}

module.exports = { synchroniser, chargerAlias };
