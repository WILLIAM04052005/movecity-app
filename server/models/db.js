// node:sqlite est intégré à Node.js (v22.5+) : aucune compilation native
// n'est nécessaire, contrairement à better-sqlite3 qui demande Visual Studio
// Build Tools sous Windows. L'avertissement "experimental" affiché au
// démarrage est normal et sans impact pour notre usage.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, '..', '..', 'movecity.db'));

// --- Table des utilisateurs ---
// Le mot de passe est stocké hashé (jamais en clair), voir server/routes/auth.js
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// --- Table des trajets favoris ---
// Donnée sensible potentielle (peut révéler domicile, lieu de soin...) :
// à traiter dans le threat model / politique de confidentialité (filière Cyber).
db.exec(`
  CREATE TABLE IF NOT EXISTS trajets_favoris (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    nom TEXT NOT NULL,
    station_depart TEXT NOT NULL,
    station_arrivee TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

module.exports = db;
