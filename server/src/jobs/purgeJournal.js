const config = require('../config/env');
const journal = require('../models/journal.model');

async function purger() {
  try {
    const n = await journal.purger(config.retentionJournalJours);
    if (n > 0) console.log(`Journal purgé : ${n} entrée(s) de plus de ${config.retentionJournalJours} jours supprimée(s).`);
  } catch (err) {
    console.error('Échec de la purge du journal :', err.message);
  }
}

/** Purge au démarrage puis une fois par jour (la borne reste allumée). */
function demarrer() {
  purger();
  return setInterval(purger, 24 * 60 * 60 * 1000).unref();
}

module.exports = { demarrer, purger };
