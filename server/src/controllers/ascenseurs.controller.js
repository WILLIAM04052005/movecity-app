const ascenseurs = require('../models/ascenseurs.model');
const audit = require('../models/audit.model');
const { HttpError, asyncHandler } = require('../utils/http');

/** GET /api/ascenseurs?statut=&id_station= */
exports.lister = asyncHandler(async (req, res) => {
  res.json(await ascenseurs.lister(req.query));
});

/** GET /api/ascenseurs/stats?limite= : vue « accessibilité » de la borne */
exports.statistiques = asyncHandler(async (req, res) => {
  res.json(await ascenseurs.statistiques(req.query.limite));
});

/** GET /api/ascenseurs/:id */
exports.detail = asyncHandler(async (req, res) => {
  const a = await ascenseurs.trouver(req.params.id);
  if (!a) throw new HttpError(404, 'Ascenseur introuvable.');
  res.json(a);
});

/** POST /api/ascenseurs (opérateur) */
exports.creer = asyncHandler(async (req, res) => {
  const donnees = { ...req.body };
  if (donnees.statut !== 'en_panne') donnees.cause_panne = null; // règle de gestion
  const a = await ascenseurs.creer(donnees);
  await audit.ecrire({ operateur: req.operateur, action: 'ascenseur_cree', cible: 'ascenseur', idCible: a.id_ascenseur, detail: { statut: a.statut } });
  res.status(201).json(a);
});

/** PATCH /api/ascenseurs/:id (opérateur) : nouveau statut / cause de panne */
exports.modifier = asyncHandler(async (req, res) => {
  const champs = { ...req.body };
  // Un ascenseur qui n'est plus « en panne » n'a plus de cause de panne.
  if (champs.statut && champs.statut !== 'en_panne') champs.cause_panne = null;

  const a = await ascenseurs.modifier(req.params.id, champs);
  if (!a) throw new HttpError(404, 'Ascenseur introuvable.');
  await audit.ecrire({
    operateur: req.operateur, action: 'ascenseur_modifie', cible: 'ascenseur', idCible: a.id_ascenseur,
    detail: { statut: a.statut, cause_panne: a.cause_panne }
  });
  res.json(a);
});

/** DELETE /api/ascenseurs/:id (opérateur) */
exports.supprimer = asyncHandler(async (req, res) => {
  if (!(await ascenseurs.supprimer(req.params.id))) throw new HttpError(404, 'Ascenseur introuvable.');
  await audit.ecrire({ operateur: req.operateur, action: 'ascenseur_supprime', cible: 'ascenseur', idCible: Number(req.params.id) });
  res.status(204).end();
});
