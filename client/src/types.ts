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

export interface Recherche {
  adresse: AdresseTrouvee;
  proches: StationProche[];
}
