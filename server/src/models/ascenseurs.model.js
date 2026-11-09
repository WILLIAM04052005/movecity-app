const { query } = require('../config/database');

const COLONNES = `a.id_ascenseur, a.statut, a.cause_panne, a.date_maj, a.ref_externe, a.libelle,
                  s.id_station, s.nom_station, s.latitude, s.longitude`;
const DEPUIS = 'FROM ascenseur a JOIN station s ON s.id_station = a.id_station';

async function lister({ statut, id_station } = {}) {
  const conditions = [];
  const valeurs = [];
  if (statut) { valeurs.push(statut); conditions.push(`a.statut = $${valeurs.length}`); }
  if (id_station) { valeurs.push(id_station); conditions.push(`a.id_station = $${valeurs.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(`SELECT ${COLONNES} ${DEPUIS} ${where} ORDER BY s.nom_station, a.id_ascenseur`, valeurs);
  return rows;
}

async function trouver(id) {
  const { rows } = await query(`SELECT ${COLONNES} ${DEPUIS} WHERE a.id_ascenseur = $1`, [id]);
  return rows[0] || null;
}

async function creer({ statut, cause_panne, id_station, ref_externe }) {
  const { rows } = await query(
    `INSERT INTO ascenseur (statut, cause_panne, id_station, ref_externe)
     VALUES ($1, $2, $3, $4) RETURNING id_ascenseur`,
    [statut, cause_panne ?? null, id_station, ref_externe ?? null]
  );
  return trouver(rows[0].id_ascenseur);
}

/** Met à jour statut / cause et rafraîchit date_maj (la donnée vient d'être confirmée). */
async function modifier(id, champs) {
  // Noms de colonnes issus du schéma zod (liste blanche), jamais du client brut.
  const noms = Object.keys(champs);
  const set = noms.map((n, i) => `${n} = $${i + 2}`).join(', ');
  const { rowCount } = await query(
    `UPDATE ascenseur SET ${set}, date_maj = now() WHERE id_ascenseur = $1`,
    [id, ...Object.values(champs)]
  );
  return rowCount > 0 ? trouver(id) : null;
}

async function supprimer(id) {
  const { rowCount } = await query('DELETE FROM ascenseur WHERE id_ascenseur = $1', [id]);
  return rowCount > 0;
}

/**
 * Chiffres du tableau de bord « accessibilité » (vue affichée sur la borne) :
 *  - taux d'ascenseurs en panne ;
 *  - pannes par ligne (une panne compte pour chaque ligne qui dessert la station) ;
 *  - stations les moins accessibles.
 */
async function statistiques(limiteStations) {
  const [global, parLigne, moinsAccessibles] = await Promise.all([
    query(`SELECT count(*)::int AS total,
                  (count(*) FILTER (WHERE statut = 'disponible'))::int AS disponibles,
                  (count(*) FILTER (WHERE statut = 'en_panne'))::int   AS en_panne,
                  (count(*) FILTER (WHERE statut = 'inconnu'))::int    AS inconnus,
                  max(date_maj) AS derniere_maj
             FROM ascenseur`),
    query(`SELECT l.code_ligne, l.type_ligne,
                  count(a.id_ascenseur)::int AS total,
                  (count(a.id_ascenseur) FILTER (WHERE a.statut = 'en_panne'))::int AS en_panne
             FROM ligne l
             LEFT JOIN station_ligne sl ON sl.id_ligne = l.id_ligne
             LEFT JOIN ascenseur a      ON a.id_station = sl.id_station
            GROUP BY l.id_ligne
            ORDER BY en_panne DESC, l.type_ligne, l.code_ligne`),
    query(`SELECT e.id_station, s.nom_station, e.statut_ascenseur AS statut,
                  e.nb_ascenseurs, e.nb_en_panne, e.nb_inconnus, e.date_maj_min AS date_maj
             FROM v_etat_station e JOIN station s ON s.id_station = e.id_station
            WHERE e.nb_en_panne + e.nb_inconnus > 0 OR e.nb_ascenseurs = 0
            ORDER BY e.nb_en_panne DESC, e.nb_inconnus DESC, s.nom_station
            LIMIT $1`, [limiteStations])
  ]);

  const g = global.rows[0];
  return {
    total: g.total,
    disponibles: g.disponibles,
    en_panne: g.en_panne,
    inconnus: g.inconnus,
    taux_panne_pct: g.total > 0 ? Math.round((g.en_panne / g.total) * 1000) / 10 : 0,
    derniere_maj: g.derniere_maj,
    pannes_par_ligne: parLigne.rows,
    stations_moins_accessibles: moinsAccessibles.rows
  };
}

module.exports = { lister, trouver, creer, modifier, supprimer, statistiques };
