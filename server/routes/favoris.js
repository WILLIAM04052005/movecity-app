const express = require('express');
const db = require('../models/db');

const router = express.Router();
// Toutes les routes ici sont déjà protégées par requireAuth (voir server/index.js)

// --- Lister les trajets favoris de l'utilisateur connecté ---
router.get('/', (req, res) => {
  const trajets = db.prepare(
    'SELECT * FROM trajets_favoris WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.session.userId);
  res.json(trajets);
});

// --- Enregistrer un nouveau trajet favori ---
router.post('/', (req, res) => {
  const { nom, station_depart, station_arrivee } = req.body;

  if (!nom || !station_depart || !station_arrivee) {
    return res.status(400).json({ error: 'Nom, station de départ et station d\'arrivée requis.' });
  }

  const result = db.prepare(
    'INSERT INTO trajets_favoris (user_id, nom, station_depart, station_arrivee) VALUES (?, ?, ?, ?)'
  ).run(req.session.userId, nom, station_depart, station_arrivee);

  res.status(201).json({
    id: result.lastInsertRowid,
    nom, station_depart, station_arrivee
  });
});

// --- Supprimer un trajet favori ---
router.delete('/:id', (req, res) => {
  const result = db.prepare(
    'DELETE FROM trajets_favoris WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.session.userId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Trajet introuvable.' });
  }
  res.json({ message: 'Trajet supprimé.' });
});

module.exports = router;
