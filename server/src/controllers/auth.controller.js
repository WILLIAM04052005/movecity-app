const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const operateurs = require('../models/operateurs.model');
const audit = require('../models/audit.model');
const { HttpError, asyncHandler } = require('../utils/http');

// Hash factice : on compare toujours un mot de passe, même si l'e-mail n'existe pas,
// pour que le temps de réponse ne révèle pas quels comptes existent.
const HASH_FACTICE = bcrypt.hashSync('mot-de-passe-factice', 12);

/** POST /api/auth/login → { token, operateur } */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const operateur = await operateurs.trouverParEmail(email);

  const valide = await bcrypt.compare(password, operateur ? operateur.password_hash : HASH_FACTICE);

  // Compte verrouillé : même réponse qu'un mauvais mot de passe (on ne révèle pas que le compte existe),
  // et même un mot de passe correct est refusé tant que le verrouillage dure.
  const verrouille = Boolean(operateur && operateur.verrouille_jusqua && new Date(operateur.verrouille_jusqua) > new Date());

  if (!operateur || !valide || verrouille) {
    if (operateur && !verrouille) {
      const { maxEchecsConnexion, verrouillageMinutes } = config.securite;
      const vientDEtreVerrouille = await operateurs.enregistrerEchec(operateur.id_operateur, maxEchecsConnexion, verrouillageMinutes);
      await audit.ecrire({
        operateur: { id: operateur.id_operateur, email: operateur.email },
        action: vientDEtreVerrouille ? 'compte_verrouille' : 'connexion_echec'
      });
    }
    throw new HttpError(401, 'Identifiants incorrects.');
  }

  await operateurs.reinitialiserEchecs(operateur.id_operateur);
  await audit.ecrire({ operateur: { id: operateur.id_operateur, email: operateur.email }, action: 'connexion' });

  const token = jwt.sign({ email: operateur.email }, config.jwt.secret, {
    subject: String(operateur.id_operateur),
    expiresIn: config.jwt.expiresIn,
    algorithm: 'HS256'
  });

  res.json({
    token,
    token_type: 'Bearer',
    expires_in: config.jwt.expiresIn,
    operateur: { id_operateur: operateur.id_operateur, email: operateur.email }
  });
});

/** GET /api/auth/me → l'opérateur du jeton */
exports.moi = asyncHandler(async (req, res) => {
  res.json(await operateurs.trouverParId(req.operateur.id));
});
