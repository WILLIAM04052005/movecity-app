import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';
import { ZOOM_PAR_DEFAUT } from '../config';
import { useKiosk } from '../context/KioskContext';
import type { CleTexte } from '../i18n';
import type { KioskConfig, StatutAscenseur } from '../types';

const SYMBOLES: Record<StatutAscenseur, string> = { disponible: '✓', en_panne: '✕', inconnu: '?' };
const CLES_STATUT: Record<StatutAscenseur, CleTexte> = {
  disponible: 'disponible',
  en_panne: 'enPanne',
  inconnu: 'inconnu'
};

interface Couches {
  kiosque: L.LayerGroup;
  stations: L.LayerGroup;
  recherche: L.LayerGroup;
}

function margesCadrage(): { haut: number; bas: number } {
  const panneau = document.querySelector('.recherche')?.getBoundingClientRect();
  let haut = 140;
  let bas = 140;
  if (panneau) {
    if ((panneau.top + panneau.bottom) / 2 > window.innerHeight / 2) bas = window.innerHeight - panneau.top + 30;
    else haut = panneau.bottom + 30;
  }
  return { haut, bas };
}

/** Contenu de tooltip construit en texte pur (jamais d'HTML venant des données). */
function texteTooltip(contenu: string): HTMLElement {
  const el = document.createElement('div');
  el.textContent = contenu;
  return el;
}

/** Carte plein écran. La position de la borne vient de la base (position réelle fixe). */
export function MapView({ config }: { config: KioskConfig }) {
  const { etats, persona, recherche, stationChoisie, stationFocus, langue, mode, itineraires, t } = useKiosk();
  const etatItineraire = itineraires[mode];
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<L.Map | null>(null);
  const couches = useRef<Couches | null>(null);
  const avaitRecherche = useRef(false);
  const centre = useRef<[number, number]>([config.latitude, config.longitude]);

  // 1. Création de la carte (une seule fois)
  useEffect(() => {
    if (!conteneur.current) return;
    const map = L.map(conteneur.current, { zoomControl: false }).setView(centre.current, ZOOM_PAR_DEFAUT);
    map.attributionControl.setPrefix(false);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    carte.current = map;
    couches.current = {
      kiosque: L.layerGroup().addTo(map),
      stations: L.layerGroup().addTo(map),
      recherche: L.layerGroup().addTo(map)
    };
    return () => {
      // Leaflet termine une animation de zoom 250 ms plus tard, même si la carte a
      // été supprimée entre-temps (changement de profil, retour accueil) → erreur.
      // On coupe donc l'animation en cours avant de détruire la carte.
      map.stop();
      (map as unknown as { _animatingZoom: boolean })._animatingZoom = false;
      map.remove();
      carte.current = null;
      couches.current = null;
    };
  }, []);

  // 2. Position réelle de la borne
  useEffect(() => {
    const c = couches.current;
    if (!c) return;
    c.kiosque.clearLayers();
    // Anneau qui pulse AUTOUR du marqueur de la station (la borne est dans la station) :
    // l'état de l'ascenseur de Châtelet reste donc visible au centre.
    L.marker([config.latitude, config.longitude], {
      keyboard: false,
      interactive: false,
      icon: L.divIcon({
        className: 'mc-kiosque',
        html: '<span class="mc-kiosque-pulse"></span><span class="mc-kiosque-anneau"></span><span class="mc-kiosque-point"></span>',
        iconSize: [52, 52]
      })
    })
      .bindTooltip(texteTooltip(t('positionActuelle')), {
        permanent: true,
        direction: 'top',
        offset: [0, -26],
        className: 'mc-tooltip'
      })
      .addTo(c.kiosque);
  }, [config, t]);

  // 3. Stations : état des ascenseurs visible uniquement en profil PMR
  useEffect(() => {
    const c = couches.current;
    if (!c) return;
    c.stations.clearLayers();

    etats.forEach(({ station, statut }) => {
      const pmr = persona === 'pmr';
      const marqueur = L.marker([station.latitude, station.longitude], {
        keyboard: false,
        zIndexOffset: 500,
        icon: L.divIcon({
          className: 'mc-station-conteneur',
          html: pmr
            ? `<span class="mc-station mc-station--${statut}">${SYMBOLES[statut]}</span>`
            : '<span class="mc-station mc-station--neutre"></span>',
          iconSize: [34, 34]
        })
      });
      const libelle = `${station.nom_station} (${station.lignes.join(', ')})${pmr ? ` — ${t(CLES_STATUT[statut])}` : ''}`;
      marqueur.bindTooltip(texteTooltip(libelle), { direction: 'top', offset: [0, -14], className: 'mc-tooltip' });
      marqueur.on('click', () => marqueur.openTooltip());
      marqueur.addTo(c.stations);
    });
  }, [etats, persona, t]);

  // 4. Adresse recherchée + trait vers la station la plus proche
  useEffect(() => {
    const map = carte.current;
    const c = couches.current;
    if (!map || !c) return;
    c.recherche.clearLayers();

    if (!recherche) {
      if (avaitRecherche.current) map.flyTo(centre.current, ZOOM_PAR_DEFAUT);
      avaitRecherche.current = false;
      return;
    }
    avaitRecherche.current = true;

    const { adresse, proches } = recherche;
    L.marker([adresse.latitude, adresse.longitude], {
      keyboard: false,
      icon: L.divIcon({ className: 'mc-adresse-conteneur', html: '<span class="mc-adresse"></span>', iconSize: [26, 26] })
    })
      .bindTooltip(texteTooltip(adresse.libelle), { direction: 'top', offset: [0, -14], className: 'mc-tooltip' })
      .addTo(c.recherche);

    const points: L.LatLngTuple[] = [[adresse.latitude, adresse.longitude]];
    const borne: L.LatLngTuple = [config.latitude, config.longitude];
    const pointille = { color: '#222222', weight: 4, dashArray: '8 8' };

    if (stationChoisie) {
      const station: L.LatLngTuple = [stationChoisie.latitude, stationChoisie.longitude];
      const adressePt: L.LatLngTuple = [adresse.latitude, adresse.longitude];

      if (etatItineraire?.statut === 'ok') {
        etatItineraire.itineraire.etapes.forEach(etape => {
          if (etape.geometrie.length < 2) return;
          points.push(...etape.geometrie);
          if (etape.type === 'transport') {
            L.polyline(etape.geometrie, { color: '#222222', weight: 11, opacity: 0.9 }).addTo(c.recherche);
            L.polyline(etape.geometrie, { color: etape.couleur ?? '#BB4D98', weight: 7 }).addTo(c.recherche);
          } else if (etape.type === 'marche') {
            L.polyline(etape.geometrie, { color: '#222222', weight: 6, dashArray: '2 10', lineCap: 'round' }).addTo(c.recherche);
          } else {
            L.polyline(etape.geometrie, { color: '#222222', weight: 6 }).addTo(c.recherche);
          }
        });
      } else if (mode === 'transit') {
        points.push(borne, station);
        L.polyline([borne, station], pointille).addTo(c.recherche);
        L.polyline([station, adressePt], { ...pointille, dashArray: '2 10', lineCap: 'round' }).addTo(c.recherche);
      } else {
        points.push(borne);
        L.polyline([borne, adressePt], pointille).addTo(c.recherche);
      }
    } else {
      const plusProche = proches[0];
      if (plusProche) {
        points.push([plusProche.latitude, plusProche.longitude]);
        L.polyline(points, pointille).addTo(c.recherche);
      }
    }

    const { haut, bas } = margesCadrage();
    map.fitBounds(L.latLngBounds(points), {
      paddingTopLeft: [60, haut],
      paddingBottomRight: [60, bas],
      maxZoom: 17
    });
  }, [recherche, stationChoisie, etatItineraire, mode, config, langue]);

  // 5. Clic sur une station dans une liste : on y amène la carte
  useEffect(() => {
    if (stationFocus && carte.current) {
      carte.current.flyTo([stationFocus.latitude, stationFocus.longitude], 17);
    }
  }, [stationFocus]);

  return (
    <>
      <div ref={conteneur} className="carte" role="region" aria-label={t('carte')} />
      <button
        type="button"
        className="btn btn--icone btn-recentrer"
        aria-label={t('recentrer')}
        title={t('recentrer')}
        onClick={() => carte.current?.flyTo(centre.current, ZOOM_PAR_DEFAUT)}
      >
        <LocateFixed size={26} aria-hidden="true" />
      </button>
    </>
  );
}
