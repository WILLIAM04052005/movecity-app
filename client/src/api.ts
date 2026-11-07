import type { AdresseTrouvee, Ascenseur, KioskConfig, Langue, Station } from './types';

async function getJson<T>(url: string): Promise<T> {
  const reponse = await fetch(url);
  if (!reponse.ok) throw new Error(`${url} → HTTP ${reponse.status}`);
  return reponse.json() as Promise<T>;
}

export const chargerConfig = () => getJson<KioskConfig>('/api/kiosk/config');
export const chargerStations = () => getJson<Station[]>('/api/stations');
export const chargerAscenseurs = () => getJson<Ascenseur[]>('/api/ascenseurs');

/** Raisons d'échec d'une recherche d'adresse, traduites ensuite par l'interface. */
export type ErreurGeocodage = 'introuvable' | 'trop_de_requetes' | 'indisponible';

export class GeocodageErreur extends Error {
  constructor(public readonly raison: ErreurGeocodage) {
    super(raison);
  }
}

export async function geocoder(adresse: string, langue: Langue): Promise<AdresseTrouvee> {
  let reponse: Response;
  try {
    reponse = await fetch(`/api/geocode?q=${encodeURIComponent(adresse)}&lang=${langue}`);
  } catch {
    throw new GeocodageErreur('indisponible');
  }
  if (reponse.status === 404 || reponse.status === 400) throw new GeocodageErreur('introuvable');
  if (reponse.status === 429) throw new GeocodageErreur('trop_de_requetes');
  if (!reponse.ok) throw new GeocodageErreur('indisponible');
  return reponse.json() as Promise<AdresseTrouvee>;
}
