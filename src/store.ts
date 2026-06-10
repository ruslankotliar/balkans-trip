import type { Place, Status } from './types';

const modules = import.meta.glob('./data/*.json', { eager: true }) as Record<
  string,
  { default: Place[] }
>;

/** Merge all src/data/*.json files; first occurrence of an id wins. */
export function loadPlaces(): Place[] {
  const seen = new Map<string, Place>();
  for (const mod of Object.values(modules)) {
    for (const p of mod.default) {
      if (!seen.has(p.id)) seen.set(p.id, p);
    }
  }
  return [...seen.values()];
}

/** Per-place user edits stored only in localStorage (never written back to data/). */
export interface Override {
  status?: Status;
  /** Trip day 1–13 (Jun 16–28) this place is assigned to. undefined = unassigned. */
  day?: number;
  /** Sort position within its day (smaller = earlier). */
  dayOrder?: number;
  /** Free-form personal note. */
  note?: string;
}

export type Overrides = Record<string, Override>;

/** A base place merged with its localStorage override. */
export type PlaceWithOverride = Place & Override;

const KEY = 'balkans-trip-overrides';

export function loadOverrides(): Overrides {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function saveOverrides(o: Overrides) {
  localStorage.setItem(KEY, JSON.stringify(o));
}

// ---- OSRM route cache (keyed by the coordinate sequence) ----

export interface CachedRoute {
  /** meters */
  distance: number;
  /** seconds */
  duration: number;
  /** GeoJSON LineString coordinates: [lng, lat][] */
  coordinates: [number, number][];
}

const OSRM_KEY = 'balkans-trip-osrm-cache';

export function loadRouteCache(): Record<string, CachedRoute> {
  try {
    return JSON.parse(localStorage.getItem(OSRM_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function saveRouteCache(c: Record<string, CachedRoute>) {
  localStorage.setItem(OSRM_KEY, JSON.stringify(c));
}

/** Result of an OSRM Trip (TSP) solve. */
export interface TripResult extends CachedRoute {
  /** Original input indices in optimal visiting order. */
  order: number[];
  /** Per-leg distance/duration in visiting order (length = order.length - 1). */
  legs: { distance: number; duration: number }[];
}

const TRIP_KEY = 'balkans-trip-osrm-trip-cache';

export function loadTripCache(): Record<string, TripResult> {
  try {
    return JSON.parse(localStorage.getItem(TRIP_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function saveTripCache(c: Record<string, TripResult>) {
  localStorage.setItem(TRIP_KEY, JSON.stringify(c));
}
