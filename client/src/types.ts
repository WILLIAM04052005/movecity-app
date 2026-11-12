export type Persona = 'touriste' | 'senior' | 'pmr';
export type Langue = 'fr' | 'en';
export type StatutAscenseur = 'disponible' | 'en_panne' | 'inconnu';

export interface Ligne {
  id_ligne: number;
  code_ligne: string;
  type_ligne: string;
}

export interface Station {
  id_station: number;
  nom_station: string;
  latitude: number;
  longitude: number;
  lignes: string[];
}

export interface Ascenseur {
  id_ascenseur: number;
  statut: StatutAscenseur;
  cause_panne: string | null;
  date_maj: string;
  libelle?: string | null;
  ref_externe?: string | null;
  id_station: number;
  nom_station: string;
  latitude: number;
  longitude: number;
}

export interface KioskConfig {
  id_kiosque: number;
  nom_emplacement: string;
  latitude: number;
  longitude: number;
  station: { id_station: number; nom_station: string };
  lignes: Ligne[];
}

/** Résultat du géocodage : on ne garde que ce qui sert à l'affichage. */
export interface AdresseTrouvee {
  libelle: string;
  latitude: number;
  longitude: number;
}

export interface StationProche extends Station {
  distanceKm: number;
}

/** État agrégé d'une station vis-à-vis de ses ascenseurs. */
export interface EtatStation {
  station: Station;
  statut: StatutAscenseur;
  cause: string | null;
  /** Date de mise à jour la plus ancienne parmi les ascenseurs (approche prudente). */
  dateMaj: Date | null;
}

/** Réponse de GET /api/ascenseurs/stats (vue « accessibilité du réseau »). */
export interface StatsAscenseurs {
  total: number;
  disponibles: number;
  en_panne: number;
  inconnus: number;
  taux_panne_pct: number;
  derniere_maj: string | null;
  pannes_par_ligne: { code_ligne: string; type_ligne: string; total: number; en_panne: number }[];
}

export type ModeTransport = 'transit' | 'foot' | 'bike' | 'car';

export interface EtapeItineraire {
  type: 'transport' | 'marche' | 'velo' | 'voiture';
  ligne?: string | null;
  couleur?: string | null;
  direction?: string | null;
  depuis: string | null;
  vers: string | null;
  distance_m: number;
  duree_s: number;
  geometrie: [number, number][];
}

export interface Itineraire {
  mode: ModeTransport;
  source: 'prim' | 'osm';
  distance_m: number;
  duree_s: number;
  etapes: EtapeItineraire[];
}

export type EtatItineraire =
  | { statut: 'chargement' }
  | { statut: 'erreur' }
  | { statut: 'ok'; itineraire: Itineraire };

export interface Recherche {
  adresse: AdresseTrouvee;
  proches: StationProche[];
}
