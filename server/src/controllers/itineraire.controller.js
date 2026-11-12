const config = require('../config/env');
const kiosque = require('../models/kiosque.model');
const itineraires = require('../services/itineraire.service');
const { HttpError, asyncHandler } = require('../utils/http');

exports.calculer = asyncHandler(async (req, res) => {
  const { lat, lon, mode, via_lat, via_lon, pmr } = req.query;

  const borne = await kiosque.configuration(config.kioskId);
  if (!borne) throw new HttpError(404, 'Borne introuvable.');

  const resultat = await itineraires.calculer({
    mode,
    depart: { lat: borne.latitude, lon: borne.longitude },
    arrivee: { lat, lon },
    via: via_lat !== undefined ? { lat: via_lat, lon: via_lon } : null,
    pmr: pmr === true
  });

  res.json(resultat);
});
