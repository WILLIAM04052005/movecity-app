const audit = require('../models/audit.model');
const { asyncHandler } = require('../utils/http');

/** GET /api/audit?limite=100 (opérateur) : dernières actions des opérateurs */
exports.lister = asyncHandler(async (req, res) => {
  res.json(await audit.lister(req.query.limite));
});
