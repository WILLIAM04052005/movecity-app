const config = require('../config/env');
const kiosque = require('../models/kiosque.model');
const { HttpError, asyncHandler } = require('../utils/http');

/** GET /api/kiosk/config : identité de la borne servie par cette instance. */
exports.configuration = asyncHandler(async (req, res) => {
  const resultat = await kiosque.configuration(config.kioskId);
  if (!resultat) throw new HttpError(404, 'Kiosque introuvable.');
  res.json(resultat);
});
