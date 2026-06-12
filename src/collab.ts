/**
 * Collaboration layer: identity, votes, comments, shared-plan sync, and
 * friend-added-place sync.
 *
 * OFFLINE-FIRST. Everything the UI reads comes from localStorage caches, so the
 * app is fully usable with no signal. Supabase is a best-effort sync on top:
 *   - on load + window focus + after each write we pull the latest and push any
 *     locally-queued writes (a small retry queue for writes made offline);
 *   - every Supabase call is wrapped in try/catch and degrades to the cache.
 *
 * The 406 baked places stay compiled in — this module only touches the small,
 * dynamic shared state (a few KB): votes, comments, plan overrides, and
 * user-added places.
 */
import {
  normalizeOverride,
  safeSetItem,
  type Override,
  type Overrides,
  type PlanOverrideRow,
} from './store';
import { hasSupabase, supabase } from './supabase';
import type { Place } from './types';

// ---- Identity (the 4 friends' names are unknown — free-text, no passwords) ----

const PERSON_KEY = 'balkans-trip-person';

export function loadPerson(): string | null {
  try {
    const v = localStorage.getItem(PERSON_KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

export function savePerson(name: string): void {
  safeSetItem(PERSON_KEY, name.trim());
}

// ---- Types mirroring the Supabase tables ----

/** One person's 👍 (+1) / 👎 (-1) on a place. */
export type VoteValue = 1 | -1;

export interface VoteRow {
  place_id: string;
  person: string;
  vote: VoteValue;
  updated_at: string;
}

export interface CommentRow {
  /** uuid from the server, or a local `local-<ts>-<rand>` id before it syncs. */
  id: string;
  place_id: string;
  person: string;
  body: string;
  created_at: string;
}

/** A friend-added place row: the full Place lives in `data`. */
export interface UserPlaceRow {
  id: string;
  data: Place;
  added_by: string | null;
  created_at: string;
}

// ---- Local caches (the UI reads these, so it works offline) ----

const VOTES_CACHE = 'balkans-trip-votes-cache';
const COMMENTS_CACHE = 'balkans-trip-comments-cache';
const REMOTE_PLACES_CACHE = 'balkans-trip-remote-places-cache';

// ---- Write retry queues (writes made while offline) ----

const VOTE_QUEUE = 'balkans-trip-vote-queue';
const COMMENT_QUEUE = 'balkans-trip-comment-queue';
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

export function loadVotesCache(): VoteRow[] {
  const a = loadJson<VoteRow[]>(VOTES_CACHE, []);
  return Array.isArray(a) ? a : [];
}
export function loadCommentsCache(): CommentRow[] {
  const a = loadJson<CommentRow[]>(COMMENTS_CACHE, []);
  return Array.isArray(a) ? a : [];
}
export function loadRemotePlacesCache(): Place[] {
  const a = loadJson<Place[]>(REMOTE_PLACES_CACHE, []);
  return Array.isArray(a) ? a : [];
}

function saveVotesCache(v: VoteRow[]) {
  safeSetItem(VOTES_CACHE, JSON.stringify(v));
}
function saveCommentsCache(c: CommentRow[]) {
  safeSetItem(COMMENTS_CACHE, JSON.stringify(c));
}
function saveRemotePlacesCache(p: Place[]) {
  safeSetItem(REMOTE_PLACES_CACHE, JSON.stringify(p));
}

// ---- Vote cache helpers (the cache is the source of truth for the UI) ----

/** Upsert a vote into the cache (one per person+place). */
function upsertVoteLocal(cache: VoteRow[], row: VoteRow): VoteRow[] {
  const next = cache.filter((v) => !(v.place_id === row.place_id && v.person === row.person));
  next.push(row);
  return next;
}
/** Remove a vote (toggle-off). */
function removeVoteLocal(cache: VoteRow[], placeId: string, person: string): VoteRow[] {
  return cache.filter((v) => !(v.place_id === placeId && v.person === person));
}

/** Merge a freshly-fetched server snapshot over the cache (server wins per key). */
function mergeVotes(serverRows: VoteRow[]): VoteRow[] {
  // Server is authoritative for any (place,person) it returns. Any pending
  // queued local change is re-applied on top by flushVoteQueue afterward.
  return serverRows;
}

// ---- Queue helpers ----

interface QueuedVote {
  place_id: string;
  person: string;
  /** null = delete (toggle-off), otherwise the vote value. */
  vote: VoteValue | null;
}

function loadVoteQueue(): QueuedVote[] {
  return loadJson<QueuedVote[]>(VOTE_QUEUE, []);
}
function saveVoteQueue(q: QueuedVote[]) {
  safeSetItem(VOTE_QUEUE, JSON.stringify(q));
}
function enqueueVote(item: QueuedVote) {
  // Collapse to one pending op per (place,person): the latest intent wins.
  const q = loadVoteQueue().filter(
    (x) => !(x.place_id === item.place_id && x.person === item.person),
  );
  q.push(item);
  saveVoteQueue(q);
}

function loadCommentQueue(): CommentRow[] {
  return loadJson<CommentRow[]>(COMMENT_QUEUE, []);
}
function saveCommentQueue(q: CommentRow[]) {
  safeSetItem(COMMENT_QUEUE, JSON.stringify(q));
}

function loadPlaceQueue(): UserPlaceRow[] {
  return loadJson<UserPlaceRow[]>(PLACE_QUEUE, []);
}
function savePlaceQueue(q: UserPlaceRow[]) {
  safeSetItem(PLACE_QUEUE, JSON.stringify(q));
}

interface QueuedPlanOverride {
  place_id: string;
  data: Override | null;
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

// ---- Public mutation API (optimistic: update cache + queue, then sync) ----

/**
 * Cast/toggle a vote. Returns the new cache immediately (optimistic). The
 * caller re-renders from this; the network push happens in the background.
 */
export function castVoteLocal(
  cache: VoteRow[],
  placeId: string,
  person: string,
  vote: VoteValue,
): { cache: VoteRow[]; cleared: boolean } {
  const existing = cache.find((v) => v.place_id === placeId && v.person === person);
  const now = new Date().toISOString();
  if (existing && existing.vote === vote) {
    // Re-tapping the same vote toggles it off.
    enqueueVote({ place_id: placeId, person, vote: null });
    const next = removeVoteLocal(cache, placeId, person);
    saveVotesCache(next);
    return { cache: next, cleared: true };
  }
  enqueueVote({ place_id: placeId, person, vote });
  const next = upsertVoteLocal(cache, { place_id: placeId, person, vote, updated_at: now });
  saveVotesCache(next);
  return { cache: next, cleared: false };
}

/** Append a comment (optimistic). Gets a local id until the server assigns one. */
export function addCommentLocal(
  cache: CommentRow[],
  placeId: string,
  person: string,
  body: string,
): { cache: CommentRow[]; row: CommentRow } {
  const row: CommentRow = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    place_id: placeId,
    person,
    body: body.trim(),
    created_at: new Date().toISOString(),
  };
  const next = [...cache, row];
  saveCommentsCache(next);
  const q = loadCommentQueue();
  q.push(row);
  saveCommentQueue(q);
  return { cache: next, row };
}

/**
 * Enqueue a friend-added place for upsert to user_places, and cache it so the
 * other phones' merge picks it up even before this device next syncs.
 */
export function pushUserPlace(place: Place, person: string | null): void {
  const row: UserPlaceRow = {
    id: place.id,
    data: place,
    added_by: person,
    created_at: new Date().toISOString(),
  };
  const q = loadPlaceQueue().filter((x) => x.id !== row.id);
  q.push(row);
  savePlaceQueue(q);
  // Reflect into the remote-places cache immediately (so a local reload merges it).
  const cached = loadRemotePlacesCache().filter((p) => p.id !== place.id);
  cached.push(place);
  saveRemotePlacesCache(cached);
}

/**
 * Queue plan overrides for remote sync. The queue stores the latest full
 * override object for each place so independent edits on different stops can
 * merge without a full-plan overwrite.
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

// ---- Sync: pull latest from Supabase, push the queues. All best-effort. ----

let syncing = false;

export interface SyncResult {
  votes: VoteRow[];
  comments: CommentRow[];
  remotePlaces: Place[];
  planRows: PlanOverrideRow[];
  /** True when we actually reached the server this run. */
  online: boolean;
}

/**
 * One sync pass. Pushes queued writes, then pulls the latest snapshot. On ANY
 * failure (no creds, offline, missing tables) it returns the local caches and
 * `online: false` — the app keeps working. Concurrency-guarded so overlapping
 * focus/load/post triggers don't stampede.
 */
export async function syncCollab(): Promise<SyncResult> {
  const local: SyncResult = {
    votes: loadVotesCache(),
    comments: loadCommentsCache(),
    remotePlaces: loadRemotePlacesCache(),
    planRows: loadPlanQueue().map(planRowFromQueue),
    online: false,
  };
  if (!hasSupabase || !supabase || syncing) return local;
  syncing = true;
  try {
    // 1. Flush queued writes first so our pull reflects them.
    await flushVoteQueue();
    await flushCommentQueue();
    await flushPlaceQueue();
    await flushPlanQueue();

    // 2. Pull the latest snapshots.
    const [votes, comments, places, planRows] = await Promise.all([
      pullVotes(),
      pullComments(),
      pullUserPlaces(),
      pullPlanOverrides(),
    ]);
    const queuedPlanRows = loadPlanQueue().map(planRowFromQueue);
    const effectivePlanRows = mergePlanRows(planRows ?? [], queuedPlanRows);

    return {
      votes: votes ?? local.votes,
      comments: comments ?? local.comments,
      remotePlaces: places ?? local.remotePlaces,
      planRows: effectivePlanRows,
      online: votes != null || comments != null || places != null || planRows != null,
    };
  } catch (e) {
    console.warn('[collab] sync failed — using local cache', e);
    return local;
  } finally {
    syncing = false;
  }
}

async function pullVotes(): Promise<VoteRow[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('votes')
      .select('place_id, person, vote, updated_at');
    if (error) {
      console.warn('[collab] votes fetch error (table missing? offline?) — local cache', error.message);
      return null;
    }
    const rows = (data ?? []) as VoteRow[];
    const merged = mergeVotes(rows);
    // Re-apply any still-pending queued local intents on top (so an offline vote
    // we haven't pushed yet isn't visually reverted by the pull).
    const queued = loadVoteQueue();
    let out = merged;
    for (const q of queued) {
      if (q.vote == null) out = removeVoteLocal(out, q.place_id, q.person);
      else
        out = upsertVoteLocal(out, {
          place_id: q.place_id,
          person: q.person,
          vote: q.vote,
          updated_at: new Date().toISOString(),
        });
    }
    saveVotesCache(out);
    return out;
  } catch (e) {
    console.warn('[collab] votes fetch threw — local cache', e);
    return null;
  }
}

async function pullComments(): Promise<CommentRow[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('id, place_id, person, body, created_at')
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('[collab] comments fetch error — local cache', error.message);
      return null;
    }
    const server = (data ?? []) as CommentRow[];
    // Keep any local-only (not-yet-synced) comments on top of the server set.
    const pending = loadCommentQueue();
    const pendingIds = new Set(pending.map((c) => c.id));
    const out = [...server, ...pending.filter((c) => pendingIds.has(c.id))];
    saveCommentsCache(out);
    return out;
  } catch (e) {
    console.warn('[collab] comments fetch threw — local cache', e);
    return null;
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
    const places = rows.map((r) => r.data).filter((p): p is Place => !!p && typeof p.id === 'string');
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

async function flushVoteQueue(): Promise<void> {
  if (!supabase) return;
  const q = loadVoteQueue();
  if (q.length === 0) return;
  const remaining: QueuedVote[] = [];
  for (const item of q) {
    try {
      if (item.vote == null) {
        const { error } = await supabase
          .from('votes')
          .delete()
          .eq('place_id', item.place_id)
          .eq('person', item.person);
        if (error) {
          remaining.push(item);
        }
      } else {
        const { error } = await supabase.from('votes').upsert(
          {
            place_id: item.place_id,
            person: item.person,
            vote: item.vote,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'place_id,person' },
        );
        if (error) remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }
  saveVoteQueue(remaining);
}

async function flushCommentQueue(): Promise<void> {
  if (!supabase) return;
  const q = loadCommentQueue();
  if (q.length === 0) return;
  const remaining: CommentRow[] = [];
  for (const c of q) {
    try {
      // Let the server assign the real uuid + created_at; send only the content.
      const { error } = await supabase
        .from('comments')
        .insert({ place_id: c.place_id, person: c.person, body: c.body });
      if (error) remaining.push(c);
    } catch {
      remaining.push(c);
    }
  }
  saveCommentQueue(remaining);
  // Successfully-sent local comments will reappear (with server ids) on the next
  // pull; drop their local twins from the comments cache to avoid duplicates.
  if (remaining.length < q.length) {
    const sentBodies = new Set(
      q.filter((c) => !remaining.includes(c)).map((c) => `${c.place_id}|${c.person}|${c.body}`),
    );
    const cache = loadCommentsCache().filter(
      (c) => !(c.id.startsWith('local-') && sentBodies.has(`${c.place_id}|${c.person}|${c.body}`)),
    );
    saveCommentsCache(cache);
  }
}

async function flushPlaceQueue(): Promise<void> {
  if (!supabase) return;
  const q = loadPlaceQueue();
  if (q.length === 0) return;
  const remaining: UserPlaceRow[] = [];
  for (const row of q) {
    try {
      const { error } = await supabase
        .from('user_places')
        .upsert(
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
      if (error) {
        // keep it queued
      } else {
        succeeded.push(item);
      }
    } catch {
      // keep it queued
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

function mergePlanRows(serverRows: PlanOverrideRow[], queuedRows: PlanOverrideRow[]): PlanOverrideRow[] {
  const byId = new Map<string, PlanOverrideRow>();
  for (const row of serverRows) byId.set(row.place_id, row);
  for (const row of queuedRows) byId.set(row.place_id, row);
  return [...byId.values()];
}

// ---- Derived tallies (pure, computed from the votes cache) ----

export interface Tally {
  up: number;
  down: number;
  net: number;
  upPeople: string[];
  downPeople: string[];
}

/** Build a per-place tally map from the votes cache. */
export function buildTallies(votes: VoteRow[]): Map<string, Tally> {
  const m = new Map<string, Tally>();
  for (const v of votes) {
    let t = m.get(v.place_id);
    if (!t) {
      t = { up: 0, down: 0, net: 0, upPeople: [], downPeople: [] };
      m.set(v.place_id, t);
    }
    if (v.vote === 1) {
      t.up++;
      t.upPeople.push(v.person);
    } else {
      t.down++;
      t.downPeople.push(v.person);
    }
    t.net = t.up - t.down;
  }
  return m;
}

/** This person's current vote on a place (or 0 if none). */
export function myVote(votes: VoteRow[], placeId: string, person: string | null): VoteValue | 0 {
  if (!person) return 0;
  const v = votes.find((x) => x.place_id === placeId && x.person === person);
  return v ? v.vote : 0;
}
