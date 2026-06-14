import type { CachedRoute } from './store';

/** [lat, lng] pairs in visiting order. */
export type LatLng = [number, number];

/** Stable cache key for an ordered coordinate sequence. */
export function routeKey(points: LatLng[]): string {
  return points.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join(';');
}

/**
 * Fetch a driving route through the given points (in order) from the public
 * OSRM demo server. Returns null on any failure (network, no route, etc.).
 * Includes per-leg durations and the snapped waypoint locations so legs can
 * be attributed and sliced out of the geometry (e.g. to dash ferry legs).
 */
export async function fetchRoute(points: LatLng[]): Promise<CachedRoute | null> {
  if (points.length < 2) return null;
  // OSRM expects {lng},{lat} pairs separated by ';'.
  const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route?.geometry?.coordinates) return null;
    const rawLegs = (route.legs as Array<{ duration: number; distance: number }>) ?? [];
    return {
      distance: route.distance,
      duration: route.duration,
      coordinates: route.geometry.coordinates as [number, number][],
      legs: rawLegs.map((l) => ({ duration: l.duration, distance: l.distance })),
      snapped: (data.waypoints ?? []).map(
        (w: { location: [number, number] }) => w.location,
      ),
    };
  } catch {
    return null;
  }
}
