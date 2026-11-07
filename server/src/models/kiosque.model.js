const { query } = require('../config/database');
const { ORDRE_LIGNES } = require('./lignes.model');

/** Identité de la borne : position réelle, station d'implantation, lignes affichées. */
async function configuration(idKiosque) {
  const { rows } = await query(
    `SELECT k.id_kiosque, k.nom_emplacement, k.latitude, k.longitude, s.id_station, s.nom_station
       FROM kiosque k JOIN station s ON s.id_station = k.id_station
      WHERE k.id_kiosque = $1`,
    [idKiosque]
  );
  const k = rows[0];
  if (!k) return null;

  const lignes = await query(
    `SELECT l.id_ligne, l.code_ligne, l.type_ligne
       FROM kiosque_ligne kl JOIN ligne l ON l.id_ligne = kl.id_ligne
      WHERE kl.id_kiosque = $1
      ORDER BY ${ORDRE_LIGNES}`,
    [idKiosque]
  );

  return {
    id_kiosque: k.id_kiosque,
    nom_emplacement: k.nom_emplacement,
    latitude: k.latitude,
    longitude: k.longitude,
    station: { id_station: k.id_station, nom_station: k.nom_station },
    lignes: lignes.rows
  };
}

module.exports = { configuration };
