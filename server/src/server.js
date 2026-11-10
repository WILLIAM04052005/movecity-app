// Point d'entrée : vérifie PostgreSQL, démarre l'écoute, gère l'arrêt propre.

const config = require('./config/env');
const { pool } = require('./config/database');
const app = require('./app');
const purgeJournal = require('./jobs/purgeJournal');
const syncAscenseurs = require('./jobs/syncAscenseurs');

async function demarrer() {
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    console.error(
      `Impossible de se connecter à PostgreSQL (${config.db.url ? 'DATABASE_URL' : `${config.db.host}:${config.db.port}/${config.db.database}`}) : ${err.message}\n` +
        '→ Vérifiez que PostgreSQL tourne et que DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME sont corrects dans .env.\n' +
        '→ Première utilisation : "npm run db:migrate" puis "npm run db:seed".'
    );
    process.exit(1);
  }

  const serveur = app.listen(config.port, () => {
    console.log(`Movecity (API) démarrée sur http://localhost:${config.port}  [${config.env}]`);
  });
  purgeJournal.demarrer();
  syncAscenseurs.demarrer();

  const arreter = () => {
    console.log('Arrêt en cours…');
    serveur.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGINT', arreter);
  process.on('SIGTERM', arreter);
}

demarrer();
