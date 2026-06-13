import { CATEGORIES } from './constants';
import { DEFAULT_PLAN } from './defaultPlan';
import type { Category, Place, Status } from './types';

const modules = import.meta.glob('./data/*.json', { eager: true }) as Record<
  string,
  { default: Place[] }
>;

const AUTO_BACKUP_CATEGORIES = new Set<Category>([
  'accommodation',
  'beach',
  'food',
  'nightlife',
  'town',
  'other',
]);

function normalizeBakedPlace(place: Place): Place {
  if (place.status !== 'candidate') return place;
  if (!AUTO_BACKUP_CATEGORIES.has(place.category)) return place;
  return { ...place, status: 'backup' };
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

/** Per-place user edits cached locally and mirrored through the collab layer. */
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
}

export type Overrides = Record<string, Override>;

/** One plan override row as stored in Supabase. */
export interface PlanOverrideRow {
  place_id: string;
  data: Override | null;
  cleared: boolean;
  updated_at: string;
}

/** A base place merged with its localStorage override. */
export type PlaceWithOverride = Place & Override;

const KEY = 'balkans-trip-overrides';

/** Remove undefined fields and collapse empty override objects to null. */
export function normalizeOverride(value: Override | undefined | null): Override | null {
  if (!value) return null;
  const next: Override = {};
  if (value.status !== undefined) next.status = value.status;
  if (value.day !== undefined) next.day = value.day;
  if (value.dayOrder !== undefined) next.dayOrder = value.dayOrder;
  if (value.note !== undefined) next.note = value.note;
  if (value.timeMinutes !== undefined) next.timeMinutes = value.timeMinutes;
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

/** Apply Supabase plan rows over an existing overrides map. */
export function applyPlanOverrideRows(base: Overrides, rows: PlanOverrideRow[]): Overrides {
  const next: Overrides = { ...base };
  for (const row of rows) {
    if (row.cleared) {
      delete next[row.place_id];
      continue;
    }
    const normalized = normalizeOverride(row.data);
    if (normalized) next[row.place_id] = normalized;
    else delete next[row.place_id];
  }
  return normalizeOverrides(next);
}

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

  // Zavižan (Northern Velebit) is 100km north of Zadar — routes Day 1 into a 6h+ loop. Unschedule.
  if (next['hr-zavizan-dark-sky']?.day === 1) {
    clearSchedule(next, 'hr-zavizan-dark-sky');
    changed = true;
  }
  // Zrmanja kayaking is north of Zadar, opposite direction to Paklenica — unschedule from Day 1.
  if (next['hr-zrmanja-kayaking']?.day === 1) {
    clearSchedule(next, 'hr-zrmanja-kayaking');
    changed = true;
  }

  // Jun 2026 itinerary correction: exact old baked-plan positions only.
  clear('hr-anica-kuk', 1, 4);
  clear('hr-villa-stone-house-martelina', 1, 6);

  // Day 2: Add Split morning walk — Diocletian's Palace + Kantun Paulina ćevapi,
  // both on the Paklenica→Omiš corridor (zero detour). Shift canyoning+camp to 3-4.
  move('hr-cetina-canyoning', 2, 1, 2, 3);
  move('hr-camp-lisicina', 2, 2, 2, 4);
  assign('hr-split', 2, 1);
  assign('hr-kantun-paulina', 2, 2);

  const fixedDay3 = [
    move('hr-biokovo-tollroad', 3, 3, 3, 2),
    move('hr-sveti-jure', 3, 2, 3, 3),
    move('hr-camping-kate-mlini', 3, 7, 3, 8),
  ].some(Boolean);
  if (fixedDay3) assign('hr-dubrovnik-airport-pickup', 3, 7);

  // Day 3: Remove Konoba Feral Brijesta (40 km U-turn detour on Pelješac); shift later stops down.
  clear('hr-konoba-feral-brijesta', 3, 5);
  move('hr-mali-ston-oysters', 3, 6, 3, 5);
  move('hr-dubrovnik-airport-pickup', 3, 7, 3, 6);
  move('hr-camping-kate-mlini', 3, 8, 3, 7);

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

  // Day 6: Sobra (Mljet) return ferry added as first stop; Bosnia stops shift up by one.
  // These move() calls handle both the old-old state (places at 2-6 after prior migration)
  // and the current default state (places already at 1-6 from DEFAULT_PLAN seed).
  move('ba-kravica', 6, 1, 6, 2);
  move('ba-pocitelj', 6, 2, 6, 3);
  move('ba-mostar', 6, 3, 6, 4);
  move('ba-cafe-de-alma-mostar', 6, 4, 6, 5);
  move('ba-tima-irma', 6, 5, 6, 6);
  move('ba-gem-mostar-nanas-house', 6, 6, 6, 7);
  assign('hr-sobra-ferry', 6, 1);

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
  assign('me-skadar-pelican-kayak', 10, 8);
  assign('me-stari-most-rijeka-crnojevica', 10, 9);
  assign('me-skadar-rijeka-crnojevica-kayak', 10, 10);
  assign('me-durmitor-katun-krstajic', 8, 7);
  assign('me-durmitor-katun-homeland-nest', 9, 6);

  // Day 10: Pavlova Strana is above Virpazar on the descent from Ostrog — it belongs
  // BEFORE Skadar Lake, not after (was causing a north backtrack from Virpazar).
  move('me-skadar-lake', 10, 3, 10, 4);
  move('me-pavlova-strana', 10, 4, 10, 3);
  // Rijeka Crnojevića pair (restaurant + kayak base, same location, NW of Virpazar)
  // grouped before pelican-colony kayak so you drive north to RC then kayak east.
  move('me-skadar-pelican-kayak', 10, 8, 10, 10);
  move('me-stari-most-rijeka-crnojevica', 10, 9, 10, 8);
  move('me-skadar-rijeka-crnojevica-kayak', 10, 10, 10, 9);
  // Raicevic guesthouse (WOW tier, ★9.3, advance booking essential) added as Day 10
  // sleep alternative alongside Camp Radoman — shift RC/pelican stops to make room.
  move('me-stari-most-rijeka-crnojevica', 10, 8, 10, 9);
  move('me-skadar-rijeka-crnojevica-kayak', 10, 9, 10, 10);
  move('me-skadar-pelican-kayak', 10, 10, 10, 11);
  assign('me-guesthouse-skadar-raicevic', 10, 8);

  // Day 9/10 routing fix: Tara Bridge is only 15km east of Žabljak — move it to end
  // of Day 9 (post-hike evening excursion) so Day 10 starts cleanly at Ostrog (SW)
  // without the visual V-backtrack that made Day 10 look like a nonsensical route.
  move('me-gem-zabljak-mountain-spark', 9, 5, 9, 6);
  move('me-durmitor-katun-homeland-nest', 9, 6, 9, 7);
  move('me-tara-bridge-zipline', 10, 1, 9, 5);
  move('me-ostrog-monastery', 10, 2, 10, 1);
  move('me-pavlova-strana', 10, 3, 10, 2);
  move('me-skadar-lake', 10, 4, 10, 3);
  move('me-virpazar-kayak', 10, 5, 10, 4);
  move('me-vinarija-masanovic', 10, 6, 10, 5);
  move('me-camp-radoman', 10, 7, 10, 6);
  move('me-guesthouse-skadar-raicevic', 10, 8, 10, 7);
  move('me-stari-most-rijeka-crnojevica', 10, 9, 10, 8);
  move('me-skadar-rijeka-crnojevica-kayak', 10, 10, 10, 9);
  move('me-skadar-pelican-kayak', 10, 11, 10, 10);

  const fixedAdaSleep = clear('me-fkk-camp-ada-bojana', 11, 5);
  if (fixedAdaSleep) {
    changed = true;
    assign('me-camp-safari-beach', 11, 5);
  }

  // Day 6: Add the Bunica/Blagaj river stay as a nearby overnight option.
  assign('ba-villa-cold-river-treehouse-bunica', 6, 8);

  // Day 10: Add the Rvaši winery house as a Skadar Lake overnight option.
  assign('me-villa-jablan-winery-rvasi', 10, 11);

  // Day 11: Camp Safari (19.271°E) is between Ulcinj and Ada Bojana (19.374°E).
  // Reorder so the group drops bags at camp first, then drives east to Ada Bojana
  // and Misko for the afternoon — eliminating the westward end-of-day backtrack.
  move('me-camp-safari-beach', 11, 5, 11, 3);
  move('me-ada-bojana-beach', 11, 3, 11, 4);
  move('me-misko-stilt-restaurant', 11, 4, 11, 5);

  clear('me-lovcen-njegos-mausoleum', 12, 5);
  move('me-tanjga-kotor', 12, 6, 12, 5);
  move('me-perast', 12, 7, 12, 6);
  move('me-vitaljina-border', 12, 8, 12, 7);
  clear('ba-villa-village-house-cvaljina', 12, 9);
  move('ba-trebinje-old-town', 12, 10, 12, 8);
  move('ba-air-1165836464333612445', 12, 11, 12, 9);

  // Day 12: Remove me-kotor-fortress-paid (same GPS as me-kotor — 9 m apart).
  // Having it as a separate waypoint creates a zero-distance OSRM leg and an
  // overlapping duplicate pin. The fortress description lives in me-kotor.
  clear('me-kotor-fortress-paid', 12, 4);
  move('me-tanjga-kotor', 12, 5, 12, 4);
  move('me-perast', 12, 6, 12, 5);
  move('me-vitaljina-border', 12, 7, 12, 6);
  move('ba-trebinje-old-town', 12, 8, 12, 7);
  move('ba-air-1165836464333612445', 12, 9, 12, 8);

  // ── BIG RESTRUCTURE (Jun 12 2026): eliminate dedicated Dubrovnik-city day ──
  //
  // Old plan: airport pickup Day 3 → sleep near Dubrovnik (Kate Mlini) → Dubrovnik
  // walls+kayak Day 4 → drive to Camp Prapratno → Mljet Day 5.
  //
  // New plan: airport pickup Day 3 → drive directly to Camp Prapratno (~90 km,
  // 1h20m) → Mljet on Friday Day 4 (lighter ferry queue than Saturday) → Bosnia
  // Day 5 → Days 6–11 shift down by one → freed day becomes Dubrovnik walls on
  // Day 12 (Jun 27), arriving from Trebinje (~30 min drive).
  //
  // Step 1: Unschedule old Day 4 Dubrovnik stops.
  clear('hr-dubrovnik', 4, 1);
  clear('hr-dubrovnik-sea-kayak', 4, 2);

  // Step 2: Kate Mlini (was Day 3 overnight near Dubrovnik) → new Day 12.
  move('hr-camping-kate-mlini', 3, 7, 12, 3);

  // Step 3: Camp Prapratno moves from Day 4 → Day 3 (new post-airport overnight).
  move('hr-camp-prapratno', 4, 3, 3, 7);

  // Step 4: Mljet → Day 4 (was Day 5).
  move('hr-prapratno-ferry', 5, 1, 4, 1);
  move('hr-mljet-np', 5, 2, 4, 2);
  move('hr-montokuc-mljet', 5, 3, 4, 3);
  move('hr-odysseus-cave', 5, 4, 4, 4);
  move('hr-camp-marina-mljet', 5, 5, 4, 5);

  // Step 5: Bosnia/Mostar → Day 5 (was Day 6).
  move('hr-sobra-ferry', 6, 1, 5, 1);
  move('ba-kravica', 6, 2, 5, 2);
  move('ba-pocitelj', 6, 3, 5, 3);
  move('ba-mostar', 6, 4, 5, 4);
  move('ba-cafe-de-alma-mostar', 6, 5, 5, 5);
  move('ba-tima-irma', 6, 6, 5, 6);
  move('ba-gem-mostar-nanas-house', 6, 7, 5, 7);
  move('ba-villa-cold-river-treehouse-bunica', 6, 8, 5, 8);

  // Step 6: Blagaj/Sarajevo → Day 6 (was Day 7).
  move('ba-blagaj', 7, 1, 6, 1);
  move('ba-boracko-lake', 7, 2, 6, 2);
  move('ba-sarajevo', 7, 3, 6, 3);
  move('ba-zuta-tabija', 7, 4, 6, 4);
  move('ba-sarajevo-petica-ferhatovic', 7, 5, 6, 5);
  move('ba-cinemas-sloga-latin-night', 7, 6, 6, 6);
  move('ba-air-1542024184506963047', 7, 7, 6, 7);

  // Step 7: Tara/Piva/Žabljak → Day 7 (was Day 8).
  move('me-tara-rafting-brstanovica', 8, 1, 7, 1);
  move('me-scepan-polje-piva-canyon', 8, 2, 7, 2);
  move('me-mratinje-dam', 8, 3, 7, 3);
  move('me-pluzine', 8, 4, 7, 4);
  move('me-piva-lake-swim', 8, 5, 7, 5);
  move('me-camp-mlinski-potok', 8, 6, 7, 6);
  move('me-durmitor-katun-krstajic', 8, 7, 7, 7);

  // Step 8: Durmitor hike → Day 8 (was Day 9).
  move('me-veliki-medjed', 9, 1, 8, 1);
  move('me-vrazje-jezero', 9, 2, 8, 2);
  move('me-zabljak', 9, 3, 8, 3);
  move('me-oro-zabljak', 9, 4, 8, 4);
  move('me-tara-bridge-zipline', 9, 5, 8, 5);
  move('me-gem-zabljak-mountain-spark', 9, 6, 8, 6);
  move('me-durmitor-katun-homeland-nest', 9, 7, 8, 7);

  // Step 9: Ostrog/Skadar → Day 9 (was Day 10).
  move('me-ostrog-monastery', 10, 1, 9, 1);
  move('me-pavlova-strana', 10, 2, 9, 2);
  move('me-skadar-lake', 10, 3, 9, 3);
  move('me-virpazar-kayak', 10, 4, 9, 4);
  move('me-vinarija-masanovic', 10, 5, 9, 5);
  move('me-camp-radoman', 10, 6, 9, 6);
  move('me-guesthouse-skadar-raicevic', 10, 7, 9, 7);
  move('me-stari-most-rijeka-crnojevica', 10, 8, 9, 8);
  move('me-skadar-rijeka-crnojevica-kayak', 10, 9, 9, 9);
  move('me-skadar-pelican-kayak', 10, 10, 9, 10);
  move('me-villa-jablan-winery-rvasi', 10, 11, 9, 11);

  // Step 10: Bar/Ulcinj/Ada Bojana → Day 10 (was Day 11).
  move('me-stari-bar', 11, 1, 10, 1);
  move('me-ulcinj-old-town', 11, 2, 10, 2);
  move('me-camp-safari-beach', 11, 3, 10, 3);
  move('me-ada-bojana-beach', 11, 4, 10, 4);
  move('me-misko-stilt-restaurant', 11, 5, 10, 5);

  // Step 11: Sveti Stefan/Kotor/Trebinje → Day 11 (was Day 12).
  move('me-sveti-stefan', 12, 1, 11, 1);
  move('me-budva', 12, 2, 11, 2);
  move('me-kotor', 12, 3, 11, 3);
  move('me-tanjga-kotor', 12, 4, 11, 4);
  move('me-perast', 12, 5, 11, 5);
  move('me-vitaljina-border', 12, 6, 11, 6);
  move('ba-trebinje-old-town', 12, 7, 11, 7);
  move('ba-air-1165836464333612445', 12, 8, 11, 8);

  // Step 12: New Day 12 = Dubrovnik walls (the freed day).
  // Kate Mlini (12,3) was moved in Step 2.
  assign('hr-dubrovnik', 12, 1);
  move('hr-pasjaca-beach', 13, 1, 12, 2);
  // hr-dubrovnik-airport: was at 13,2; close the gap left by Pasjača moving out.
  move('hr-dubrovnik-airport', 13, 2, 13, 1);

  // Step 13: Reorder Day 10 — Camp Safari Beach to order 5 (overnight anchor) so
  // Day 11's morning relocation starts from the campsite, not the dinner restaurant.
  move('me-camp-safari-beach', 10, 3, 10, 5);
  move('me-ada-bojana-beach', 10, 4, 10, 3);
  move('me-misko-stilt-restaurant', 10, 5, 10, 4);

  // Current seed-plan normalization (v4, Jun 12 2026):
  // trim the overpacked mountain/inland tails and keep the baseline aligned with
  // src/defaultPlan.ts for users who already have an older saved override set.
  clear('hr-biokovo-tollroad', 3, 2);
  clear('hr-sveti-jure', 3, 3);
  clear('ba-villa-cold-river-treehouse-bunica', 5, 8);
  clear('ba-villa-cold-river-treehouse-bunica', 6, 8);
  clear('ba-boracko-lake', 6, 2);
  clear('ba-boracko-lake', 7, 2);
  clear('me-durmitor-katun-krstajic', 7, 7);
  clear('me-veliki-medjed', 8, 1);
  clear('me-vrazje-jezero', 8, 2);
  clear('me-tara-bridge-zipline', 8, 5);
  clear('me-durmitor-katun-homeland-nest', 8, 7);
  move('me-zabljak', 8, 3, 8, 2);
  move('me-oro-zabljak', 8, 4, 8, 3);
  move('me-gem-zabljak-mountain-spark', 8, 6, 8, 4);
  move('me-guesthouse-skadar-raicevic', 10, 7, 9, 6);
  move('me-guesthouse-skadar-raicevic', 10, 8, 9, 6);
  move('me-guesthouse-skadar-raicevic', 9, 7, 9, 6);
  clear('me-camp-radoman', 9, 6);
  clear('me-stari-most-rijeka-crnojevica', 9, 8);
  clear('me-skadar-rijeka-crnojevica-kayak', 9, 9);
  clear('me-skadar-pelican-kayak', 9, 10);
  clear('me-villa-jablan-winery-rvasi', 9, 11);

  // Clear any Mljet/island places that leaked to Day 6 (those belong on Day 5 only)
  for (const id of ['hr-mljet-np', 'hr-montokuc-mljet', 'hr-odysseus-cave',
    'hr-camp-marina-mljet', 'hr-camp-lovor-mljet', 'hr-camp-mungos-mljet', 'hr-prapratno-ferry']) {
    if (next[id]?.day === 6) {
      clearSchedule(next, id);
      changed = true;
    }
  }

  // Sarajevo safety net: clear any Sarajevo-area place that leaked to Day 8+
  for (const id of ['ba-air-1542024184506963047', 'ba-gem-sarajevo-biber-deluxe',
    'ba-gem-sarajevo-apartman-emir', 'ba-gem-sarajevo-kapa', 'ba-sarajevo',
    'ba-zuta-tabija', 'ba-sarajevo-petica-ferhatovic', 'ba-cinemas-sloga-latin-night']) {
    if ((next[id]?.day ?? 0) >= 8) {
      clearSchedule(next, id);
      changed = true;
    }
  }

  return { overrides: next, changed };
}

export function loadOverrides(): Overrides {
  try {
    const raw = localStorage.getItem(KEY);
    // On first visit (empty localStorage) seed from the baked default plan so
    // all 4 group members see the pre-populated Itinerary without importing a URL.
    if (raw === null) return normalizeOverrides({ ...DEFAULT_PLAN });
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return normalizeOverrides({ ...DEFAULT_PLAN });
    // Keep user edits stable: once a plan exists, normalize it but do not try to
    // rewrite it back toward the original seed layout.
    return normalizeOverrides(parsed as Overrides);
  } catch {
    return normalizeOverrides({ ...DEFAULT_PLAN });
  }
}

export function saveOverrides(o: Overrides) {
  safeSetItem(KEY, JSON.stringify(normalizeOverrides(o)));
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

function isStatus(x: unknown): x is Status {
  return x === 'candidate' || x === 'shortlist' || x === 'backup' || x === 'rejected';
}

function isCountry(x: unknown): x is Place['country'] {
  return x === 'HR' || x === 'BA' || x === 'ME';
}

function guessCountry(lat: number, lng: number): Place['country'] {
  // Bosnia: inland pocket roughly N of 42.55 and E of 17.0 (Mostar/Konjic).
  if (lat > 42.55 && lng > 17.0 && lng < 19.7) return 'BA';
  // Croatia: coastal strip and the northwest; broadly W/N of the ME line.
  if (lat > 42.6 || lng < 17.5) return 'HR';
  return 'ME';
}

/** Narrow an unknown value to a plausible user Place (defensive against bad imports). */
function normalizeUserPlace(x: unknown): Place | null {
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

  return {
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
}

export function loadUserPlaces(): Place[] {
  try {
    const a = JSON.parse(localStorage.getItem(USER_PLACES_KEY) ?? '[]');
    return Array.isArray(a) ? a.map(normalizeUserPlace).filter(Boolean) as Place[] : [];
  } catch {
    return [];
  }
}

export function saveUserPlaces(places: Place[]): boolean {
  return safeSetItem(USER_PLACES_KEY, JSON.stringify(places));
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
