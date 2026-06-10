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
  /** Per-leg stats in visiting order (absent on entries cached before this field). */
  legs?: { distance: number; duration: number }[];
  /** Snapped waypoint locations [lng, lat][] aligned to the input points. */
  snapped?: [number, number][];
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

/** Result of a route-order solve (local matrix solver, formerly OSRM /trip). */
export interface TripResult extends CachedRoute {
  /** Original input indices in optimal visiting order. */
  order: number[];
  /** Per-leg distance/duration in visiting order (length = order.length - 1). */
  legs: { distance: number; duration: number }[];
  /** True when the ordering is a provable optimum (Held-Karp). Absent on old /trip entries. */
  exact?: boolean;
  /** Human label for how the order was computed, e.g. "exact optimum (Held-Karp)". */
  method?: string;
  /**
   * With anchored segments: positions in `order` (0-based) where each segment
   * starts. Always begins with 0. Absent / [0] when there were no anchors.
   */
  segStarts?: number[];
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

// ---- Manual ferry hours per leg (keyed by unordered place-id pair) ----
// OSRM road durations don't include ferry waits/schedules (Mljet, Korčula…).
// The user can tag a leg with "+X h ferry"; it persists across rebuilds because
// the key is the pair of place ids, not the route.

export type FerryHours = Record<string, number>;

const FERRY_KEY = 'balkans-trip-ferry-hours';

/** Stable key for the leg between two places, direction-independent. */
export function ferryPairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
}

export function loadFerryHours(): FerryHours {
  try {
    return JSON.parse(localStorage.getItem(FERRY_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function saveFerryHours(f: FerryHours) {
  localStorage.setItem(FERRY_KEY, JSON.stringify(f));
}

// ---- Trip-mode state (mode, done stops, last GPS fix) ----

export type Mode = 'planning' | 'trip';

const MODE_KEY = 'balkans-trip-mode';

export function loadSavedMode(): Mode | null {
  const v = localStorage.getItem(MODE_KEY);
  return v === 'planning' || v === 'trip' ? v : null;
}

export function saveMode(m: Mode) {
  localStorage.setItem(MODE_KEY, m);
}

const DONE_KEY = 'balkans-trip-done';

/** Stop ids ticked off in the Today view. */
export function loadDone(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(DONE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function saveDone(d: Record<string, boolean>) {
  localStorage.setItem(DONE_KEY, JSON.stringify(d));
}

export interface GpsFix {
  lat: number;
  lng: number;
  /** accuracy in meters */
  acc?: number;
  /** epoch ms of the fix */
  ts: number;
}

const FIX_KEY = 'balkans-trip-last-fix';

/** Last GPS fix, so a cold start with no signal still shows an approximate dot. */
export function loadLastFix(): GpsFix | null {
  try {
    const f = JSON.parse(localStorage.getItem(FIX_KEY) ?? 'null');
    return f && typeof f.lat === 'number' ? f : null;
  } catch {
    return null;
  }
}

export function saveLastFix(f: GpsFix) {
  localStorage.setItem(FIX_KEY, JSON.stringify(f));
}
