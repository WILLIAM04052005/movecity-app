// --- Distance approximative entre deux points GPS (formule de Haversine) ---
// Suffisant ici : on veut juste comparer des distances entre stations proches,
// pas une précision cartographique.
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Trouver la station accessible la plus proche d'une station en panne ---
function trouverStationProcheDisponible(stationEnPanne, toutesLesStations) {
  const disponibles = toutesLesStations.filter(s => s.statut === 'disponible' && s.station !== stationEnPanne.station);
  if (disponibles.length === 0) return null;

  let plusProche = disponibles[0];
  let distanceMin = distanceKm(stationEnPanne.lat, stationEnPanne.lon, plusProche.lat, plusProche.lon);

  for (const s of disponibles) {
    const d = distanceKm(stationEnPanne.lat, stationEnPanne.lon, s.lat, s.lon);
    if (d < distanceMin) {
      distanceMin = d;
      plusProche = s;
    }
  }
  return { station: plusProche, distanceKm: distanceMin };
}

// --- Couleurs par statut (cohérentes avec le CSS de l'app) ---
const COULEURS_STATUT = {
  disponible: '#1a7a3c',
  en_panne: '#c0392b',
  inconnu: '#888888'
};

const LABELS_STATUT = {
  disponible: 'Ascenseur disponible',
  en_panne: 'Ascenseur en panne',
  inconnu: 'Statut inconnu'
};

// --- Initialisation de la carte, centrée sur Paris ---
const map = L.map('map').setView([48.8566, 2.3522], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19
}).addTo(map);

// --- Créer un marqueur circulaire coloré selon le statut ---
function creerMarqueur(station) {
  const couleur = COULEURS_STATUT[station.statut] || COULEURS_STATUT.inconnu;

  return L.circleMarker([station.lat, station.lon], {
    radius: 9,
    fillColor: couleur,
    color: '#ffffff',
    weight: 2,
    fillOpacity: 0.9
  });
}

// --- Liste complète des stations, remplie après chargement (utile pour les suggestions) ---
let toutesLesStations = [];

// --- Afficher le détail d'une station sous la carte (accessible, pas juste dans une popup) ---
function afficherDetailStation(station) {
  const bloc = document.getElementById('detail-station');
  const nom = document.getElementById('detail-nom');
  const statut = document.getElementById('detail-statut');
  const maj = document.getElementById('detail-maj');
  const suggestion = document.getElementById('detail-suggestion');

  bloc.hidden = false;
  nom.textContent = station.station;
  statut.innerHTML = `Statut : <span class="statut-${station.statut}">${LABELS_STATUT[station.statut] || station.statut}</span>` +
    (station.cause ? ` — ${station.cause}` : '');
  maj.textContent = `Dernière mise à jour : ${new Date(station.maj).toLocaleString('fr-FR')}`;

  // --- Alerte + suggestion si la station est en panne ---
  if (station.statut === 'en_panne') {
    const resultat = trouverStationProcheDisponible(station, toutesLesStations);
    if (resultat) {
      const distanceTexte = resultat.distanceKm < 1
        ? `${Math.round(resultat.distanceKm * 1000)} m`
        : `${resultat.distanceKm.toFixed(1)} km`;
      suggestion.innerHTML = `⚠️ Cet ascenseur est en panne. Station accessible la plus proche : <strong>${resultat.station.station}</strong> (à environ ${distanceTexte}).`;
    } else {
      suggestion.textContent = '⚠️ Cet ascenseur est en panne. Aucune station accessible n\'a été trouvée à proximité pour le moment.';
    }
    suggestion.hidden = false;
  } else {
    suggestion.hidden = true;
  }

  bloc.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// --- Charger les stations depuis l'API et les afficher sur la carte ---
async function chargerCarte() {
  try {
    const res = await fetch('/api/ascenseurs');
    const { data, avertissement } = await res.json();

    if (avertissement) {
      const el = document.getElementById('map-avertissement');
      el.textContent = `⚠️ ${avertissement}`;
      el.hidden = false;
    }

    toutesLesStations = data;

    data.forEach(station => {
      if (station.lat == null || station.lon == null) return; // sécurité si une station n'a pas de coordonnées

      const marqueur = creerMarqueur(station);
      marqueur.bindTooltip(station.station, { direction: 'top' });
      marqueur.on('click', () => afficherDetailStation(station));
      marqueur.addTo(map);
    });
  } catch (err) {
    console.error('Erreur chargement carte :', err);
    const el = document.getElementById('map-avertissement');
    el.textContent = '❌ Impossible de charger les données des stations pour le moment.';
    el.hidden = false;
  }
}

// --- Mode simplifié (partagé avec les autres pages) ---
function initSimpleModeToggle() {
  const btn = document.getElementById('simple-mode-toggle');
  btn.addEventListener('click', () => {
    const actif = document.body.classList.toggle('simple-mode');
    btn.setAttribute('aria-pressed', actif);
  });
}

chargerCarte();
initSimpleModeToggle();
