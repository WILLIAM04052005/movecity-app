const { query } = require('../config/database');
const { asyncHandler } = require('../utils/http');

/** État du service + de la connexion à PostgreSQL. */
exports.etat = asyncHandler(async (req, res) => {
  let base = 'ok';
  try {
    await query('SELECT 1');
  } catch {
    base = 'indisponible';
  }
  res.status(base === 'ok' ? 200 : 503).json({
    status: base === 'ok' ? 'ok' : 'degraded',
    database: base,
    timestamp: new Date().toISOString()
  });
});
