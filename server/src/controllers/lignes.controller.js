const lignes = require('../models/lignes.model');
const { asyncHandler } = require('../utils/http');

/** GET /api/lignes */
exports.lister = asyncHandler(async (req, res) => {
  res.json(await lignes.lister());
});
