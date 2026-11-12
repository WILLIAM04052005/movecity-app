const stations = require('../models/stations.model');
const audit = require('../models/audit.model');
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
  const s = await stations.creer(req.body);
  await audit.ecrire({ operateur: req.operateur, action: 'station_creee', cible: 'station', idCible: s.id_station, detail: { nom: s.nom_station } });
  res.status(201).json(s);
});

/** PUT /api/stations/:id (opérateur) — modification partielle */
exports.modifier = asyncHandler(async (req, res) => {
  const station = await stations.modifier(req.params.id, req.body);
  if (!station) throw new HttpError(404, 'Station introuvable.');
  await audit.ecrire({ operateur: req.operateur, action: 'station_modifiee', cible: 'station', idCible: station.id_station, detail: { nom: station.nom_station } });
  res.json(station);
});

/** DELETE /api/stations/:id (opérateur) */
exports.supprimer = asyncHandler(async (req, res) => {
  if (!(await stations.supprimer(req.params.id))) throw new HttpError(404, 'Station introuvable.');
  await audit.ecrire({ operateur: req.operateur, action: 'station_supprimee', cible: 'station', idCible: Number(req.params.id) });
  res.status(204).end();
});
