// Réglages de la borne, regroupés au même endroit pour être faciles à ajuster.

/** Inactivité avant l'avertissement « Êtes-vous toujours là ? » (ms). */
export const INACTIVITE_MS = Number(import.meta.env.VITE_INACTIVITE_MS) || 60_000;

/** Délai laissé pour répondre avant le retour à l'écran d'accueil (ms). */
export const AVERTISSEMENT_MS = Number(import.meta.env.VITE_AVERTISSEMENT_MS) || 10_000;

/** Au-delà de cette ancienneté, la donnée ascenseur est signalée comme « ancienne ».
 *  Le flux IDFM est mis à jour environ 3 fois par jour. */
export const DONNEE_ANCIENNE_HEURES = 24;

/** Rafraîchissement automatique de l'état des ascenseurs (ms). */
export const RAFRAICHISSEMENT_ASCENSEURS_MS = 5 * 60_000;

/** Nombre de stations proposées après une recherche d'adresse. */
export const NB_STATIONS_PROCHES = 3;

export const ZOOM_PAR_DEFAUT = 16;
