/**
 * Collaboration layer for the shared trip state.
 *
 * Keeps just the pieces the app still uses:
 * - user-added places
 * - shared plan overrides
 *
 * Everything is best-effort and offline-first. If Supabase is unavailable, the
 * localStorage caches remain the source of truth for this device.
 */
import { normalizeOverride, normalizeUserPlace, safeSetItem, type Override, type Overrides, type PlanOverrideRow } from './store';
import { hasSupabase, supabase } from './supabase';
import type { Place } from './types';

const REMOTE_PLACES_CACHE = 'balkans-trip-remote-places-cache';
const PLACE_QUEUE = 'balkans-trip-place-queue';
const PLAN_QUEUE = 'balkans-trip-plan-queue';

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadRemotePlacesCache(): Place[] {
  const a = loadJson<Place[]>(REMOTE_PLACES_CACHE, []);
  return Array.isArray(a) ? a : [];
}

function saveRemotePlacesCache(p: Place[]) {
  safeSetItem(REMOTE_PLACES_CACHE, JSON.stringify(p));
}

export interface UserPlaceRow {
  id: string;
  data: Place;
  added_by: string | null;
  created_at: string;
}

interface QueuedPlanOverride {
  place_id: string;
  data: Override | null;
}

function loadPlaceQueue(): UserPlaceRow[] {
  return loadJson<UserPlaceRow[]>(PLACE_QUEUE, []);
}

function savePlaceQueue(q: UserPlaceRow[]) {
  safeSetItem(PLACE_QUEUE, JSON.stringify(q));
}

function loadPlanQueue(): QueuedPlanOverride[] {
  return loadJson<QueuedPlanOverride[]>(PLAN_QUEUE, []);
}

function savePlanQueue(q: QueuedPlanOverride[]) {
  safeSetItem(PLAN_QUEUE, JSON.stringify(q));
}

function overrideEqual(a: Override | null | undefined, b: Override | null | undefined): boolean {
  const normA = normalizeOverride(a);
  const normB = normalizeOverride(b);
  return JSON.stringify(normA) === JSON.stringify(normB);
}

function planRowFromQueue(item: QueuedPlanOverride): PlanOverrideRow {
  const data = normalizeOverride(item.data);
  return {
    place_id: item.place_id,
    data,
    cleared: data == null,
    updated_at: new Date().toISOString(),
  };
}

function mergePlanRows(serverRows: PlanOverrideRow[], queuedRows: PlanOverrideRow[]): PlanOverrideRow[] {
  const byId = new Map<string, PlanOverrideRow>();
  for (const row of serverRows) byId.set(row.place_id, row);
  for (const row of queuedRows) byId.set(row.place_id, row);
  return [...byId.values()];
}

/**
 * Enqueue a friend-added place for upsert to user_places, and reflect it into
 * the local cache immediately so the UI can use it right away.
 */
export function pushUserPlace(place: Place): void {
  const row: UserPlaceRow = {
    id: place.id,
    data: place,
    added_by: null,
    created_at: new Date().toISOString(),
  };
  const q = loadPlaceQueue().filter((x) => x.id !== row.id);
  q.push(row);
  savePlaceQueue(q);
  const cached = loadRemotePlacesCache().filter((p) => p.id !== place.id);
  cached.push(place);
  saveRemotePlacesCache(cached);
}

/**
 * Queue plan overrides for remote sync. The queue stores the latest full
 * override object for each place so independent edits can merge.
 */
export function queuePlanOverrideSync(prev: Overrides, next: Overrides): void {
  const before = prev;
  const after = next;
  const queue = loadPlanQueue();
  const byId = new Map(queue.map((item) => [item.place_id, item]));
  const ids = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const id of ids) {
    if (overrideEqual(before[id], after[id])) continue;
    byId.set(id, { place_id: id, data: normalizeOverride(after[id]) });
  }
  savePlanQueue([...byId.values()]);
}

export interface SyncResult {
  remotePlaces: Place[];
  planRows: PlanOverrideRow[];
  online: boolean;
}

let syncing = false;

export async function syncCollab(): Promise<SyncResult> {
  const local: SyncResult = {
    remotePlaces: loadRemotePlacesCache(),
    planRows: loadPlanQueue().map(planRowFromQueue),
    online: false,
  };
  if (!hasSupabase || !supabase || syncing) return local;
  syncing = true;
  try {
    await flushPlaceQueue();
    await flushPlanQueue();

    const [places, planRows] = await Promise.all([pullUserPlaces(), pullPlanOverrides()]);
    const queuedPlanRows = loadPlanQueue().map(planRowFromQueue);
    const effectivePlanRows = mergePlanRows(planRows ?? [], queuedPlanRows);

    return {
      remotePlaces: places ?? local.remotePlaces,
      planRows: effectivePlanRows,
      online: places != null || planRows != null,
    };
  } catch (e) {
    console.warn('[collab] sync failed — using local cache', e);
    return local;
  } finally {
    syncing = false;
  }
}

async function pullUserPlaces(): Promise<Place[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('user_places').select('id, data, added_by, created_at');
    if (error) {
      console.warn('[collab] user_places fetch error — local cache', error.message);
      return null;
    }
    const rows = (data ?? []) as UserPlaceRow[];
    // Normalize remote pins the same as local ones (drains "candidate" → extra/backup,
    // fills defaults) so the status model is consistent regardless of sync path.
    const places = rows.map((r) => normalizeUserPlace(r.data)).filter((p): p is Place => !!p);
    saveRemotePlacesCache(places);
    return places;
  } catch (e) {
    console.warn('[collab] user_places fetch threw — local cache', e);
    return null;
  }
}

async function pullPlanOverrides(): Promise<PlanOverrideRow[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('plan_overrides')
      .select('place_id, data, cleared, updated_at');
    if (error) {
      console.warn('[collab] plan_overrides fetch error — local cache', error.message);
      return null;
    }
    const rows = ((data ?? []) as PlanOverrideRow[]).map((row) => ({
      ...row,
      data: normalizeOverride(row.data),
    }));
    rows.sort((a, b) => a.updated_at.localeCompare(b.updated_at) || a.place_id.localeCompare(b.place_id));
    return rows;
  } catch (e) {
    console.warn('[collab] plan_overrides fetch threw — local cache', e);
    return null;
  }
}

async function flushPlaceQueue(): Promise<void> {
  if (!supabase) return;
  const q = loadPlaceQueue();
  if (q.length === 0) return;
  const remaining: UserPlaceRow[] = [];
  for (const row of q) {
    try {
      const { error } = await supabase.from('user_places').upsert(
        { id: row.id, data: row.data, added_by: row.added_by },
        { onConflict: 'id' },
      );
      if (error) remaining.push(row);
    } catch {
      remaining.push(row);
    }
  }
  savePlaceQueue(remaining);
}

async function flushPlanQueue(): Promise<void> {
  if (!supabase) return;
  const q = loadPlanQueue();
  if (q.length === 0) return;
  const succeeded: QueuedPlanOverride[] = [];
  for (const item of q) {
    try {
      const { error } = await supabase.from('plan_overrides').upsert(
        {
          place_id: item.place_id,
          data: item.data,
          cleared: item.data == null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'place_id' },
      );
      if (!error) succeeded.push(item);
    } catch {
      // keep queued
    }
  }
  if (succeeded.length === 0) return;
  const current = loadPlanQueue();
  const remaining = current.filter(
    (item) =>
      !succeeded.some((done) => done.place_id === item.place_id && overrideEqual(done.data, item.data)),
  );
  savePlanQueue(remaining);
}
