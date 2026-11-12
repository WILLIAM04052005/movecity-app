import type { ModeTransport, Persona } from '../types';

const TOUS_LES_MODES: ModeTransport[] = ['transit', 'foot', 'bike', 'car'];
const MODES_PMR: ModeTransport[] = ['transit', 'foot'];

export function modesPour(persona: Persona | null): ModeTransport[] {
  return persona === 'pmr' ? MODES_PMR : TOUS_LES_MODES;
}

export function formatDuree(secondes: number): string {
  const minutes = Math.max(1, Math.round(secondes / 60));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

const MODE_GOOGLE: Record<ModeTransport, string> = {
  transit: 'transit',
  foot: 'walking',
  bike: 'bicycling',
  car: 'driving'
};

interface Point {
  latitude: number;
  longitude: number;
}

export function lienItineraire(mode: ModeTransport, origine: Point, destination: Point): string {
  const params = new URLSearchParams({
    api: '1',
    origin: `${origine.latitude},${origine.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    travelmode: MODE_GOOGLE[mode]
  });
  return `https://www.google.com/maps/dir/?${params}`;
}
