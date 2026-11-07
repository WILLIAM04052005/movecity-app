// Application Express (sans écoute réseau : facilite les tests).

const express = require('express');
const path = require('path');
const fs = require('fs');

const config = require('./config/env');
const routes = require('./routes');
const { entetesSecurite } = require('./middleware/securite');
const { routeIntrouvable, gestionErreurs } = require('./middleware/erreurs');

const app = express();

app.disable('x-powered-by');
if (config.trustProxy) app.set('trust proxy', 1); // derrière un hébergeur : vraie IP du client
app.use(entetesSecurite);
app.use(express.json({ limit: '10kb' }));

// --- API ---
app.use('/api', routes);
app.use('/api', routeIntrouvable);

// --- Front React (build de production : client/dist) ---
const dossierFront = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(dossierFront)) {
  app.use(express.static(dossierFront));
  app.get('*', (req, res) => res.sendFile(path.join(dossierFront, 'index.html')));
} else {
  app.get('/', (req, res) => {
    res.type('text').send(
      'API Movecity active. Front non construit : "npm run build" (production) ou "npm run dev" (http://localhost:5173).'
    );
  });
}

app.use(gestionErreurs);

module.exports = app;
