const { HttpError } = require('../utils/http');

/** Route /api inconnue → JSON propre (et non la page HTML du front). */
function routeIntrouvable(req, res, next) {
  next(new HttpError(404, 'Route introuvable.'));
}

// Codes d'erreur PostgreSQL les plus courants → réponse HTTP claire
const ERREURS_PG = {
  '23505': [409, 'Cette valeur existe déjà.'],
  '23503': [409, 'Opération impossible : référence invalide ou élément encore utilisé.'],
  '23001': [409, 'Opération impossible : référence invalide ou élément encore utilisé.'],
  '23514': [400, 'Valeur refusée par une règle de la base de données.'],
  '23502': [400, 'Un champ obligatoire est manquant.'],
  '22P02': [400, 'Format de donnée invalide.'],
  '22003': [400, 'Valeur numérique hors limites.']
};

// eslint-disable-next-line no-unused-vars
function gestionErreurs(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details && { details: err.details }) });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Corps de requête JSON invalide.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Requête trop volumineuse.' });
  }
  if (err.code && ERREURS_PG[err.code]) {
    const [status, message] = ERREURS_PG[err.code];
    return res.status(status).json({ error: message });
  }

  // Erreur inattendue : on journalise le détail côté serveur, jamais côté client.
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
}

module.exports = { routeIntrouvable, gestionErreurs };
