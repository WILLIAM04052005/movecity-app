const jwt = require('jsonwebtoken');
const config = require('../config/env');
const operateurs = require('../models/operateurs.model');
const { HttpError, asyncHandler } = require('../utils/http');

/**
 * Protège une route : exige l'en-tête « Authorization: Bearer <jeton> » d'un
 * opérateur existant. Les citoyens (borne anonyme) n'en ont jamais besoin.
 */
const exigerOperateur = asyncHandler(async (req, res, next) => {
  const [type, jeton] = (req.headers.authorization || '').split(' ');
  if (type !== 'Bearer' || !jeton) throw new HttpError(401, 'Authentification requise.');

  let charge;
  try {
    charge = jwt.verify(jeton, config.jwt.secret, { algorithms: ['HS256'] });
  } catch {
    throw new HttpError(401, 'Jeton invalide ou expiré.');
  }

  // Un compte supprimé perd immédiatement l'accès, même avec un jeton encore valide.
  const operateur = await operateurs.trouverParId(Number(charge.sub));
  if (!operateur) throw new HttpError(401, 'Compte opérateur introuvable.');

  req.operateur = { id: operateur.id_operateur, email: operateur.email };
  next();
});

module.exports = { exigerOperateur };
