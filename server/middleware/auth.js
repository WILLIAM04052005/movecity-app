// Vérifie que l'utilisateur est connecté avant d'accéder à une route protégée
// (ex : /api/favoris). Utilise la session Express, pas de token JWT nécessaire
// pour un MVP de cette taille.
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Non authentifié. Connectez-vous pour continuer.' });
  }
  next();
}

module.exports = { requireAuth };
