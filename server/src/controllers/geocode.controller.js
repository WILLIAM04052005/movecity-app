const config = require('../config/env');
const journal = require('../models/journal.model');
const stations = require('../models/stations.model');
const { HttpError, asyncHandler } = require('../utils/http');

/**
 * GET /api/geocode?q=adresse&lang=fr|en
 * Cherche une adresse réelle via la Base Adresse Nationale (API officielle, gratuite).
 * RGPD / minimisation : l'adresse tapée n'est JAMAIS stockée. On journalise
 * uniquement la station la plus proche, la langue et l'heure.
 */
exports.rechercher = asyncHandler(async (req, res) => {
  const { q, lang } = req.query;

  let trouve = null;
  let reponduParPrincipal = false;
  try {
    const reponse = await fetch(`${config.banUrl}?q=${encodeURIComponent(q)}&limit=1`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!reponse.ok) throw new Error(`BAN a répondu ${reponse.status}`);
    const data = await reponse.json();
    reponduParPrincipal = true;
    const f = data.features?.[0];
    if (f) trouve = { longitude: f.geometry.coordinates[0], latitude: f.geometry.coordinates[1], libelle: f.properties.label };
  } catch (err) {
    console.error('Erreur géocodage BAN :', err.message);
  }

  if (!reponduParPrincipal) {
    try {
      const reponse = await fetch(
        `${config.banSecoursUrl}?format=jsonv2&countrycodes=fr&limit=1&q=${encodeURIComponent(q)}`,
        { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'movecity-kiosk/0.2 (projet etudiant EFREI)' } }
      );
      if (!reponse.ok) throw new Error(`Service de secours a répondu ${reponse.status}`);
      const liste = await reponse.json();
      const r = liste?.[0];
      if (r) trouve = { longitude: Number(r.lon), latitude: Number(r.lat), libelle: r.display_name };
      reponduParPrincipal = true;
    } catch (err) {
      console.error('Erreur géocodage secours :', err.message);
      throw new HttpError(503, "Service de recherche d'adresse indisponible pour le moment.");
    }
  }

  if (!trouve) throw new HttpError(404, 'Adresse introuvable.');
  const { longitude, latitude, libelle } = trouve;
  // Journal anonyme : la station la plus proche du résultat, rien d'autre.
  const [plusProche] = await stations.plusProches(latitude, longitude, 1);
  await journal.enregistrer({
    id_kiosque: config.kioskId,
    id_station_proche: plusProche?.id_station,
    langue: lang
  });

  res.json({ libelle, latitude, longitude });
});
