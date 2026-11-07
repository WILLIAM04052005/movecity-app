import type { Ascenseur, EtatStation, Langue, Station, StatutAscenseur } from '../types';
import { DONNEE_ANCIENNE_HEURES } from '../config';

/**
 * SQLite renvoie « 2026-10-19 14:02:11 » (UTC, sans fuseau). On le lit
 * explicitement comme de l'UTC pour éviter un décalage selon le navigateur.
 */
export function parseDateMaj(valeur: string): Date | null {
  const iso = valeur.includes('T') ? valeur : valeur.replace(' ', 'T') + 'Z';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function estAncienne(date: Date | null, maintenant: Date = new Date()): boolean {
  if (!date) return true;
  return maintenant.getTime() - date.getTime() > DONNEE_ANCIENNE_HEURES * 3_600_000;
}

export function formatMaj(date: Date, langue: Langue): string {
  return new Intl.DateTimeFormat(langue === 'fr' ? 'fr-FR' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris'
  }).format(date);
}

/**
 * Agrège les ascenseurs d'une station en un seul statut, de façon prudente :
 * une panne l'emporte, puis l'inconnu ; « disponible » seulement si TOUS
 * les ascenseurs connus le sont. Station sans ascenseur référencé = inconnu
 * (on ne devine jamais).
 */
export function agregerStatut(statuts: readonly StatutAscenseur[]): StatutAscenseur {
  if (statuts.length === 0) return 'inconnu';
  if (statuts.includes('en_panne')) return 'en_panne';
  if (statuts.includes('inconnu')) return 'inconnu';
  return 'disponible';
}

export function etatDesStations(
  stations: readonly Station[],
  ascenseurs: readonly Ascenseur[]
): EtatStation[] {
  return stations.map(station => {
    const siens = ascenseurs.filter(a => a.id_station === station.id_station);
    const dates = siens
      .map(a => parseDateMaj(a.date_maj))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      station,
      statut: agregerStatut(siens.map(a => a.statut)),
      cause: siens.find(a => a.statut === 'en_panne')?.cause_panne ?? null,
      dateMaj: dates[0] ?? null
    };
  });
}
