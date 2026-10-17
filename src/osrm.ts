import type { CachedRoute } from './store';

/** [lat, lng] pairs in visiting order. */
export type LatLng = [number, number];

/** Stable cache key for an ordered coordinate sequence. */
export function routeKey(points: LatLng[]): string {
  return points.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join(';');
}

/** OSRM's answer when no road joins the points (an island with no car ferry). */
export const NO_ROUTE = 'noRoute';
export type NoRoute = typeof NO_ROUTE;

/**
 * Fetch a driving route through the given points (in order) from the public
 * OSRM demo server. Returns NO_ROUTE when OSRM says no road joins them, null
 * on any other failure (network, server).
 * Includes per-leg durations and the snapped waypoint locations so legs can
 * be attributed and sliced out of the geometry (e.g. to dash ferry legs).
 */
export async function fetchRoute(points: LatLng[]): Promise<CachedRoute | NoRoute | null> {
  if (points.length < 2) return null;
  // OSRM expects {lng},{lat} pairs separated by ';'.
  const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    const data = await res.json().catch(() => null);
    // OSRM answers HTTP 400 with code NoRoute (or NoSegment: no road near a point).
    if (data?.code === 'NoRoute' || data?.code === 'NoSegment') return NO_ROUTE;
    if (!res.ok) return null;
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
