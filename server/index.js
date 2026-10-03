require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const favorisRoutes = require('./routes/favoris');
const ascenseursRoutes = require('./routes/ascenseurs');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares de base ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-a-changer-en-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 // 24h
  }
}));

// --- Fichiers statiques (front vanilla) ---
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Routes API ---
app.use('/api/auth', authRoutes);
app.use('/api/favoris', requireAuth, favorisRoutes);
app.use('/api/ascenseurs', ascenseursRoutes);

// --- Route de santé (utile pour vérifier le déploiement) ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Movecity app démarrée sur http://localhost:${PORT}`);
});
