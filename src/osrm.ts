import type { CachedRoute, TripResult } from './store';

/** [lat, lng] pairs in visiting order. */
export type LatLng = [number, number];

/** Stable cache key for an ordered coordinate sequence. */
export function routeKey(points: LatLng[]): string {
  return points.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join(';');
}

/**
 * Cache key for a Trip request. Order-dependent on purpose: the cached result's
 * `order` indices reference the exact input sequence, so the key must too.
 */
export function tripKey(points: LatLng[]): string {
  return `trip:${routeKey(points)}`;
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
    return {
      distance: route.distance,
      duration: route.duration,
      coordinates: route.geometry.coordinates as [number, number][],
      legs: (route.legs ?? []).map((l: { duration: number; distance: number }) => ({
        duration: l.duration,
        distance: l.distance,
      })),
      snapped: (data.waypoints ?? []).map(
        (w: { location: [number, number] }) => w.location,
      ),
    };
  } catch {
    return null;
  }
}

/** Duration (s) + distance (m) matrices between all point pairs, from OSRM /table. */
export interface TableResult {
  durations: number[][];
  distances: number[][];
}

/**
 * Fetch the full driving duration+distance matrix for the given points from
 * OSRM /table (one cheap call). Unroutable pairs come back as Infinity.
 * Returns null on failure.
 */
export async function fetchTable(points: LatLng[]): Promise<TableResult | null> {
  if (points.length < 2) return null;
  const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url =
    `https://router.project-osrm.org/table/v1/driving/${coords}` +
    `?annotations=duration,distance`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data?.code !== 'Ok' || !data?.durations) return null;
    const clean = (m: (number | null)[][]) =>
      m.map((row) => row.map((v) => (v == null ? Infinity : v)));
    return {
      durations: clean(data.durations),
      distances: clean(data.distances ?? []),
    };
  } catch {
    return null;
  }
}

/**
 * Solve the optimal visiting order (TSP) through the given points using the
 * OSRM Trip service. Endpoints are fixed: first point = start, last = end
 * (source=first, destination=last, roundtrip=false). Returns null on failure.
 */
export async function fetchTrip(points: LatLng[]): Promise<TripResult | null> {
  if (points.length < 2) return null;
  const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url =
    `https://router.project-osrm.org/trip/v1/driving/${coords}` +
    `?source=first&destination=last&roundtrip=false&overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    // OSRM returns {code:"Ok"} on success, or an error code + message otherwise.
    if (data?.code !== 'Ok' || !data?.trips?.[0] || !data?.waypoints) return null;
    const trip = data.trips[0];
    const n = points.length;
    // waypoints[i] is input point i; waypoint_index = its position in the trip.
    const order = new Array<number>(n);
    data.waypoints.forEach((wp: { waypoint_index: number }, i: number) => {
      order[wp.waypoint_index] = i;
    });
    const legs = (trip.legs ?? []).map((l: { duration: number; distance: number }) => ({
      duration: l.duration,
      distance: l.distance,
    }));
    return {
      distance: trip.distance,
      duration: trip.duration,
      coordinates: trip.geometry.coordinates as [number, number][],
      order,
      legs,
    };
  } catch {
    return null;
  }
}
