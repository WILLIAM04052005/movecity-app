// Gestion de la base :  node server/scripts/db.js <migrate|seed|reset|demo>
//   migrate : crée les tables
//   seed    : recharge les données de référence + crée l'opérateur (ADMIN_EMAIL / ADMIN_PASSWORD)
//   reset   : SUPPRIME tout puis migrate + seed  (développement uniquement)
//   demo    : remplit le journal avec 600 recherches FICTIVES (pour le dashboard)

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('../src/config/env');
const { pool } = require('../src/config/database');
const operateurs = require('../src/models/operateurs.model');

const sql = nom => fs.readFileSync(path.join(__dirname, '..', 'db', nom), 'utf8');

async function migrate() {
  await pool.query(sql('schema.sql'));
  console.log('✔ Schéma créé / à jour.');
}

async function creerAdmin() {
  const { email, password } = config.admin;
  if (!email || !password) return console.log('• Aucun opérateur créé (ADMIN_EMAIL / ADMIN_PASSWORD absents).');
  if (await operateurs.trouverParEmail(email)) return console.log(`• Opérateur ${email} déjà présent.`);
  await operateurs.creer(email, await bcrypt.hash(password, 12));
  console.log(`✔ Opérateur créé : ${email}`);
}

async function seed() {
  await pool.query(sql('seed.sql'));
  console.log('✔ Données de référence chargées (Châtelet - Les Halles).');
  await creerAdmin();
}

async function reset() {
  if (config.estProduction) throw new Error('db:reset est interdit en production.');
  await pool.query(`DROP VIEW IF EXISTS v_etat_station;
    DROP TABLE IF EXISTS journal_audit, journal_recherche, kiosque_ligne, kiosque, ascenseur, station_ligne, ligne, station, operateur CASCADE;`);
  console.log('✔ Tables supprimées.');
  await migrate();
  await seed();
}

async function demo() {
  await pool.query(sql('seed_demo_journal.sql'));
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM journal_recherche');
  console.log(`✔ Journal de démonstration : ${rows[0].n} recherches fictives.`);
}

const commandes = { migrate, seed, reset, demo };
module.exports = commandes; // réutilisé par les tests

// Exécution en ligne de commande uniquement (pas quand le fichier est importé)
if (require.main === module) {
  const commande = process.argv[2];
  if (!commandes[commande]) {
    console.error('Usage : node server/scripts/db.js <migrate|seed|reset|demo>');
    process.exit(1);
  }
  commandes[commande]()
    .catch(err => {
      console.error('✘', err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

