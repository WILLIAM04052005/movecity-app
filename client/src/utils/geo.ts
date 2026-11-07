/** Distance entre deux points GPS, en km (formule de Haversine). */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Trie des éléments géolocalisés du plus proche au plus lointain. */
export function trierParDistance<T extends { latitude: number; longitude: number }>(
  lat: number,
  lon: number,
  elements: readonly T[]
): Array<T & { distanceKm: number }> {
  return elements
    .map(e => ({ ...e, distanceKm: distanceKm(lat, lon, e.latitude, e.longitude) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** « 350 m » sous 1 km, « 1.2 km » au-delà. */
export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
