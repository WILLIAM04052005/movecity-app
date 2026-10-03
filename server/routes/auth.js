const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../models/db');

const router = express.Router();

// --- Inscription ---
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
  }

  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Un compte existe déjà avec cet email.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = db.prepare(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)'
    ).run(email, passwordHash);

    req.session.userId = result.lastInsertRowid;
    res.status(201).json({ id: result.lastInsertRowid, email });
  } catch (err) {
    console.error('Erreur inscription :', err);
    res.status(500).json({ error: 'Erreur serveur, réessayez plus tard.' });
  }
});

// --- Connexion ---
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    req.session.userId = user.id;
    res.json({ id: user.id, email: user.email });
  } catch (err) {
    console.error('Erreur connexion :', err);
    res.status(500).json({ error: 'Erreur serveur, réessayez plus tard.' });
  }
});

// --- Déconnexion ---
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Déconnecté.' });
  });
});

// --- Vérifier la session actuelle (utile pour le front au chargement) ---
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Non connecté.' });
  }
  res.json({ id: req.session.userId });
});

module.exports = router;
