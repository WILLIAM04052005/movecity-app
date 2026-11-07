const config = require('../config/env');
const { recuperer } = require('../sync/idfm.client');
const { synchroniser } = require('../sync/idfm.sync');

let enCours = false;

async function lancer() {
  if (enCours) return;
  enCours = true;
  try {
    const bruts = await recuperer({ url: config.idfm.url, fichier: config.idfm.fichier });
    const r = await synchroniser(bruts);
    console.log(`Sync IDFM : ${r.inseres} créé(s), ${r.mis_a_jour} mis à jour, ${r.passes_inconnu} passé(s) en inconnu.`);
  } catch (err) {
    // On garde le dernier état connu en base : une panne de la source ne casse pas la borne.
    console.error('Échec de la synchronisation IDFM (dernier état conservé) :', err.message);
  } finally {
    enCours = false;
  }
}

/** Démarre la synchronisation périodique si IDFM_SYNC_ACTIVE=true. */
function demarrer() {
  if (!config.idfm.syncActive) return null;
  console.log(`Synchronisation IDFM active : toutes les ${config.idfm.intervalleMinutes} min.`);
  lancer();
  return setInterval(lancer, config.idfm.intervalleMinutes * 60_000).unref();
}

module.exports = { demarrer, lancer };
