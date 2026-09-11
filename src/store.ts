import { CATEGORIES } from './constants';
import { DEFAULT_PLANS } from './defaultPlan';
import { findTrip, getActiveTripId } from './trips';
import type { Place, Status } from './types';

const modules = import.meta.glob('./data/*.json', { eager: true }) as Record<
  string,
  { default: Place[] }
>;

function normalizeBakedPlace(place: Place): Place {
  // Clean, specific status model (no "undecided candidate" pile):
  //   shortlist = IN THE PLAN (has a day, drives the route/schedule)
  //   backup    = FALLBACK BED for a night (alternative place to sleep)
  //   extra     = OPTION to do if we want / have spare time (the "nearby options" pool)
  //   rejected  = not interested
  // Researched candidates become a fallback bed (if a sleep) or an extra (anything else).
  if (place.status !== 'candidate') return place;
  const sleep = place.category === 'accommodation' || place.category === 'campsite';
  return { ...place, status: sleep ? 'backup' : 'extra' };
}

/** Merge all src/data/*.json files; first occurrence of an id wins. */
export function loadPlaces(): Place[] {
  const seen = new Map<string, Place>();
  for (const mod of Object.values(modules)) {
    for (const p of mod.default) {
      if (!seen.has(p.id)) seen.set(p.id, normalizeBakedPlace(p));
    }
  }
  return [...seen.values()];
}

// ---- Quota-safe localStorage ----
//
// localStorage (~5 MB) is shared by every key below plus anything else on the
// origin. Persisting is an optimization, never a requirement: ALL writes go
// through safeSetItem, which on QuotaExceededError evicts the oldest route/
// trip cache entries (object key order = insertion order = LRU order) and
// retries once. If it still fails, the app keeps working from memory.

// ---- Trip-scoped localStorage keys ----
// All keys are prefixed with the active trip ID so switching trips never
// cross-contaminates overrides, user places, or route caches.
// For the Balkans trip (id='balkans-trip') the keys are identical to the old
// hardcoded strings, so existing data requires no migration.
const overridesKey = () => `${getActiveTripId()}-overrides`;
const userPlacesKey = () => `${getActiveTripId()}-user-places`;
const osrmKey = () => `${getActiveTripId()}-osrm-cache`;
const ferryKey = () => `${getActiveTripId()}-ferry-hours`;
const evictableCacheKeys = () => [osrmKey()];

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || // legacy Firefox
      e.code === 22)
  );
}

/**
 * Drop the oldest half of each route cache's entries (JSON object key order
 * preserves insertion order, so the first keys are the oldest entries).
 */
function evictOldestCacheEntries(): void {
  for (const key of evictableCacheKeys()) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const obj = JSON.parse(raw) as Record<string, unknown>;
      const keys = Object.keys(obj);
      for (const k of keys.slice(0, Math.max(1, Math.ceil(keys.length / 2)))) delete obj[k];
      if (Object.keys(obj).length === 0) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(obj));
    } catch {
      // Unparseable, or even the smaller write failed → drop the cache entirely.
      try {
        localStorage.removeItem(key);
      } catch {
        /* nothing left to do */
      }
    }
  }
}

/**
 * Quota-safe localStorage write. Returns false when the value could not be
 * persisted — callers may report that (e.g. offline prep) but must never
 * treat it as an error: a failed cache write must not break functionality.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (!isQuotaError(e)) {
      console.warn(`[storage] could not persist "${key}"`, e);
      return false;
    }
  }
  // Quota hit: evict the oldest cached routes, then retry exactly once.
  evictOldestCacheEntries();
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn(`[storage] quota exceeded — "${key}" not persisted (kept in memory)`, e);
    return false;
  }
}

/** Per-place user edits, kept in this phone's localStorage. */
export interface Override {
  status?: Status;
  /** Trip day 1–13 (Jun 16–28) this place is assigned to. undefined = unassigned. */
  day?: number;
  /** Sort position within its day (smaller = earlier). */
  dayOrder?: number;
  /** Free-form personal note. */
  note?: string;
  /** Estimated minutes to spend at the stop. Used by the schedule clock. */
  timeMinutes?: number;
  /** ★ Recommended pick — Claude's suggested option for the day (renders a star badge). */
  pick?: boolean;
}

export type Overrides = Record<string, Override>;

/** A base place merged with its localStorage override. */
export type PlaceWithOverride = Place & Override;

/** Remove undefined fields and collapse empty override objects to null. */
export function normalizeOverride(value: Override | undefined | null): Override | null {
  if (!value) return null;
  const next: Override = {};
  if (value.status !== undefined) next.status = value.status;
  if (value.day !== undefined) next.day = value.day;
  if (value.dayOrder !== undefined) next.dayOrder = value.dayOrder;
  if (value.note !== undefined) next.note = value.note;
  if (value.timeMinutes !== undefined) next.timeMinutes = value.timeMinutes;
  // Only persist pick when truthy — a `false`/absent pick is the default and
  // would otherwise keep an otherwise-empty override row alive.
  if (value.pick) next.pick = true;
  return Object.keys(next).length > 0 ? next : null;
}

/** Normalize an Overrides map and drop empty per-place entries. */
export function normalizeOverrides(raw: Overrides): Overrides {
  const next: Overrides = {};
  for (const [id, value] of Object.entries(raw)) {
    const normalized = normalizeOverride(value);
    if (normalized) next[id] = normalized;
  }
  return next;
}

export function loadOverrides(): Overrides {
  try {
    const raw = localStorage.getItem(overridesKey());
    // On first visit (empty localStorage) seed from the trip's baked default
    // plan so every phone opens on the same itinerary. Trips without one start empty.
    const seed = seedPlan();
    if (raw === null) return seed;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return seed;
    return normalizeOverrides(parsed as Overrides);
  } catch {
    return seedPlan();
  }
}

function seedPlan(): Overrides {
  return normalizeOverrides({ ...(DEFAULT_PLANS[getActiveTripId()] ?? {}) });
}

export function saveOverrides(o: Overrides) {
  safeSetItem(overridesKey(), JSON.stringify(normalizeOverrides(o)));
}

// ---- User-added places ----
//
// Full `Place` objects the user dropped at runtime, in their own localStorage
// key so a redeploy (which can change src/data/*.json) never touches them.
// loadPlaces()-side merge in App keeps them appearing on the map, in filters,
// the day planner, the finders, and exports — for free.
// Only the immutable identity (name/category/lat/lng) lives here; status/day/
// note flow through the same overrides layer as baked places.

function isStatus(x: unknown): x is Status {
  return x === 'candidate' || x === 'shortlist' || x === 'extra' || x === 'backup' || x === 'rejected';
}

function isCountry(x: unknown): x is Place['country'] {
  return x === 'HR' || x === 'BA' || x === 'ME' || x === 'IT' || x === 'AL';
}

/**
 * Country for a runtime-added pin. The active trip decides: a one-country trip
 * gets that country outright (a pin must stay visible in the trip it was added
 * to), a multi-country trip gets a rough bounding-box guess among its countries.
 */
export function guessCountry(lat: number, lng: number): Place['country'] {
  const tripCountries = findTrip(getActiveTripId()).countries;
  if (tripCountries.length === 1) return tripCountries[0];
  let guess: Place['country'];
  // Italy: western Europe, west of ~15°E (Lake Como is ~9.3°E).
  if (lat >= 36 && lat <= 47.5 && lng >= 6 && lng < 15) guess = 'IT';
  // Bosnia: inland pocket roughly N of 42.55 and E of 17.0 (Mostar/Konjic).
  else if (lat > 42.55 && lng > 17.0 && lng < 19.7) guess = 'BA';
  // Croatia: coastal strip and the northwest; broadly W/N of the ME line.
  else if (lat > 42.6 || lng < 17.5) guess = 'HR';
  else guess = 'ME';
  return tripCountries.includes(guess) ? guess : tripCountries[0];
}

/** Narrow an unknown value to a plausible user Place (defensive against bad imports). */
export function normalizeUserPlace(x: unknown): Place | null {
  if (!x || typeof x !== 'object') return null;
  const p = x as Record<string, unknown>;
  const id = typeof p.id === 'string' ? p.id.trim() : '';
  const name = typeof p.name === 'string' ? p.name.trim() : '';
  const lat = typeof p.lat === 'number' ? p.lat : null;
  const lng = typeof p.lng === 'number' ? p.lng : null;
  if (!id || !name || lat == null || lng == null) return null;

  const category =
    typeof p.category === 'string' && CATEGORIES.includes(p.category as Place['category'])
      ? (p.category as Place['category'])
      : 'other';
  const description =
    typeof p.description === 'string' && p.description.trim()
      ? p.description.trim()
      : 'Added by the group.';
  const strings = (value: unknown): string[] | undefined =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : undefined;

  const userPlace: Place = {
    id,
    name,
    country: isCountry(p.country) ? p.country : guessCountry(lat, lng),
    category,
    lat,
    lng,
    description,
    communityNotes: typeof p.communityNotes === 'string' ? p.communityNotes : undefined,
    sources: strings(p.sources),
    cost: typeof p.cost === 'string' ? p.cost : undefined,
    timeNeeded: typeof p.timeNeeded === 'string' ? p.timeNeeded : undefined,
    bestTime: typeof p.bestTime === 'string' ? p.bestTime : undefined,
    facilities: typeof p.facilities === 'string' ? p.facilities : undefined,
    tags: strings(p.tags),
    rating: typeof p.rating === 'number' ? p.rating : undefined,
    status: isStatus(p.status) ? p.status : 'shortlist',
    userAdded: true,
    source: 'user',
  };
  // Drain user "candidate" pins the same way as baked ones (→ backup if a sleep,
  // else → extra) so the candidate bucket stays empty everywhere.
  return normalizeBakedPlace(userPlace);
}

export function loadUserPlaces(): Place[] {
  try {
    const a = JSON.parse(localStorage.getItem(userPlacesKey()) ?? '[]');
    return Array.isArray(a) ? a.map(normalizeUserPlace).filter(Boolean) as Place[] : [];
  } catch {
    return [];
  }
}

export function saveUserPlaces(places: Place[]): boolean {
  return safeSetItem(userPlacesKey(), JSON.stringify(places));
}

// ---- OSRM route cache (keyed by the coordinate sequence) ----
//
// Geometry does NOT belong in localStorage: a single OSRM route is thousands
// of [lng, lat] points (hundreds of KB) and a handful of routes blow the
// ~5 MB quota. The service worker already caches raw OSRM responses
// (NetworkFirst) for offline replay; here we persist only slim metadata plus
// a simplified polyline for offline route drawing, under hard caps.

const MAX_CACHE_ENTRIES = 100; // per cache
const MAX_CACHE_CHARS = 1_000_000; // ~1 MB serialized, per cache
const MAX_ENTRY_CHARS = 30_000; // single-entry hard cap

/**
 * Douglas–Peucker simplification of a [lng, lat] polyline; `toleranceM` is
 * the max deviation in meters. 50 m is invisible at road-trip zoom levels and
 * typically shrinks OSRM geometries 10–20×.
 */
export function simplifyLine(
  coords: [number, number][],
  toleranceM = 50,
): [number, number][] {
  if (coords.length <= 2) return coords;
  // Equirectangular projection to meters around the line's first latitude.
  const mPerDegLat = 111_320;
  const mPerDegLng = mPerDegLat * Math.cos((coords[0][1] * Math.PI) / 180);
  const xs = new Float64Array(coords.length);
  const ys = new Float64Array(coords.length);
  for (let i = 0; i < coords.length; i++) {
    xs[i] = coords[i][0] * mPerDegLng;
    ys[i] = coords[i][1] * mPerDegLat;
  }
  const keep = new Uint8Array(coords.length);
  keep[0] = keep[coords.length - 1] = 1;
  const tol2 = toleranceM * toleranceM;
  const stack: [number, number][] = [[0, coords.length - 1]];
  while (stack.length > 0) {
    const [a, b] = stack.pop()!;
    if (b - a < 2) continue;
    const dx = xs[b] - xs[a];
    const dy = ys[b] - ys[a];
    const len2 = dx * dx + dy * dy;
    let maxD = -1;
    let maxI = -1;
    for (let i = a + 1; i < b; i++) {
      let t = len2 === 0 ? 0 : ((xs[i] - xs[a]) * dx + (ys[i] - ys[a]) * dy) / len2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ddx = xs[i] - (xs[a] + t * dx);
      const ddy = ys[i] - (ys[a] + t * dy);
      const d = ddx * ddx + ddy * ddy;
      if (d > maxD) {
        maxD = d;
        maxI = i;
      }
    }
    if (maxD > tol2) {
      keep[maxI] = 1;
      stack.push([a, maxI], [maxI, b]);
    }
  }
  const out: [number, number][] = [];
  for (let i = 0; i < coords.length; i++) if (keep[i]) out.push(coords[i]);
  return out;
}

/** Round to 5 decimals (~1 m) — roughly halves serialized geometry size. */
const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

/** Slim one cache entry for persistence: simplified, size-capped geometry. */
function slimEntry<T extends CachedRoute>(entry: T): T {
  let tol = 50;
  let coords = simplifyLine(entry.coordinates ?? [], tol);
  const withCoords = (): T => ({
    ...entry,
    coordinates: coords.map(([lng, lat]) => [round5(lng), round5(lat)] as [number, number]),
  });
  let slim = withCoords();
  // Coarsen until the entry fits its cap (converges: DP with a huge tolerance
  // keeps only the two endpoints).
  while (JSON.stringify(slim).length > MAX_ENTRY_CHARS && coords.length > 2) {
    tol *= 4;
    coords = simplifyLine(coords, tol);
    slim = withCoords();
  }
  return slim;
}

/**
 * Persist a route/trip cache under hard caps: geometries are slimmed, and
 * entries beyond the newest MAX_CACHE_ENTRIES (or past ~1 MB serialized) are
 * evicted oldest-first. The in-memory cache object is left untouched, so the
 * full-resolution geometry stays available for the current session.
 * Returns false when the cache could not be persisted at all.
 */
function persistCache<T extends CachedRoute>(
  storageKey: string,
  cache: Record<string, T>,
): boolean {
  const slim: Record<string, T> = {};
  for (const k of Object.keys(cache).slice(-MAX_CACHE_ENTRIES)) slim[k] = slimEntry(cache[k]);
  let keys = Object.keys(slim);
  let json = JSON.stringify(slim);
  while (json.length > MAX_CACHE_CHARS && keys.length > 1) {
    delete slim[keys[0]];
    keys = keys.slice(1);
    json = JSON.stringify(slim);
  }
  return safeSetItem(storageKey, json);
}

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

export function loadRouteCache(): Record<string, CachedRoute> {
  try {
    return JSON.parse(localStorage.getItem(osrmKey()) ?? '{}');
  } catch {
    return {};
  }
}

/** Quota-safe; returns false when nothing could be persisted. */
export function saveRouteCache(c: Record<string, CachedRoute>): boolean {
  return persistCache(osrmKey(), c);
}

// ---- Manual ferry hours per leg (keyed by unordered place-id pair) ----
// OSRM road durations don't include ferry waits/schedules (Mljet, Korčula…).
// The user can tag a leg with "+X h ferry"; it persists across rebuilds because
// the key is the pair of place ids, not the route.

export type FerryHours = Record<string, number>;

/** Stable key for the leg between two places, direction-independent. */
export function ferryPairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
}

export function loadFerryHours(): FerryHours {
  try {
    return JSON.parse(localStorage.getItem(ferryKey()) ?? '{}');
  } catch {
    return {};
  }
}
