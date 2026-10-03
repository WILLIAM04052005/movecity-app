const express = require('express');
const router = express.Router();

// --- Cache mémoire simple ---
// La donnée IDFM n'est mise à jour que 3x/jour, donc pas besoin de la
// requêter à chaque appel : un cache d'une heure suffit largement et
// protège l'appli si l'API externe est indisponible ponctuellement.
let cache = { data: null, fetchedAt: 0 };
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 heure

// TODO (à faire avant J5) : remplacer par l'URL réelle du jeu de données
// "État des ascenseurs" d'Île-de-France Mobilités sur data.gouv.fr / la
// plateforme PRIM d'IDFM, une fois la clé/l'accès confirmés avec l'équipe.
const IDFM_ASCENSEURS_URL = process.env.IDFM_ASCENSEURS_URL || null;

async function fetchAscenseursDepuisIDFM() {
  if (!IDFM_ASCENSEURS_URL) {
    // Pas encore configuré : on renvoie un jeu de données minimal d'exemple
    // pour pouvoir développer et tester le front sans bloquer sur l'accès API.
    return [
      { station: 'Exemple - Châtelet', statut: 'disponible', cause: null, lat: 48.8583, lon: 2.3470, maj: new Date().toISOString() },
      { station: 'Exemple - Gare de Lyon', statut: 'en_panne', cause: 'Maintenance programmée', lat: 48.8443, lon: 2.3744, maj: new Date().toISOString() },
      { station: 'Exemple - Nation', statut: 'inconnu', cause: null, lat: 48.8483, lon: 2.3958, maj: new Date().toISOString() },
      { station: 'Exemple - Bastille', statut: 'disponible', cause: null, lat: 48.8532, lon: 2.3692, maj: new Date().toISOString() },
      { station: 'Exemple - Montparnasse', statut: 'en_panne', cause: 'Pièce en commande', lat: 48.8422, lon: 2.3210, maj: new Date().toISOString() }
    ];
  }

  const response = await fetch(IDFM_ASCENSEURS_URL);
  if (!response.ok) {
    throw new Error(`Réponse IDFM invalide : ${response.status}`);
  }
  return response.json();
}

// --- GET /api/ascenseurs : renvoie l'état des ascenseurs (avec cache + fallback) ---
router.get('/', async (req, res) => {
  const now = Date.now();

  if (cache.data && (now - cache.fetchedAt) < CACHE_DURATION_MS) {
    return res.json({ source: 'cache', data: cache.data });
  }

  try {
    const data = await fetchAscenseursDepuisIDFM();
    cache = { data, fetchedAt: now };
    res.json({ source: 'idfm', data });
  } catch (err) {
    console.error('Erreur récupération données IDFM :', err.message);

    // Fallback : si on a une vieille donnée en cache, mieux vaut la montrer
    // (avec un avertissement) que de casser l'écran de l'utilisateur.
    if (cache.data) {
      return res.json({ source: 'cache_perime', data: cache.data, avertissement: 'Donnée non rafraîchie, API IDFM indisponible.' });
    }
    res.status(503).json({ error: 'Impossible de récupérer les données d\'accessibilité pour le moment.' });
  }
});

module.exports = router;
