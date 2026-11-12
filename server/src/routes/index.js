// Table des routes de l'API (préfixe /api). Chaque ligne = un endpoint :
//   route → [middleware : limite / validation / authentification] → contrôleur

const express = require('express');
const config = require('../config/env');
const schemas = require('../schemas');
const { valider } = require('../middleware/validate');
const { exigerOperateur } = require('../middleware/auth');
const { limiteDebit } = require('../middleware/securite');

const health = require('../controllers/health.controller');
const kiosque = require('../controllers/kiosque.controller');
const lignes = require('../controllers/lignes.controller');
const stations = require('../controllers/stations.controller');
const ascenseurs = require('../controllers/ascenseurs.controller');
const geocode = require('../controllers/geocode.controller');
const auth = require('../controllers/auth.controller');
const stats = require('../controllers/stats.controller');
const auditCtrl = require('../controllers/audit.controller');
const itineraire = require('../controllers/itineraire.controller');

const router = express.Router();
const idParam = valider(schemas.params.id, 'params');

// --- Santé ---
router.get('/health', health.etat);

// --- Borne (public, anonyme) ---
router.get('/kiosk/config', kiosque.configuration);

// --- Lignes ---
router.get('/lignes', lignes.lister);

// --- Stations ---
router.get('/stations', stations.lister);
router.get('/stations/nearest', valider(schemas.stations.proches, 'query'), stations.proches);
router.get('/stations/:id', idParam, stations.detail);
router.post('/stations', exigerOperateur, valider(schemas.stations.creer), stations.creer);
router.put('/stations/:id', exigerOperateur, idParam, valider(schemas.stations.modifier), stations.modifier);
router.delete('/stations/:id', exigerOperateur, idParam, stations.supprimer);

// --- Ascenseurs ---
router.get('/ascenseurs', valider(schemas.ascenseurs.lister, 'query'), ascenseurs.lister);
router.get('/ascenseurs/stats', valider(schemas.ascenseurs.stats, 'query'), ascenseurs.statistiques);
router.get('/ascenseurs/:id', idParam, ascenseurs.detail);
router.post('/ascenseurs', exigerOperateur, valider(schemas.ascenseurs.creer), ascenseurs.creer);
router.patch('/ascenseurs/:id', exigerOperateur, idParam, valider(schemas.ascenseurs.modifier), ascenseurs.modifier);
router.delete('/ascenseurs/:id', exigerOperateur, idParam, ascenseurs.supprimer);

// --- Recherche d'adresse (service externe → débit limité) ---
router.get(
  '/geocode',
  limiteDebit({ fenetreMs: 60_000, max: config.limites.geocodeParMinute }),
  valider(schemas.geocode, 'query'),
  geocode.rechercher
);

router.get(
  '/itineraire',
  limiteDebit({ fenetreMs: 60_000, max: config.limites.itineraireParMinute }),
  valider(schemas.itineraire, 'query'),
  itineraire.calculer
);

// --- Authentification opérateur (tentatives limitées contre le brute-force) ---
router.post(
  '/auth/login',
  limiteDebit({ fenetreMs: 15 * 60_000, max: config.limites.loginParQuinzeMinutes }),
  valider(schemas.auth.login),
  auth.login
);
router.get('/auth/me', exigerOperateur, auth.moi);

// --- Statistiques d'usage (opérateur) ---
router.get('/stats/usage', exigerOperateur, valider(schemas.stats.usage, 'query'), stats.usage);

// --- Journal d'audit (opérateur) ---
router.get('/audit', exigerOperateur, valider(schemas.audit.lister, 'query'), auditCtrl.lister);

module.exports = router;
