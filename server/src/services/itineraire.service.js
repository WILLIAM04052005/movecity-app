const config = require('../config/env');
const { HttpError } = require('../utils/http');

const MODES = ['transit', 'foot', 'bike', 'car'];
const PROFILS_ROUTAGE = { foot: 'routed-foot', bike: 'routed-bike', car: 'routed-car' };
const TYPE_ETAPE = { foot: 'marche', bike: 'velo', car: 'voiture' };
const DELAI_MS = 8000;

function distanceMetres(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function longueur(geometrie) {
  let total = 0;
  for (let i = 1; i < geometrie.length; i++) total += distanceMetres(geometrie[i - 1], geometrie[i]);
  return Math.round(total);
}

function versLatLon(coordonnees) {
  return (coordonnees || []).map(([lon, lat]) => [lat, lon]);
}

function parserRoutage(json, mode) {
  const route = json && Array.isArray(json.routes) ? json.routes[0] : null;
  if (!route || !route.geometry) return null;
  const geometrie = versLatLon(route.geometry.coordinates);
  const distance_m = Math.round(route.distance);
  const duree_s = Math.round(route.duration);
  return {
    mode,
    source: 'osm',
    distance_m,
    duree_s,
    etapes: [{ type: TYPE_ETAPE[mode], depuis: null, vers: null, distance_m, duree_s, geometrie }]
  };
}

function libelleLigne(infos) {
  const mode = String(infos.commercial_mode || infos.network || '').toLowerCase();
  const code = String(infos.code || infos.label || '').trim();
  if (!code) return null;
  if (mode.includes('métro') || mode.includes('metro')) return `M${code}`;
  if (mode.startsWith('rer')) return `RER ${code}`;
  return code;
}

function couleur(hex) {
  return /^[0-9a-fA-F]{6}$/.test(hex || '') ? `#${hex}` : null;
}

function nomPoint(point) {
  if (!point) return null;
  return point.name || (point.stop_point && point.stop_point.name) || (point.address && point.address.name) || null;
}

function parserNavitia(json) {
  const trajet = json && Array.isArray(json.journeys) ? json.journeys[0] : null;
  if (!trajet || !Array.isArray(trajet.sections)) return null;

  const etapes = [];
  for (const s of trajet.sections) {
    const geometrie = versLatLon(s.geojson && s.geojson.coordinates);
    if (s.type === 'public_transport') {
      const infos = s.display_informations || {};
      etapes.push({
        type: 'transport',
        ligne: libelleLigne(infos),
        couleur: couleur(infos.color),
        direction: infos.direction || null,
        depuis: nomPoint(s.from),
        vers: nomPoint(s.to),
        distance_m: longueur(geometrie),
        duree_s: Math.round(s.duration || 0),
        geometrie
      });
    } else if (s.type === 'street_network' || s.type === 'transfer') {
      if (!s.duration) continue;
      etapes.push({
        type: 'marche',
        depuis: nomPoint(s.from),
        vers: nomPoint(s.to),
        distance_m: longueur(geometrie),
        duree_s: Math.round(s.duration),
        geometrie
      });
    }
  }
  if (etapes.length === 0) return null;

  return {
    mode: 'transit',
    source: 'prim',
    distance_m: etapes.reduce((n, e) => n + e.distance_m, 0),
    duree_s: Math.round(trajet.duration || etapes.reduce((n, e) => n + e.duree_s, 0)),
    etapes
  };
}

async function recupererJson(url, options = {}) {
  let reponse;
  try {
    reponse = await fetch(url, { ...options, signal: AbortSignal.timeout(DELAI_MS) });
  } catch (err) {
    console.error('Itinéraire : service injoignable :', err.message);
    throw new HttpError(503, 'Service d’itinéraires indisponible pour le moment.');
  }
  if (reponse.status === 404) return null;
  if (!reponse.ok) {
    console.error('Itinéraire : le service a répondu', reponse.status);
    throw new HttpError(503, 'Service d’itinéraires indisponible pour le moment.');
  }
  try {
    return await reponse.json();
  } catch {
    throw new HttpError(503, 'Réponse du service d’itinéraires illisible.');
  }
}

async function itineraireRoutage(mode, depart, arrivee) {
  const profil = PROFILS_ROUTAGE[mode];
  const chemin = `${depart.lon},${depart.lat};${arrivee.lon},${arrivee.lat}`;
  const url = `${config.routage.url}/${profil}/route/v1/driving/${chemin}?overview=full&geometries=geojson`;
  return parserRoutage(await recupererJson(url), mode);
}

async function itineraireTransport(depart, arrivee, pmr) {
  if (!config.prim.cle) {
    throw new HttpError(503, 'Itinéraires en transports indisponibles : clé PRIM non configurée.');
  }
  const params = new URLSearchParams({
    from: `${depart.lon};${depart.lat}`,
    to: `${arrivee.lon};${arrivee.lat}`,
    count: '1'
  });
  if (pmr) params.set('traveler_type', 'wheelchair');
  const json = await recupererJson(`${config.prim.url}?${params}`, { headers: { apikey: config.prim.cle } });
  return parserNavitia(json);
}

function assembler(premier, second) {
  return {
    mode: 'transit',
    source: premier.source,
    distance_m: premier.distance_m + second.distance_m,
    duree_s: premier.duree_s + second.duree_s,
    etapes: [...premier.etapes, ...second.etapes]
  };
}

async function calculer({ mode, depart, arrivee, via = null, pmr = false }) {
  let resultat;
  if (mode !== 'transit') {
    resultat = await itineraireRoutage(mode, depart, arrivee);
  } else if (via) {
    const [metro, marche] = await Promise.all([
      itineraireTransport(depart, via, pmr),
      itineraireRoutage('foot', via, arrivee)
    ]);
    resultat = metro && marche ? assembler(metro, marche) : null;
  } else {
    resultat = await itineraireTransport(depart, arrivee, pmr);
  }
  if (!resultat) throw new HttpError(404, 'Aucun itinéraire trouvé.');
  return resultat;
}

module.exports = { MODES, calculer, parserNavitia, parserRoutage, libelleLigne, longueur };
