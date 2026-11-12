import { useEffect, useState } from 'react';
import { chargerItineraire } from '../api';
import type { EtatItineraire, ModeTransport, Recherche, Station } from '../types';

export type EtatsItineraires = Partial<Record<ModeTransport, EtatItineraire>>;

interface Depart {
  lat: number;
  lon: number;
}

export function useItineraires(
  depart: Depart | null,
  recherche: Recherche | null,
  stationChoisie: Station | null,
  modes: ModeTransport[],
  pmr: boolean
): EtatsItineraires {
  const [etats, setEtats] = useState<EtatsItineraires>({});

  const lat = recherche?.adresse.latitude;
  const lon = recherche?.adresse.longitude;
  const via = stationChoisie ? { lat: stationChoisie.latitude, lon: stationChoisie.longitude } : null;
  const departLat = depart?.lat;
  const departLon = depart?.lon;
  const cleModes = modes.join(',');

  useEffect(() => {
    if (lat === undefined || lon === undefined || !via || departLat === undefined || departLon === undefined) {
      setEtats({});
      return;
    }
    let annule = false;
    const liste = cleModes.split(',') as ModeTransport[];
    setEtats(Object.fromEntries(liste.map(m => [m, { statut: 'chargement' }])) as EtatsItineraires);

    liste.forEach(mode => {
      chargerItineraire({ mode, lat, lon, via: via ?? undefined, pmr })
        .then(itineraire => {
          if (!annule) setEtats(e => ({ ...e, [mode]: { statut: 'ok', itineraire } }));
        })
        .catch(() => {
          if (!annule) setEtats(e => ({ ...e, [mode]: { statut: 'erreur' } }));
        });
    });

    return () => {
      annule = true;
    };
  }, [lat, lon, via?.lat, via?.lon, departLat, departLon, cleModes, pmr]);

  return etats;
}
