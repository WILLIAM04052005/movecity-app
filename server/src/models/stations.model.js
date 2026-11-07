const { query, transaction } = require('../config/database');
const { HttpError } = require('../utils/http');
const { ORDRE_LIGNES } = require('./lignes.model');

// Station + codes de ses lignes (tableau) + état agrégé de ses ascenseurs
const selectStations = (colonnesEnPlus = '') => `
  SELECT s.id_station, s.nom_station, s.latitude, s.longitude,
         COALESCE(array_agg(l.code_ligne ORDER BY ${ORDRE_LIGNES})
                  FILTER (WHERE l.id_ligne IS NOT NULL), ARRAY[]::text[]) AS lignes,
         e.statut_ascenseur${colonnesEnPlus}
    FROM station s
    LEFT JOIN station_ligne sl ON sl.id_station = s.id_station
    LEFT JOIN ligne l          ON l.id_ligne = sl.id_ligne
    LEFT JOIN v_etat_station e ON e.id_station = s.id_station`;

const GROUP_BY = 'GROUP BY s.id_station, e.statut_ascenseur';

// Distance en km (formule de Haversine) entre la station et le point ($1 = lat, $2 = lon)
const DISTANCE_KM = `
  6371 * 2 * asin(LEAST(1, sqrt(
    power(sin(radians(s.latitude  - $1::float8) / 2), 2) +
    cos(radians($1::float8)) * cos(radians(s.latitude)) *
    power(sin(radians(s.longitude - $2::float8) / 2), 2)
  )))`;

async function lister() {
  const { rows } = await query(`${selectStations()} ${GROUP_BY} ORDER BY s.nom_station`);
  return rows;
}

async function trouver(id) {
  const { rows } = await query(`${selectStations()} WHERE s.id_station = $1 ${GROUP_BY}`, [id]);
  return rows[0] || null;
}

/** Les `limite` stations les plus proches d'un point, avec leur distance. */
async function plusProches(latitude, longitude, limite) {
  const { rows } = await query(
    `${selectStations(`, ${DISTANCE_KM} AS distance_km`)}
     ${GROUP_BY} ORDER BY distance_km LIMIT $3`,
    [latitude, longitude, limite]
  );
  return rows;
}

/** Remplace les lignes d'une station (dans la transaction en cours). */
async function remplacerLignes(client, idStation, codes) {
  const uniques = [...new Set(codes)];
  await client.query('DELETE FROM station_ligne WHERE id_station = $1', [idStation]);
  if (uniques.length === 0) return;

  const { rowCount } = await client.query(
    `INSERT INTO station_ligne (id_station, id_ligne)
     SELECT $1, id_ligne FROM ligne WHERE code_ligne = ANY($2::text[])`,
    [idStation, uniques]
  );
  if (rowCount !== uniques.length) {
    const { rows } = await client.query('SELECT code_ligne FROM ligne WHERE code_ligne = ANY($1::text[])', [uniques]);
    const connus = new Set(rows.map(r => r.code_ligne));
    throw new HttpError(400, 'Ligne(s) inconnue(s).', uniques.filter(c => !connus.has(c)).map(c => ({ champ: 'lignes', message: c })));
  }
}

async function creer({ nom_station, latitude, longitude, lignes = [] }) {
  const id = await transaction(async client => {
    const { rows } = await client.query(
      'INSERT INTO station (nom_station, latitude, longitude) VALUES ($1, $2, $3) RETURNING id_station',
      [nom_station, latitude, longitude]
    );
    await remplacerLignes(client, rows[0].id_station, lignes);
    return rows[0].id_station;
  });
  return trouver(id);
}

async function modifier(id, { lignes, ...champs }) {
  const trouve = await transaction(async client => {
    // Les noms de colonnes viennent du schéma zod (liste blanche), jamais du client brut.
    const noms = Object.keys(champs);
    if (noms.length > 0) {
      const set = noms.map((n, i) => `${n} = $${i + 2}`).join(', ');
      const { rowCount } = await client.query(`UPDATE station SET ${set} WHERE id_station = $1`, [id, ...Object.values(champs)]);
      if (rowCount === 0) return false;
    } else {
      const { rowCount } = await client.query('SELECT 1 FROM station WHERE id_station = $1', [id]);
      if (rowCount === 0) return false;
    }
    if (lignes) await remplacerLignes(client, id, lignes);
    return true;
  });
  return trouve ? trouver(id) : null;
}

async function supprimer(id) {
  const { rowCount } = await query('DELETE FROM station WHERE id_station = $1', [id]);
  return rowCount > 0;
}

module.exports = { lister, trouver, plusProches, creer, modifier, supprimer };
