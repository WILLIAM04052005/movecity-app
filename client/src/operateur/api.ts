// Appels API de l'espace opérateur. Le jeton JWT reste EN MÉMOIRE (jamais dans
// localStorage) : un rechargement de la page déconnecte, ce qui est voulu.
import type { Ascenseur, Ligne, Station, StatsAscenseurs, StatutAscenseur } from '../types';

export class ErreurApi extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: { champ?: string; message: string }[]
  ) {
    super(message);
  }
}

let jeton: string | null = null;
let surSessionExpiree: (() => void) | null = null;

export const definirJeton = (valeur: string | null) => { jeton = valeur; };
export const definirSurSessionExpiree = (rappel: (() => void) | null) => { surSessionExpiree = rappel; };

async function appel<T>(methode: string, chemin: string, corps?: unknown): Promise<T> {
  let reponse: Response;
  try {
    reponse = await fetch(`/api${chemin}`, {
      method: methode,
      headers: {
        ...(corps !== undefined && { 'content-type': 'application/json' }),
        ...(jeton && { authorization: `Bearer ${jeton}` })
      },
      body: corps !== undefined ? JSON.stringify(corps) : undefined
    });
  } catch {
    throw new ErreurApi(0, 'Serveur injoignable. Vérifiez que l’API tourne.');
  }

  if (reponse.status === 204) return undefined as T;
  const donnees = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    // 401 hors connexion = jeton expiré ou compte supprimé : on renvoie à la page de connexion.
    if (reponse.status === 401 && chemin !== '/auth/login') surSessionExpiree?.();
    throw new ErreurApi(reponse.status, donnees?.error ?? `Erreur ${reponse.status}`, donnees?.details);
  }
  return donnees as T;
}

// --- Types propres à l'espace opérateur ---
export interface Operateur { id_operateur: number; email: string }
export interface StationAdmin extends Station { statut_ascenseur: StatutAscenseur }
export interface StatsUsage {
  jours: number;
  total_recherches: number;
  par_heure: { heure: number; recherches: number }[];
  par_langue: { langue: string; recherches: number }[];
  par_station: { nom_station: string; recherches: number }[];
  par_jour: { jour: string; recherches: number }[];
}
export interface CorpsStation { nom_station: string; latitude: number; longitude: number; lignes: string[] }
export interface CorpsAscenseur {
  id_station: number;
  statut: StatutAscenseur;
  cause_panne?: string | null;
  ref_externe?: string | null;
}

// --- Appels ---
export const seConnecter = (email: string, password: string) =>
  appel<{ token: string; operateur: Operateur }>('POST', '/auth/login', { email, password });

export const chargerUsage = (jours: number) => appel<StatsUsage>('GET', `/stats/usage?jours=${jours}`);
export const chargerStatsAscenseurs = () => appel<StatsAscenseurs>('GET', '/ascenseurs/stats');

export const chargerLignes = () => appel<Ligne[]>('GET', '/lignes');
export const chargerStations = () => appel<StationAdmin[]>('GET', '/stations');
export const creerStation = (c: CorpsStation) => appel<StationAdmin>('POST', '/stations', c);
export const modifierStation = (id: number, c: Partial<CorpsStation>) => appel<StationAdmin>('PUT', `/stations/${id}`, c);
export const supprimerStation = (id: number) => appel<void>('DELETE', `/stations/${id}`);

export const chargerAscenseurs = () => appel<Ascenseur[]>('GET', '/ascenseurs');
export const creerAscenseur = (c: CorpsAscenseur) => appel<Ascenseur>('POST', '/ascenseurs', c);
export const changerStatut = (id: number, statut: StatutAscenseur, cause_panne: string | null) =>
  appel<Ascenseur>('PATCH', `/ascenseurs/${id}`, { statut, cause_panne });
export const supprimerAscenseur = (id: number) => appel<void>('DELETE', `/ascenseurs/${id}`);
