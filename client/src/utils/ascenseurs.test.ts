import { describe, expect, it } from 'vitest';
import { agregerStatut, estAncienne, etatDesStations, parseDateMaj } from './ascenseurs';
import type { Ascenseur, Station } from '../types';

const station = (id: number): Station => ({
  id_station: id, nom_station: `S${id}`, latitude: 48.85, longitude: 2.35, lignes: ['M1']
});
const ascenseur = (id: number, idStation: number, statut: Ascenseur['statut'], date = '2026-10-19 10:00:00'): Ascenseur => ({
  id_ascenseur: id, statut, cause_panne: statut === 'en_panne' ? 'Maintenance' : null,
  date_maj: date, id_station: idStation, nom_station: `S${idStation}`, latitude: 48.85, longitude: 2.35
});

describe('agregerStatut', () => {
  it('une panne l’emporte sur tout', () => {
    expect(agregerStatut(['disponible', 'en_panne', 'inconnu'])).toBe('en_panne');
  });
  it('l’inconnu l’emporte sur disponible', () => {
    expect(agregerStatut(['disponible', 'inconnu'])).toBe('inconnu');
  });
  it('disponible seulement si tous le sont', () => {
    expect(agregerStatut(['disponible', 'disponible'])).toBe('disponible');
  });
  it('aucun ascenseur référencé = inconnu (on ne devine pas)', () => {
    expect(agregerStatut([])).toBe('inconnu');
  });
});

describe('dates', () => {
  it('lit le format SQLite comme de l’UTC', () => {
    expect(parseDateMaj('2026-10-19 10:00:00')?.toISOString()).toBe('2026-10-19T10:00:00.000Z');
  });
  it('rejette une date invalide', () => {
    expect(parseDateMaj('pas une date')).toBeNull();
  });
  it('signale une donnée de plus de 24 h', () => {
    const maintenant = new Date('2026-10-20T11:00:00Z');
    expect(estAncienne(parseDateMaj('2026-10-19 10:00:00'), maintenant)).toBe(true);
    expect(estAncienne(parseDateMaj('2026-10-20 08:00:00'), maintenant)).toBe(false);
    expect(estAncienne(null, maintenant)).toBe(true);
  });
});

describe('etatDesStations', () => {
  it('calcule statut, cause et date la plus ancienne par station', () => {
    const etats = etatDesStations(
      [station(1), station(2), station(3)],
      [
        ascenseur(1, 1, 'disponible'),
        ascenseur(2, 2, 'en_panne', '2026-10-19 12:00:00'),
        ascenseur(3, 2, 'disponible', '2026-10-19 08:00:00')
      ]
    );
    expect(etats[0].statut).toBe('disponible');
    expect(etats[1].statut).toBe('en_panne');
    expect(etats[1].cause).toBe('Maintenance');
    expect(etats[1].dateMaj?.toISOString()).toBe('2026-10-19T08:00:00.000Z');
    expect(etats[2].statut).toBe('inconnu');
    expect(etats[2].dateMaj).toBeNull();
  });
});
