const { query } = require('../config/database');

// Ordre naturel d'affichage : Métro avant RER, puis M1, M4, M7, M11, M14 (numérique)
const ORDRE_LIGNES = `l.type_ligne, NULLIF(regexp_replace(l.code_ligne, '\\D', '', 'g'), '')::int, l.code_ligne`;

async function lister() {
  const { rows } = await query(
    `SELECT l.id_ligne, l.code_ligne, l.type_ligne FROM ligne l ORDER BY ${ORDRE_LIGNES}`
  );
  return rows;
}

module.exports = { ORDRE_LIGNES, lister };
