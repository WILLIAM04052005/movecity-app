// Configuration centralisée : lit le fichier .env à la racine du projet,

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const env = process.env;
const NODE_ENV = env.NODE_ENV || 'development';
const estTest = NODE_ENV === 'test';
const estProduction = NODE_ENV === 'production';

function entier(nom, defaut) {
  const brut = env[nom];
  if (brut === undefined || brut === '') return defaut;
  const n = Number(brut);
  if (!Number.isInteger(n)) {
    console.error(`Configuration invalide : ${nom} doit être un nombre entier (reçu "${brut}").`);
    process.exit(1);
  }
  return n;
}

// En test, on utilise TOUJOURS une base dédiée : les tests la vident.
const nomBase = estTest ? env.DB_NAME_TEST || `${env.DB_NAME}_test` : env.DB_NAME;

const config = {
  env: NODE_ENV,
  estTest,
  estProduction,
  port: entier('PORT', 3000),
  kioskId: entier('KIOSK_ID', 1),
  trustProxy: env.TRUST_PROXY === 'true',

  db: {
    url: env.DATABASE_URL || null,
    host: env.DB_HOST || 'localhost',
    port: entier('DB_PORT', 5432),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: nomBase,
    ssl: env.DB_SSL === 'true'
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN || '2h'
  },

  admin: {
    email: (env.ADMIN_EMAIL || '').trim().toLowerCase(),
    password: env.ADMIN_PASSWORD || ''
  },

  retentionJournalJours: entier('RETENTION_JOURNAL_JOURS', 90),
  idfm: {
    url: env.IDFM_URL || 'https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/etat-des-ascenseurs/records',
    fichier: env.IDFM_FILE || null,
    syncActive: env.IDFM_SYNC_ACTIVE === 'true',
    // Le flux n'est mis à jour qu'environ 3 fois par jour : inutile d'interroger plus souvent.
    intervalleMinutes: Math.max(30, entier('IDFM_SYNC_INTERVALLE_MIN', 180))
  },
  banUrl: 'https://api-adresse.data.gouv.fr/search/',

  limites: {
    geocodeParMinute: entier('LIMITE_GEOCODE_PAR_MINUTE', 30),
    loginParQuinzeMinutes: estTest ? 1000 : entier('LIMITE_LOGIN_PAR_15MIN', 10)
  }
};

// --- Validation : on échoue tôt, avec un message lisible ---
const manquants = [];
if (!config.db.url) {
  if (!config.db.user) manquants.push('DB_USER');
  if (config.db.password === undefined) manquants.push('DB_PASSWORD');
  if (!env.DB_NAME) manquants.push('DB_NAME');
}
if (!config.jwt.secret) manquants.push('JWT_SECRET');

if (manquants.length > 0) {
  console.error(
    `Configuration incomplète : variable(s) manquante(s) dans .env → ${manquants.join(', ')}\n` +
      'Copiez .env.example en .env puis renseignez ces valeurs.'
  );
  process.exit(1);
}

const secretFaible = config.jwt.secret.length < 32 || config.jwt.secret.startsWith('remplacez-par');
if (estProduction && secretFaible) {
  console.error('JWT_SECRET trop faible pour la production (32 caractères aléatoires minimum).');
  process.exit(1);
}
if (!estProduction && !estTest && secretFaible) {
  console.warn('⚠  JWT_SECRET faible : acceptable en développement, interdit en production.');
}

module.exports = config;
