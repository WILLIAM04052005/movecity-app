import { describe, expect, it } from 'vitest';
import { formatDuree, lienItineraire, modesPour } from './itineraire';

describe('modesPour', () => {
  it('propose les quatre modes au touriste et au senior', () => {
    expect(modesPour('touriste')).toEqual(['transit', 'foot', 'bike', 'car']);
    expect(modesPour('senior')).toEqual(['transit', 'foot', 'bike', 'car']);
  });

  it('limite le profil PMR aux transports et à la marche', () => {
    expect(modesPour('pmr')).toEqual(['transit', 'foot']);
  });
});

describe('formatDuree', () => {
  it('affiche des minutes sous une heure, jamais 0 min', () => {
    expect(formatDuree(10)).toBe('1 min');
    expect(formatDuree(720)).toBe('12 min');
  });

  it('affiche heures et minutes au-delà', () => {
    expect(formatDuree(3900)).toBe('1 h 05');
    expect(formatDuree(7200)).toBe('2 h 00');
  });
});

describe('lienItineraire', () => {
  const borne = { latitude: 48.8586, longitude: 2.347 };
  const adresse = { latitude: 48.8559, longitude: 2.3606 };

  it('construit un lien Google Maps avec départ, arrivée et mode', () => {
    const url = new URL(lienItineraire('transit', borne, adresse));
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/');
    expect(url.searchParams.get('origin')).toBe('48.8586,2.347');
    expect(url.searchParams.get('destination')).toBe('48.8559,2.3606');
    expect(url.searchParams.get('travelmode')).toBe('transit');
  });

  it('traduit les modes vers ceux de Google Maps', () => {
    const mode = (m: 'foot' | 'bike' | 'car') => new URL(lienItineraire(m, borne, adresse)).searchParams.get('travelmode');
    expect(mode('foot')).toBe('walking');
    expect(mode('bike')).toBe('bicycling');
    expect(mode('car')).toBe('driving');
  });
});
