const { query } = require('../config/database');

async function trouverParEmail(email) {
  const { rows } = await query('SELECT * FROM operateur WHERE lower(email) = lower($1)', [email]);
  return rows[0] || null;
}

async function trouverParId(id) {
  const { rows } = await query(
    'SELECT id_operateur, email, date_creation FROM operateur WHERE id_operateur = $1',
    [id]
  );
  return rows[0] || null;
}

async function creer(email, passwordHash) {
  const { rows } = await query(
    `INSERT INTO operateur (email, password_hash) VALUES ($1, $2)
     RETURNING id_operateur, email, date_creation`,
    [email.toLowerCase(), passwordHash]
  );
  return rows[0];
}

/** Compte un échec ; au N-ième échec consécutif, verrouille le compte puis remet le compteur à 0. */
async function enregistrerEchec(id, maxEchecs, minutes) {
  const { rows } = await query(
    `UPDATE operateur SET
       echecs_connexion  = CASE WHEN echecs_connexion + 1 >= $2 THEN 0 ELSE echecs_connexion + 1 END,
       verrouille_jusqua = CASE WHEN echecs_connexion + 1 >= $2
                                THEN now() + make_interval(mins => $3) ELSE verrouille_jusqua END
     WHERE id_operateur = $1
     RETURNING (verrouille_jusqua > now()) AS verrouille`,
    [id, maxEchecs, minutes]
  );
  return Boolean(rows[0] && rows[0].verrouille);
}

async function reinitialiserEchecs(id) {
  await query('UPDATE operateur SET echecs_connexion = 0, verrouille_jusqua = NULL WHERE id_operateur = $1', [id]);
}

module.exports = { trouverParEmail, trouverParId, creer, enregistrerEchec, reinitialiserEchecs };
