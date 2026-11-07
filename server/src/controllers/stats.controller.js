const journal = require('../models/journal.model');
const { asyncHandler } = require('../utils/http');

/** GET /api/stats/usage?jours=30 (opérateur) : statistiques d'usage anonymes */
exports.usage = asyncHandler(async (req, res) => {
  res.json(await journal.statistiques(req.query.jours));
});
