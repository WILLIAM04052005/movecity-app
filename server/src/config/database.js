// ============================================================
// Connexion PostgreSQL : un pool de connexions partagé par toute l'application.
// ============================================================
const { Pool } = require('pg');
const config = require('./env');

const options = config.db.url
  ? { connectionString: config.db.url }
  : {
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database
    };

const pool = new Pool({
  ...options,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

pool.on('error', err => {
  console.error('Erreur inattendue sur une connexion PostgreSQL inactive :', err.message);
});

/** Requête paramétrée (jamais de concaténation de valeurs dans le SQL). */
const query = (texte, valeurs) => pool.query(texte, valeurs);

/** Exécute `travail(client)` dans une transaction : COMMIT si OK, ROLLBACK sinon. */
async function transaction(travail) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultat = await travail(client);
    await client.query('COMMIT');
    return resultat;
  } catch (erreur) {
    await client.query('ROLLBACK');
    throw erreur;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, transaction };
