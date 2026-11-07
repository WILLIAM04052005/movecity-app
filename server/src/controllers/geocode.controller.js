const config = require('../config/env');
const journal = require('../models/journal.model');
const stations = require('../models/stations.model');
const { HttpError, asyncHandler } = require('../utils/http');

/**
 * GET /api/geocode?q=adresse&lang=fr|en
 * Cherche une adresse réelle via la Base Adresse Nationale (API officielle, gratuite).
 *
 * RGPD / minimisation : l'adresse tapée n'est JAMAIS stockée. On journalise
 * uniquement la station la plus proche, la langue et l'heure.
 */
exports.rechercher = asyncHandler(async (req, res) => {
  const { q, lang } = req.query;

  let data;
  try {
    const reponse = await fetch(`${config.banUrl}?q=${encodeURIComponent(q)}&limit=1`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!reponse.ok) throw new Error(`BAN a répondu ${reponse.status}`);
    data = await reponse.json();
  } catch (err) {
    console.error('Erreur géocodage BAN :', err.message);
    throw new HttpError(503, "Service de recherche d'adresse indisponible pour le moment.");
  }

  const resultat = data.features?.[0];
  if (!resultat) throw new HttpError(404, 'Adresse introuvable.');

  const [longitude, latitude] = resultat.geometry.coordinates;
  const libelle = resultat.properties.label;

  // Journal anonyme : la station la plus proche du résultat, rien d'autre.
  const [plusProche] = await stations.plusProches(latitude, longitude, 1);
  await journal.enregistrer({
    id_kiosque: config.kioskId,
    id_station_proche: plusProche?.id_station,
    langue: lang
  });

  res.json({ libelle, latitude, longitude });
});
