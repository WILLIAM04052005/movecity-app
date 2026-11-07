const stations = require('../models/stations.model');
const { HttpError, asyncHandler } = require('../utils/http');

/** GET /api/stations */
exports.lister = asyncHandler(async (req, res) => {
  res.json(await stations.lister());
});

/** GET /api/stations/nearest?lat=&lon=&limit= */
exports.proches = asyncHandler(async (req, res) => {
  const { lat, lon, limit } = req.query;
  res.json(await stations.plusProches(lat, lon, limit));
});

/** GET /api/stations/:id */
exports.detail = asyncHandler(async (req, res) => {
  const station = await stations.trouver(req.params.id);
  if (!station) throw new HttpError(404, 'Station introuvable.');
  res.json(station);
});

/** POST /api/stations (opérateur) */
exports.creer = asyncHandler(async (req, res) => {
  res.status(201).json(await stations.creer(req.body));
});

/** PUT /api/stations/:id (opérateur) — modification partielle */
exports.modifier = asyncHandler(async (req, res) => {
  const station = await stations.modifier(req.params.id, req.body);
  if (!station) throw new HttpError(404, 'Station introuvable.');
  res.json(station);
});

/** DELETE /api/stations/:id (opérateur) */
exports.supprimer = asyncHandler(async (req, res) => {
  if (!(await stations.supprimer(req.params.id))) throw new HttpError(404, 'Station introuvable.');
  res.status(204).end();
});
