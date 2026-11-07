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

module.exports = { trouverParEmail, trouverParId, creer };
