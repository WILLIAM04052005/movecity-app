import { describe, expect, it } from 'vitest';
import { distanceKm, formatDistance, trierParDistance } from './geo';

describe('geo', () => {
  it('distance nulle entre un point et lui-même', () => {
    expect(distanceKm(48.8586, 2.347, 48.8586, 2.347)).toBeCloseTo(0, 6);
  });

  it('Châtelet → Hôtel de Ville ≈ 350 m', () => {
    const d = distanceKm(48.8586, 2.347, 48.8574, 2.3514);
    expect(d).toBeGreaterThan(0.3);
    expect(d).toBeLessThan(0.4);
  });

  it('trie du plus proche au plus lointain', () => {
    const points = [
      { nom: 'loin', latitude: 48.9, longitude: 2.4 },
      { nom: 'près', latitude: 48.8587, longitude: 2.3471 }
    ];
    const tries = trierParDistance(48.8586, 2.347, points);
    expect(tries.map(p => p.nom)).toEqual(['près', 'loin']);
    expect(tries[0].distanceKm).toBeLessThan(tries[1].distanceKm);
  });

  it('formate en mètres puis en km', () => {
    expect(formatDistance(0.35)).toBe('350 m');
    expect(formatDistance(1.234)).toBe('1.2 km');
  });
});
