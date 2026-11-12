const { query } = require('../config/database');

/** Écrit une ligne d'audit. Ne doit jamais faire échouer l'action métier : l'erreur est seulement journalisée. */
async function ecrire({ operateur, action, cible = null, idCible = null, detail = null }) {
  try {
    await query(
      `INSERT INTO journal_audit (id_operateur, email_operateur, action, cible, id_cible, detail)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [operateur?.id ?? null, operateur?.email ?? null, action, cible, idCible, detail ? JSON.stringify(detail) : null]
    );
  } catch (err) {
    console.error('Audit : écriture impossible :', err.message);
  }
}

async function lister(limite = 100) {
  const { rows } = await query(
    `SELECT id_audit, date_action, email_operateur, action, cible, id_cible, detail
     FROM journal_audit ORDER BY date_action DESC, id_audit DESC LIMIT $1`,
    [limite]
  );
  return rows;
}

module.exports = { ecrire, lister };
