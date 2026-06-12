import LZString from 'lz-string';
import { DEFAULT_PLAN } from './defaultPlan';
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

// ---- Quota-safe localStorage ----
//
// localStorage (~5 MB) is shared by every key below plus anything else on the
// origin. Persisting is an optimization, never a requirement: ALL writes go
// through safeSetItem, which on QuotaExceededError evicts the oldest route/
// trip cache entries (object key order = insertion order = LRU order) and
// retries once. If it still fails, the app keeps working from memory.

const OSRM_KEY = 'balkans-trip-osrm-cache';
const TRIP_KEY = 'balkans-trip-osrm-trip-cache';

/** Caches whose entries may be dropped (oldest first) to free quota. */
const EVICTABLE_CACHE_KEYS = [OSRM_KEY, TRIP_KEY];

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
  for (const key of EVICTABLE_CACHE_KEYS) {
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

function clearSchedule(next: Overrides, id: string): void {
  const current = next[id];
  if (!current) return;
  const rest = { ...current };
  delete rest.day;
  delete rest.dayOrder;
  if (Object.keys(rest).length === 0) delete next[id];
  else next[id] = rest;
}

function clearScheduleIf(next: Overrides, id: string, day: number, dayOrder: number): boolean {
  const current = next[id];
  if (!current || current.day !== day || current.dayOrder !== dayOrder) return false;
  clearSchedule(next, id);
  return true;
}

function moveScheduleIf(
  next: Overrides,
  id: string,
  fromDay: number,
  fromOrder: number,
  toDay: number,
  toOrder: number,
): boolean {
  const current = next[id];
  if (!current || current.day !== fromDay || current.dayOrder !== fromOrder) return false;
  next[id] = { ...current, day: toDay, dayOrder: toOrder };
  return true;
}

function assignIfUnscheduled(next: Overrides, id: string, day: number, dayOrder: number): boolean {
  const current = next[id];
  if (current?.day !== undefined || current?.dayOrder !== undefined) return false;
  next[id] = { ...(current ?? {}), day, dayOrder };
  return true;
}

function migrateOverrides(raw: Overrides): { overrides: Overrides; changed: boolean } {
  const next: Overrides = { ...raw };
  let changed = false;
  const clear = (id: string, day: number, order: number) => {
    const didClear = clearScheduleIf(next, id, day, order);
    changed = didClear || changed;
    return didClear;
  };
  const move = (id: string, fromDay: number, fromOrder: number, toDay: number, toOrder: number) => {
    const didMove = moveScheduleIf(next, id, fromDay, fromOrder, toDay, toOrder);
    changed = didMove || changed;
    return didMove;
  };
  const assign = (id: string, day: number, order: number) => {
    changed = assignIfUnscheduled(next, id, day, order) || changed;
  };

  // Force hr-zadar-airport to Day 1 if it got moved to Day 2 (car is picked up on arrival).
  if (next['hr-zadar-airport']?.day === 2) {
    next['hr-zadar-airport'] = { ...(next['hr-zadar-airport'] ?? {}), day: 1, dayOrder: 0 };
    changed = true;
  }

  // Jun 2026 itinerary correction: exact old baked-plan positions only.
  clear('hr-anica-kuk', 1, 4);
  clear('hr-villa-stone-house-martelina', 1, 6);
  clear('hr-split', 2, 1);
  clear('hr-kantun-paulina', 2, 2);

  const fixedDay3 = [
    move('hr-biokovo-tollroad', 3, 3, 3, 2),
    move('hr-sveti-jure', 3, 2, 3, 3),
    move('hr-camping-kate-mlini', 3, 7, 3, 8),
  ].some(Boolean);
  if (fixedDay3) assign('hr-dubrovnik-airport-pickup', 3, 7);

  clear('hr-camp-lupis-loviste', 4, 3);
  const stagedPrapratno = move('hr-camp-prapratno', 5, 1, 4, 3);
  if (stagedPrapratno) assign('hr-prapratno-ferry', 5, 1);

  clear('ba-trebizat-canoe', 6, 1);
  move('ba-kravica', 6, 2, 6, 1);
  move('ba-pocitelj', 6, 3, 6, 2);
  clear('ba-fortica-mostar', 6, 4);
  move('ba-mostar', 6, 5, 6, 3);
  clear('ba-sniper-tower-mostar', 6, 6);
  move('ba-cafe-de-alma-mostar', 6, 7, 6, 4);
  move('ba-tima-irma', 6, 8, 6, 5);
  move('ba-gem-mostar-nanas-house', 6, 9, 6, 6);
  clear('ba-villa-cold-river-treehouse-bunica', 6, 10);

  const fixedSarajevo = [
    move('ba-blagaj', 7, 0, 7, 1),
    clear('ba-jablanica-kayak-neretva', 7, 1),
    clear('ba-neretva-rafting-konjic', 7, 2),
    move('ba-boracko-lake', 7, 3, 7, 2),
    move('ba-sarajevo', 7, 4, 7, 3),
    clear('ba-tunnel-of-hope', 7, 5),
    clear('ba-trebevic-cable-car', 7, 6),
    clear('ba-bobsled-track', 7, 7),
    clear('ba-sarajevo-pivara', 7, 8),
    move('ba-zuta-tabija', 7, 9, 7, 4),
    move('ba-sarajevo-petica-ferhatovic', 7, 10, 7, 5),
    move('ba-air-1542024184506963047', 7, 11, 7, 7),
    clear('ba-gem-konjic-lakeview-studio', 7, 12),
  ].some(Boolean);
  if (fixedSarajevo) {
    changed = true;
    assign('ba-cinemas-sloga-latin-night', 7, 6);
  }

  clear('ba-sand-pyramids-foca', 8, 1);
  move('me-tara-rafting-brstanovica', 8, 2, 8, 1);
  move('me-scepan-polje-piva-canyon', 8, 3, 8, 2);
  move('me-mratinje-dam', 8, 4, 8, 3);
  move('me-pluzine', 8, 5, 8, 4);
  move('me-piva-lake-swim', 8, 6, 8, 5);
  move('me-camp-mlinski-potok', 8, 7, 8, 6);
  clear('ba-tjentiste-monument', 8, 8);
  clear('me-camp-grab', 8, 9);

  clear('me-prutas-hike', 9, 2);
  clear('me-trnovacko-jezero', 9, 3);
  move('me-vrazje-jezero', 9, 4, 9, 2);
  move('me-zabljak', 9, 5, 9, 3);
  clear('me-planinica', 9, 5);
  clear('me-grabovica-canyon', 9, 6);
  move('me-oro-zabljak', 9, 7, 9, 4);
  move('me-gem-zabljak-mountain-spark', 9, 8, 9, 5);

  clear('me-villa-jablan-winery-rvasi', 10, 6);
  clear('me-gem-skadar-orahovo-koliba', 10, 7);
  move('me-camp-radoman', 10, 8, 10, 7);

  const fixedAdaSleep = clear('me-fkk-camp-ada-bojana', 11, 5);
  if (fixedAdaSleep) {
    changed = true;
    assign('me-camp-safari-beach', 11, 5);
  }

  clear('me-lovcen-njegos-mausoleum', 12, 5);
  move('me-tanjga-kotor', 12, 6, 12, 5);
  move('me-perast', 12, 7, 12, 6);
  move('me-vitaljina-border', 12, 8, 12, 7);
  clear('ba-villa-village-house-cvaljina', 12, 9);
  move('ba-trebinje-old-town', 12, 10, 12, 8);
  move('ba-air-1165836464333612445', 12, 11, 12, 9);

  return { overrides: next, changed };
}

export function loadOverrides(): Overrides {
  try {
    const raw = localStorage.getItem(KEY);
    // On first visit (empty localStorage) seed from the baked default plan so
    // all 4 group members see the pre-populated Itinerary without importing a URL.
    if (raw === null) return { ...DEFAULT_PLAN };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...DEFAULT_PLAN };
    const { overrides, changed } = migrateOverrides(parsed as Overrides);
    if (changed) safeSetItem(KEY, JSON.stringify(overrides));
    return overrides;
  } catch {
    return { ...DEFAULT_PLAN };
  }
}

export function saveOverrides(o: Overrides) {
  safeSetItem(KEY, JSON.stringify(o));
}

// ---- User-added places (Add-place feature) ----
//
// Full `Place` objects the user dropped at runtime, in their own localStorage
// key so a redeploy (which can change src/data/*.json) never touches them.
// loadPlaces()-side merge in App keeps them appearing on the map, in filters,
// the route builder, the day planner, the finders, and exports — for free.
// Only the immutable identity (name/category/lat/lng) lives here; status/day/
// note flow through the same overrides layer as baked places.

const USER_PLACES_KEY = 'balkans-trip-user-places';

/** Narrow an unknown value to a plausible user Place (defensive against bad imports). */
function isUserPlace(x: unknown): x is Place {
  if (!x || typeof x !== 'object') return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.lat === 'number' &&
    typeof p.lng === 'number'
  );
}

export function loadUserPlaces(): Place[] {
  try {
    const a = JSON.parse(localStorage.getItem(USER_PLACES_KEY) ?? '[]');
    return Array.isArray(a) ? a.filter(isUserPlace) : [];
  } catch {
    return [];
  }
}

export function saveUserPlaces(places: Place[]): boolean {
  return safeSetItem(USER_PLACES_KEY, JSON.stringify(places));
}

// ---- Share plan (B1): {overrides, userPlaces} ⇄ a compressed URL hash ----
//
// 100% static: the plan is a few KB of JSON, LZ-string compressed into the URL
// hash. Send the link in the group chat; opening it offers merge/replace.

export interface SharedPlan {
  overrides: Overrides;
  userPlaces: Place[];
}

/** Encode {overrides, userPlaces} into a compact, URL-hash-safe string. */
export function encodePlan(plan: SharedPlan): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(plan));
}

/** Decode a shared-plan payload; returns null on any malformed input. */
export function decodePlan(encoded: string): SharedPlan | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const obj = JSON.parse(json) as unknown;
    if (!obj || typeof obj !== 'object') return null;
    const o = obj as Record<string, unknown>;
    const overrides =
      o.overrides && typeof o.overrides === 'object'
        ? (o.overrides as Overrides)
        : {};
    const userPlaces = Array.isArray(o.userPlaces)
      ? (o.userPlaces as unknown[]).filter(isUserPlace)
      : [];
    return { overrides, userPlaces };
  } catch {
    return null;
  }
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
    return JSON.parse(localStorage.getItem(OSRM_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/** Quota-safe; returns false when nothing could be persisted. */
export function saveRouteCache(c: Record<string, CachedRoute>): boolean {
  return persistCache(OSRM_KEY, c);
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

export function loadTripCache(): Record<string, TripResult> {
  try {
    return JSON.parse(localStorage.getItem(TRIP_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/** Quota-safe; returns false when nothing could be persisted. */
export function saveTripCache(c: Record<string, TripResult>): boolean {
  return persistCache(TRIP_KEY, c);
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
  safeSetItem(FERRY_KEY, JSON.stringify(f));
}

// ---- Trip-mode state (mode, done stops, last GPS fix) ----

export type Mode = 'planning' | 'trip';

const MODE_KEY = 'balkans-trip-mode';

export function loadSavedMode(): Mode | null {
  const v = localStorage.getItem(MODE_KEY);
  return v === 'planning' || v === 'trip' ? v : null;
}

export function saveMode(m: Mode) {
  safeSetItem(MODE_KEY, m);
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
  safeSetItem(DONE_KEY, JSON.stringify(d));
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
  safeSetItem(FIX_KEY, JSON.stringify(f));
}

const DAY_NOTES_KEY = 'balkans-trip-day-notes';

/** Per-day free-text memo (keyed by day number as string). */
export function loadDayNotes(): Record<number, string> {
  try {
    return JSON.parse(localStorage.getItem(DAY_NOTES_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function saveDayNotes(notes: Record<number, string>) {
  safeSetItem(DAY_NOTES_KEY, JSON.stringify(notes));
}
