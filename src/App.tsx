import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import AddPlace, { type DraftPlace } from './components/AddPlace';
import CorridorPanel, { type CorridorMatch } from './components/CorridorPanel';
import DetailPanel from './components/DetailPanel';
import Essentials from './components/Essentials';
import Itinerary from './components/Itinerary';
import Review from './components/Review';
import RouteBuilder from './components/RouteBuilder';
import { ImportPrompt, ShareButton } from './components/SharePlan';
import Today, { type ProximityMatch } from './components/Today';
import WhoAreYou from './components/WhoAreYou';
import {
  addCommentLocal,
  buildTallies,
  castVoteLocal,
  loadCommentsCache,
  loadPerson,
  loadRemotePlacesCache,
  loadVotesCache,
  myVote as myVoteFor,
  pushUserPlace,
  savePerson,
  syncCollab,
  type CommentRow,
  type VoteRow,
  type VoteValue,
} from './collab';
import {
  CATEGORIES,
  CATEGORY_COLORS,
  COUNTRIES,
  COUNTRY_NAMES,
  STATUSES,
  toggle,
} from './constants';
import { bookingFor, type SourceLink } from './links';
import { fetchRoute, fetchTable, fetchTrip, routeKey, type LatLng } from './osrm';
import { solveOrder, type SolveResult } from './solver';
import { buildGpx, buildKml, downloadText } from './exports';
import {
  decodePlan,
  encodePlan,
  ferryPairKey,
  loadDone,
  loadFerryHours,
  loadLastFix,
  loadOverrides,
  loadPlaces,
  loadRouteCache,
  loadSavedMode,
  loadTripCache,
  loadUserPlaces,
  saveDone,
  saveFerryHours,
  saveLastFix,
  saveMode,
  saveOverrides,
  saveRouteCache,
  saveTripCache,
  saveUserPlaces,
  type FerryHours,
  type GpsFix,
  type Mode,
  type Overrides,
  type PlaceWithOverride,
  type SharedPlan,
  type TripResult,
} from './store';
import {
  currentTripDay,
  dayColor,
  haversineKm,
  isDuringTrip,
  nearestLegIndex,
  pointToPolylineKm,
  splitIntoDays,
} from './trip';
import type { Category, Country, Place, Status } from './types';
import { useDayRoutes } from './useDayRoutes';

type View = 'places' | 'itinerary' | 'route' | 'review';

// Categories that count as a place to sleep, for the nearby finder.
const SLEEP_CATEGORIES: Category[] = ['campsite', 'accommodation'];

// Sightseeing categories for the trip-mode "Near me" finder.
const SIGHT_CATEGORIES: Category[] = ['sight', 'viewpoint', 'beach', 'hike', 'activity', 'nature'];

const SLEEP_TONIGHT_KM = 25;
const NEAR_ME_KM = 30;

// One-tap quick filters: the common planning flows must be 1–2 taps.
// (Trip mode has its own one-tap finders: 🛏 Sleep tonight / 📍 Near me.)
const NON_REJECTED: Status[] = ['candidate', 'shortlist', 'backup'];
// Vote-derived filters turn the group's 👍/👎 into decisions:
//  - 'favorites' = clear group wins (net ≥ +2, or all-positive with ≥2 votes)
//  - 'split'     = has BOTH up and down votes → needs discussion
type VoteFilter = 'all' | 'favorites' | 'split';
interface FilterPreset {
  id: string;
  label: string;
  title: string;
  categories?: Category[];
  statuses?: Status[];
  /** A vote-derived filter applied on top of category/status. */
  vote?: VoteFilter;
}
const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'sleep',
    label: '🛏 Sleep spots',
    title: 'Campsites + stays, every non-rejected option',
    categories: SLEEP_CATEGORIES,
    statuses: NON_REJECTED,
  },
  {
    id: 'shortlist',
    label: '⭐ Shortlist',
    title: 'Only shortlisted places, all categories',
    statuses: ['shortlist'],
  },
  {
    id: 'dosee',
    label: '🥾 Do & see',
    title: 'Hikes, activities, beaches, nature, viewpoints, sights',
    categories: SIGHT_CATEGORIES,
  },
  {
    id: 'favorites',
    label: '⭐ Group favorites',
    title: 'Clear group wins: net 👍 ≥ +2 (or all-positive with 2+ votes), any status',
    categories: CATEGORIES,
    statuses: NON_REJECTED,
    vote: 'favorites',
  },
  {
    id: 'split',
    label: '⚖️ Split',
    title: 'Both 👍 and 👎 — needs a group discussion',
    categories: CATEGORIES,
    statuses: NON_REJECTED,
    vote: 'split',
  },
  {
    id: 'reset',
    label: '↺ All',
    title: 'Back to the default view (all categories, shortlist + backup)',
    categories: CATEGORIES,
    statuses: ['shortlist', 'backup'],
  },
];

/** A place qualifies as a group favorite: net ≥ +2, or all-positive with ≥2 votes. */
function isFavorite(t: { up: number; down: number; net: number } | undefined): boolean {
  if (!t) return false;
  return t.net >= 2 || (t.down === 0 && t.up >= 2);
}
/** A split: both an up and a down vote → contested. */
function isSplit(t: { up: number; down: number } | undefined): boolean {
  return !!t && t.up > 0 && t.down > 0;
}

const byOrder = (a: PlaceWithOverride, b: PlaceWithOverride) =>
  (a.dayOrder ?? 0) - (b.dayOrder ?? 0) || a.name.localeCompare(b.name);

// Phone-width breakpoint — must match the ≤760px media query in styles.css
// (the width at which the sidebar becomes a full-screen drawer and the detail
// panel becomes a bottom sheet).
const NARROW_PX = 760;
const isNarrow = () =>
  typeof window !== 'undefined' && window.matchMedia(`(max-width: ${NARROW_PX}px)`).matches;

/** Convert OSRM [lng, lat][] geometry to Leaflet [lat, lng][]. */
function toLatLngs(coords: [number, number][]): [number, number][] {
  return coords.map(([lng, lat]) => [lat, lng]);
}

/**
 * Slice the geometry vertices belonging to one stop→stop leg, using the
 * snapped waypoint locations OSRM returned (both arrays are [lng, lat]).
 */
function sliceLegCoords(
  coords: [number, number][],
  snapped: [number, number][],
  leg: number,
): [number, number][] {
  const nearestIdx = (pt: [number, number]) => {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const dx = coords[i][0] - pt[0];
      const dy = coords[i][1] - pt[1];
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  };
  const a = nearestIdx(snapped[leg]);
  const b = nearestIdx(snapped[leg + 1]);
  return coords.slice(Math.min(a, b), Math.max(a, b) + 1);
}

function FlyTo({ placeId, lat, lng }: { placeId: string | null; lat?: number; lng?: number }) {
  const map = useMap();
  useEffect(() => {
    if (placeId && lat != null && lng != null) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 11), { duration: 0.8 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId]);
  return null;
}

function FitBounds({ pts, nonce }: { pts: [number, number][]; nonce: number }) {
  const map = useMap();
  useEffect(() => {
    if (nonce > 0 && pts.length > 0) {
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);
  return null;
}

function HashSync() {
  const map = useMap();
  useEffect(() => {
    const m = location.hash.match(/#(-?\d+\.?\d*)\/(-?\d+\.?\d*)\/(\d+)/);
    if (m) map.setView([parseFloat(m[1]), parseFloat(m[2])], parseInt(m[3], 10));
    const onMove = () => {
      const c = map.getCenter();
      location.replace(`#${c.lat.toFixed(4)}/${c.lng.toFixed(4)}/${map.getZoom()}`);
    };
    map.on('moveend', onMove);
    return () => {
      map.off('moveend', onMove);
    };
  }, [map]);
  return null;
}

/** Captures map clicks while the Add-place form is open (feature A, mode 1). */
function MapTapCapture({ active, onTap }: { active: boolean; onTap: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (active) onTap(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function numberIcon(n: number, color: string) {
  return L.divIcon({
    className: 'num-marker',
    html: `<div style="background:${color}">${n}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

/** A small 👍/👎 tally badge anchored to the top-right of a pin. */
function voteBadgeIcon(up: number, down: number) {
  const parts: string[] = [];
  if (up > 0) parts.push(`<span class="vb-up">👍${up}</span>`);
  if (down > 0) parts.push(`<span class="vb-down">👎${down}</span>`);
  return L.divIcon({
    className: 'vote-badge',
    html: `<div class="vote-badge-inner">${parts.join('')}</div>`,
    iconSize: [1, 1],
    iconAnchor: [-8, 18],
  });
}

export default function App() {
  // User-added places (feature A) merge AFTER the bundle so the existing
  // "first id wins" de-dupe protects against a user id colliding with a baked
  // one. Everything downstream (map, filters, route builder, finders, exports)
  // treats them as ordinary places.
  const [userPlaces, setUserPlaces] = useState<Place[]>(loadUserPlaces);
  // ---- Collaboration layer (votes / comments / friend-added-place sync) ----
  // Remote user places (added on other phones) merge in too; everything reads
  // from localStorage caches first, so the app is fully usable offline.
  const [person, setPerson] = useState<string | null>(loadPerson);
  const [remotePlaces, setRemotePlaces] = useState<Place[]>(loadRemotePlacesCache);
  const [votes, setVotes] = useState<VoteRow[]>(loadVotesCache);
  const [comments, setComments] = useState<CommentRow[]>(loadCommentsCache);
  // whoOpen drives the "Who are you?" prompt (first use + later edits). reason
  // 'firstUse' has no Cancel (we want a name to vote with).
  const [whoOpen, setWhoOpen] = useState<'firstUse' | 'edit' | null>(null);
  // Merge baked → local user places → remote user places (first id wins, so a
  // local edit of a place I added shadows the remote copy until it syncs).
  const basePlaces = useMemo<Place[]>(() => {
    const localIds = new Set(userPlaces.map((p) => p.id));
    const remoteOnly = remotePlaces.filter((p) => !localIds.has(p.id));
    return [...loadPlaces(), ...userPlaces, ...remoteOnly];
  }, [userPlaces, remotePlaces]);

  // Vote tallies + comments keyed by place id, recomputed when the caches change.
  const tallies = useMemo(() => buildTallies(votes), [votes]);

  /** Pull the latest collab state from Supabase (best-effort; degrades to cache). */
  const runSync = useRef(async () => {});
  runSync.current = async () => {
    const res = await syncCollab();
    setVotes(res.votes);
    setComments(res.comments);
    setRemotePlaces(res.remotePlaces);
  };

  // Sync on load and whenever the window regains focus (cheap, best-effort).
  useEffect(() => {
    void runSync.current();
    const onFocus = () => void runSync.current();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // First-use identity prompt (only if no name yet).
  useEffect(() => {
    if (!person) setWhoOpen('firstUse');
  }, [person]);

  function saveName(name: string) {
    savePerson(name);
    setPerson(name);
    setWhoOpen(null);
  }

  function castVote(placeId: string, vote: VoteValue) {
    if (!person) {
      setWhoOpen('firstUse');
      return;
    }
    const { cache } = castVoteLocal(votes, placeId, person, vote);
    setVotes(cache); // optimistic
    void runSync.current(); // push + refresh in the background
  }

  function addComment(placeId: string, body: string) {
    if (!person) {
      setWhoOpen('firstUse');
      return;
    }
    const { cache } = addCommentLocal(comments, placeId, person, body);
    setComments(cache); // optimistic
    void runSync.current();
  }
  const [overrides, setOverrides] = useState<Overrides>(loadOverrides);
  const places = useMemo<PlaceWithOverride[]>(
    () => basePlaces.map((p) => ({ ...p, ...overrides[p.id] })),
    [basePlaces, overrides],
  );
  const placeById = useMemo(() => {
    const m = new Map<string, PlaceWithOverride>();
    for (const p of places) m.set(p.id, p);
    return m;
  }, [places]);

  // Booking-type link per place (sources never change at runtime — overrides
  // don't touch them), so the list rows can offer "book" one tap away.
  const bookingById = useMemo(() => {
    const m = new Map<string, SourceLink>();
    for (const p of basePlaces) {
      const b = bookingFor(p.sources);
      if (b) m.set(p.id, b);
    }
    return m;
  }, [basePlaces]);

  const [countryFilter, setCountryFilter] = useState<Set<Country>>(new Set(COUNTRIES));
  const [categoryFilter, setCategoryFilter] = useState<Set<Category>>(new Set(CATEGORIES));
  // Planning default: the plan you care about (shortlist+backup) — the candidate
  // haystack is one tap away on the status chips.
  const [statusFilter, setStatusFilter] = useState<Set<Status>>(
    new Set<Status>(['shortlist', 'backup']),
  );
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set());
  const [voteFilter, setVoteFilter] = useState<VoteFilter>('all');
  const [search, setSearch] = useState('');

  // One-tap filter presets (filtering-convenience: common flows in 1–2 taps).
  const setEq = <T,>(set: Set<T>, arr: readonly T[]) =>
    set.size === arr.length && arr.every((x) => set.has(x));
  function applyPreset(pr: FilterPreset) {
    setCategoryFilter(new Set(pr.categories ?? CATEGORIES));
    setStatusFilter(new Set(pr.statuses ?? NON_REJECTED));
    setTagFilter(new Set());
    setVoteFilter(pr.vote ?? 'all');
  }
  const presetActive = (pr: FilterPreset) =>
    setEq(categoryFilter, pr.categories ?? CATEGORIES) &&
    setEq(statusFilter, pr.statuses ?? NON_REJECTED) &&
    tagFilter.size === 0 &&
    voteFilter === (pr.vote ?? 'all');

  // How many advanced filters are narrowing the view (for the disclosure label).
  const advancedFilterCount =
    (countryFilter.size < COUNTRIES.length ? 1 : 0) +
    (categoryFilter.size < CATEGORIES.length ? 1 : 0) +
    (statusFilter.size < STATUSES.length ? 1 : 0) +
    (tagFilter.size > 0 ? 1 : 0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>('places');
  const [fitNonce, setFitNonce] = useState(0);

  // ---- Planning mode vs Trip mode ----
  // Trip mode is the on-the-road UI: today-centric, no research machinery.
  // ?mode=trip|planning overrides (handy for sharing/testing).
  const [mode, setModeState] = useState<Mode>(() => {
    const urlMode = new URLSearchParams(location.search).get('mode');
    if (urlMode === 'trip' || urlMode === 'planning') return urlMode;
    return loadSavedMode() ?? (isDuringTrip() ? 'trip' : 'planning');
  });
  const [sidebarOpen, setSidebarOpen] = useState(mode === 'trip');
  // On phones the open sidebar fills the screen and would cover the detail
  // bottom-sheet, so selecting a place auto-collapses it; we remember whether
  // it was open so closing the sheet restores the list.
  const reopenSidebarOnClose = useRef(false);
  const [tripDay, setTripDay] = useState(currentTripDay());
  const [doneIds, setDoneIds] = useState<Record<string, boolean>>(loadDone);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [nearOpen, setNearOpen] = useState(false);
  const [undoToast, setUndoToast] = useState<{ label: string; undo: () => void } | null>(null);

  // ---- Add place (feature A) ----
  // addPlaceOpen drives both the form and the tap-the-map capture. editingId is
  // set when editing an existing user place. tappedPoint is the last map tap.
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tappedPoint, setTappedPoint] = useState<{ lat: number; lng: number } | null>(null);

  // ---- Offline Essentials (feature B5) ----
  const [essentialsOpen, setEssentialsOpen] = useState(false);

  // ---- Share plan import prompt (feature B1) ----
  const [importPlan, setImportPlan] = useState<SharedPlan | null>(null);

  // GPS "you are here" (last fix cached so a cold start still shows a dot)
  const [gpsFix, setGpsFix] = useState<GpsFix | null>(loadLastFix);
  const mapRef = useRef<L.Map | null>(null);
  const watchRef = useRef<number | null>(null);

  function setMode(m: Mode) {
    setModeState(m);
    saveMode(m);
    if (m === 'trip') {
      setTripDay(currentTripDay());
      setSidebarOpen(true);
    }
    setCorridor(null);
    setSleepOpen(false);
    setNearOpen(false);
  }

  useEffect(() => {
    document.body.classList.toggle('trip-mode', mode === 'trip');
  }, [mode]);

  // Auto-dismiss the undo toast.
  useEffect(() => {
    if (!undoToast) return;
    const t = setTimeout(() => setUndoToast(null), 6000);
    return () => clearTimeout(t);
  }, [undoToast]);

  // Stop watching GPS on unmount.
  useEffect(
    () => () => {
      if (watchRef.current != null) navigator.geolocation?.clearWatch(watchRef.current);
    },
    [],
  );

  // Nearby finder
  const [nearbyActive, setNearbyActive] = useState(false);
  const [nearbyRadius, setNearbyRadius] = useState(15);

  // Corridor finder (sleep along a built route)
  const [corridor, setCorridor] = useState<{
    coords: [number, number][];
    stops: PlaceWithOverride[];
    label: string;
  } | null>(null);
  const [corridorRadius, setCorridorRadius] = useState(10);

  // Route builder
  const [rbSelected, setRbSelected] = useState<Set<string>>(new Set());
  const [rbStart, setRbStart] = useState<string | null>(null);
  const [rbEnd, setRbEnd] = useState<string | null>(null);
  const [rbAnchors, setRbAnchors] = useState<string[]>([]); // ordered pinned stops
  const [rbTrip, setRbTrip] = useState<TripResult | null>(null);
  const [rbInputIds, setRbInputIds] = useState<string[]>([]);
  const [rbBuilding, setRbBuilding] = useState(false);
  const [rbError, setRbError] = useState<string | null>(null);
  const [rbMaxHours, setRbMaxHours] = useState(3);

  // Manual ferry hours per leg (persisted; keyed by place-id pair)
  const [ferryHours, setFerryHours] = useState<FerryHours>(loadFerryHours);

  const selected = selectedId ? placeById.get(selectedId) ?? null : null;

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const p of places) for (const t of p.tags ?? []) s.add(t);
    return [...s].sort();
  }, [places]);

  const matchesText = (p: PlaceWithOverride) => {
    if (search === '') return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.note ?? '').toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q) ||
      (p.communityNotes ?? '').toLowerCase().includes(q) ||
      (p.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  };

  const matchesTags = (p: PlaceWithOverride) =>
    tagFilter.size === 0 || (p.tags ?? []).some((t) => tagFilter.has(t));

  const matchesVote = (p: PlaceWithOverride) => {
    if (voteFilter === 'all') return true;
    const t = tallies.get(p.id);
    return voteFilter === 'favorites' ? isFavorite(t) : isSplit(t);
  };

  const visible = places.filter(
    (p) =>
      countryFilter.has(p.country) &&
      categoryFilter.has(p.category) &&
      statusFilter.has(p.status) &&
      matchesTags(p) &&
      matchesVote(p) &&
      matchesText(p),
  );

  // Facet counts per status (respecting the other filters, but not status).
  const statusCounts = useMemo(() => {
    const counts: Record<Status, number> = {
      candidate: 0,
      shortlist: 0,
      backup: 0,
      rejected: 0,
    };
    for (const p of places) {
      if (
        countryFilter.has(p.country) &&
        categoryFilter.has(p.category) &&
        matchesTags(p) &&
        matchesText(p)
      ) {
        counts[p.status]++;
      }
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, countryFilter, categoryFilter, tagFilter, search]);

  const rejected = places.filter((p) => p.status === 'rejected');

  // ---- Per-day driving routes (feature 2) ----
  const dayStops = useMemo(() => {
    const grouped: Record<number, PlaceWithOverride[]> = {};
    for (const p of places) {
      if (!p.day) continue;
      (grouped[p.day] ??= []).push(p);
    }
    for (const ps of Object.values(grouped)) ps.sort(byOrder);
    return grouped;
  }, [places]);

  const dayPoints = useMemo(() => {
    const result: Record<number, [number, number][]> = {};
    for (const [day, ps] of Object.entries(dayStops)) {
      result[Number(day)] = ps.map((p) => [p.lat, p.lng] as [number, number]);
    }
    return result;
  }, [dayStops]);

  const { routes, loading: routesLoading } = useDayRoutes(dayPoints);

  // Manual ferry hours per day (sum over the day's consecutive stop pairs).
  const dayFerrySec = useMemo(() => {
    const out: Record<number, number> = {};
    for (const [day, ps] of Object.entries(dayStops)) {
      let s = 0;
      for (let i = 0; i < ps.length - 1; i++) {
        s += (ferryHours[ferryPairKey(ps[i].id, ps[i + 1].id)] ?? 0) * 3600;
      }
      if (s > 0) out[Number(day)] = s;
    }
    return out;
  }, [dayStops, ferryHours]);

  // ---- Trip mode: today, GPS, sleep tonight, near me ----
  const todayStops = useMemo(() => dayStops[tripDay] ?? [], [dayStops, tripDay]);
  const todayIds = useMemo(() => new Set(todayStops.map((p) => p.id)), [todayStops]);

  const totalPlanned = useMemo(
    () => Object.values(dayStops).reduce((sum, ps) => sum + ps.length, 0),
    [dayStops],
  );
  const totalDone = useMemo(
    () => Object.values(dayStops).flat().filter((p) => doneIds[p.id]).length,
    [dayStops, doneIds],
  );

  /** Anchor point for proximity finders: GPS fix, else today's last stop. */
  const tripAnchor = useMemo(() => {
    if (mode !== 'trip') return null;
    if (gpsFix) return { lat: gpsFix.lat, lng: gpsFix.lng, label: 'you' };
    const last = todayStops[todayStops.length - 1];
    return last ? { lat: last.lat, lng: last.lng, label: last.name } : null;
  }, [mode, gpsFix, todayStops]);

  const sleepMatches = useMemo<ProximityMatch[]>(() => {
    if (mode !== 'trip' || !sleepOpen || !tripAnchor) return [];
    return places
      .filter((p) => SLEEP_CATEGORIES.includes(p.category) && p.status !== 'rejected')
      .map((p) => ({
        place: p,
        dist: haversineKm(tripAnchor.lat, tripAnchor.lng, p.lat, p.lng),
      }))
      .filter((m) => m.dist <= SLEEP_TONIGHT_KM)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 15);
  }, [mode, sleepOpen, tripAnchor, places]);

  const nearMatches = useMemo<ProximityMatch[]>(() => {
    if (mode !== 'trip' || !nearOpen || !tripAnchor) return [];
    return places
      .filter(
        (p) =>
          SIGHT_CATEGORIES.includes(p.category) &&
          p.status !== 'rejected' &&
          !todayIds.has(p.id),
      )
      .map((p) => ({
        place: p,
        dist: haversineKm(tripAnchor.lat, tripAnchor.lng, p.lat, p.lng),
      }))
      .filter((m) => m.dist <= NEAR_ME_KM)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 15);
  }, [mode, nearOpen, tripAnchor, places, todayIds]);

  const tripMatchIds = useMemo(
    () => new Set([...sleepMatches, ...nearMatches].map((m) => m.place.id)),
    [sleepMatches, nearMatches],
  );

  // Trip-mode base pins: today's + tomorrow's stops, plus the shortlist/backup
  // plan. The 150-candidate haystack stays hidden on the road.
  const tripBase = useMemo(() => {
    if (mode !== 'trip') return [];
    return places.filter(
      (p) =>
        p.day === tripDay ||
        p.day === tripDay + 1 ||
        p.status === 'shortlist' ||
        p.status === 'backup',
    );
  }, [mode, places, tripDay]);

  function toggleDone(id: string) {
    setDoneIds((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (!next[id]) delete next[id];
      saveDone(next);
      return next;
    });
  }

  /** "We're tired" — drop a stop from its day, with a 6s undo. */
  function skipStop(p: PlaceWithOverride) {
    const prev = overrides[p.id];
    const day = p.day;
    assignDay(p.id, null);
    setUndoToast({
      label: `Removed ${p.name} from Day ${day}`,
      undo: () =>
        applyOverrides((o) => {
          const next = { ...o };
          if (prev) next[p.id] = prev;
          else delete next[p.id];
          return next;
        }),
    });
  }

  function applyFix(pos: GeolocationPosition) {
    const f: GpsFix = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      acc: pos.coords.accuracy,
      ts: Date.now(),
    };
    setGpsFix(f);
    saveLastFix(f);
    return f;
  }

  function locateMe() {
    if (!('geolocation' in navigator)) {
      alert('No geolocation available in this browser.');
      return;
    }
    // Recenter on the cached fix immediately; refine when the real fix lands.
    if (gpsFix) {
      mapRef.current?.flyTo([gpsFix.lat, gpsFix.lng], Math.max(mapRef.current.getZoom(), 12));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const f = applyFix(pos);
        mapRef.current?.flyTo([f.lat, f.lng], Math.max(mapRef.current.getZoom(), 12));
        if (watchRef.current == null) {
          watchRef.current = navigator.geolocation.watchPosition(applyFix, () => {}, {
            enableHighAccuracy: true,
            maximumAge: 30000,
          });
        }
      },
      () =>
        alert(
          'Location unavailable — check the location permission for this site (needs HTTPS on phones).',
        ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  // Entering trip mode / changing the viewed day focuses the map on its stops.
  useEffect(() => {
    if (mode !== 'trip') return;
    const pts = (dayStops[tripDay] ?? []).map((p) => [p.lat, p.lng] as [number, number]);
    if (pts.length > 0 && mapRef.current) {
      mapRef.current.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 12 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tripDay]);

  // ---- Nearby matches ----
  const nearbyMatchIds = useMemo(() => {
    const ids = new Set<string>();
    if (!nearbyActive || !selected) return ids;
    for (const p of places) {
      if (p.id === selected.id) continue;
      if (p.status === 'rejected') continue;
      if (!SLEEP_CATEGORIES.includes(p.category)) continue;
      if (haversineKm(selected.lat, selected.lng, p.lat, p.lng) <= nearbyRadius) {
        ids.add(p.id);
      }
    }
    return ids;
  }, [nearbyActive, selected, places, nearbyRadius]);

  // ---- Corridor matches (sleep along a route) ----
  const corridorMatches = useMemo<CorridorMatch[]>(() => {
    if (!corridor) return [];
    const stopCoords = corridor.stops.map((s) => [s.lat, s.lng] as [number, number]);
    const stopIds = new Set(corridor.stops.map((s) => s.id));
    const out: CorridorMatch[] = [];
    for (const p of places) {
      if (p.status === 'rejected') continue;
      if (!SLEEP_CATEGORIES.includes(p.category)) continue;
      if (stopIds.has(p.id)) continue; // skip the route's own stops
      const dist = pointToPolylineKm(p.lat, p.lng, corridor.coords);
      if (dist <= corridorRadius) {
        const leg = stopCoords.length >= 2 ? nearestLegIndex(p.lat, p.lng, stopCoords) : 0;
        out.push({ place: p, dist, leg });
      }
    }
    return out.sort((a, b) => a.dist - b.dist);
  }, [corridor, corridorRadius, places]);

  const corridorMatchIds = useMemo(
    () => new Set(corridorMatches.map((m) => m.place.id)),
    [corridorMatches],
  );
  const corridorStopIds = useMemo(
    () => new Set(corridor?.stops.map((s) => s.id) ?? []),
    [corridor],
  );

  // Nearby/corridor/proximity matches must show on the map even if filters
  // would hide them — the whole point of the finders is to surface places.
  const markersToShow = useMemo(() => {
    const base = mode === 'trip' ? tripBase : visible;
    const forced = new Set<string>(
      mode === 'trip'
        ? tripMatchIds
        : [...nearbyMatchIds, ...corridorMatchIds, ...corridorStopIds],
    );
    // Always show the selected place even if rejected or filtered out.
    if (selectedId) forced.add(selectedId);
    if (forced.size === 0) return base;
    const inBase = new Set(base.map((p) => p.id));
    const extra = places.filter((p) => forced.has(p.id) && !inBase.has(p.id));
    return [...base, ...extra];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tripBase, visible, tripMatchIds, nearbyMatchIds, corridorMatchIds, corridorStopIds, selectedId]);

  function findSleepAlongDay(day: number) {
    const route = routes[day];
    if (!route) return;
    const stops = places.filter((p) => p.day === day).sort(byOrder);
    setCorridor({ coords: toLatLngs(route.coordinates), stops, label: `Day ${day} route` });
  }

  function findSleepAlongTrip() {
    if (!rbTrip) return;
    setCorridor({
      coords: toLatLngs(rbTrip.coordinates),
      stops: rbOrdered,
      label: 'the optimized route',
    });
  }

  // ---- Mutations ----
  function applyOverrides(updater: (o: Overrides) => Overrides) {
    setOverrides((prev) => {
      const next = updater(prev);
      saveOverrides(next);
      return next;
    });
  }

  function applyUserPlaces(updater: (u: Place[]) => Place[]) {
    setUserPlaces((prev) => {
      const next = updater(prev);
      saveUserPlaces(next);
      return next;
    });
  }

  // ---- Add place (feature A) ----
  const editingPlace = editingId
    ? userPlaces.find((p) => p.id === editingId) ?? null
    : null;

  /** Cheap bounding-box country guess (HR/BA/ME), defaulting to ME. */
  function guessCountry(lat: number, lng: number): Country {
    // Bosnia: the inland pocket roughly N of 42.6 and E of 17.0 (Mostar/Konjic).
    if (lat > 42.55 && lng > 17.0 && lng < 19.7) return 'BA';
    // Croatia: the Adriatic coast strip (and the NW); broadly W/N of the ME line.
    if (lat > 42.6 || lng < 17.5) return 'HR';
    return 'ME';
  }

  function openAddPlace() {
    setEditingId(null);
    setTappedPoint(null);
    setEssentialsOpen(false);
    setSelectedId(null);
    setAddPlaceOpen(true);
  }

  function openEditPlace(id: string) {
    setEditingId(id);
    setTappedPoint(null);
    setSelectedId(null);
    setAddPlaceOpen(true);
  }

  function closeAddPlace() {
    setAddPlaceOpen(false);
    setEditingId(null);
    setTappedPoint(null);
  }

  function saveDraftPlace(draft: DraftPlace) {
    if (draft.lat == null || draft.lng == null) return;
    if (editingId) {
      // Edit: update the immutable identity in userPlaces; status/day/note flow
      // through the overrides layer (one code path with baked places).
      const updated: Place = {
        ...(userPlaces.find((p) => p.id === editingId) as Place),
        name: draft.name,
        category: draft.category,
        lat: draft.lat!,
        lng: draft.lng!,
        country: guessCountry(draft.lat!, draft.lng!),
      };
      applyUserPlaces((u) => u.map((p) => (p.id === editingId ? updated : p)));
      applyOverrides((o) => ({
        ...o,
        [editingId]: { ...o[editingId], day: draft.day ?? undefined, note: draft.note || undefined },
      }));
      // Propagate the edit to the other phones too.
      pushUserPlace(updated, person);
      void runSync.current();
      closeAddPlace();
      setSelectedId(editingId);
      return;
    }
    // New: collision-proof, obviously user-origin id; defaults to shortlist.
    const id = `user-${Date.now()}`;
    const place: Place = {
      id,
      name: draft.name,
      country: guessCountry(draft.lat, draft.lng),
      category: draft.category,
      lat: draft.lat,
      lng: draft.lng,
      description: draft.note || 'Added on the trip.',
      status: 'shortlist',
      userAdded: true,
      source: 'user',
    };
    applyUserPlaces((u) => [...u, place]);
    if (draft.day != null || draft.note) {
      applyOverrides((o) => ({
        ...o,
        [id]: { ...o[id], day: draft.day ?? undefined, note: draft.note || undefined },
      }));
    }
    // Sync to user_places so all 4 phones see this pin (best-effort + queued).
    pushUserPlace(place, person);
    void runSync.current();
    closeAddPlace();
    setSelectedId(id); // open the detail panel on the new pin
  }

  function deleteUserPlace(id: string) {
    if (!confirm('Delete this place? This cannot be undone.')) return;
    applyUserPlaces((u) => u.filter((p) => p.id !== id));
    // Clean its override + done keys so nothing dangles.
    applyOverrides((o) => {
      const next = { ...o };
      delete next[id];
      return next;
    });
    setDoneIds((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      saveDone(next);
      return next;
    });
    closeAddPlace();
    setSelectedId(null);
  }

  /** A map tap while the Add-place form is open captures/moves the pin. */
  function onMapTap(lat: number, lng: number) {
    if (!addPlaceOpen) return;
    setTappedPoint({ lat, lng });
    // When editing, persist the moved coordinate immediately.
    if (editingId) {
      applyUserPlaces((u) =>
        u.map((p) =>
          p.id === editingId ? { ...p, lat, lng, country: guessCountry(lat, lng) } : p,
        ),
      );
    }
  }

  // ---- Share plan (feature B1) ----
  function makeShareLink(): string {
    const encoded = encodePlan({ overrides, userPlaces });
    const base = `${location.origin}${location.pathname}${location.search}`;
    return `${base}#plan=${encoded}`;
  }

  function applyImportedPlan(plan: SharedPlan, mode: 'merge' | 'replace') {
    if (mode === 'replace') {
      setOverrides(plan.overrides);
      saveOverrides(plan.overrides);
      setUserPlaces(plan.userPlaces);
      saveUserPlaces(plan.userPlaces);
    } else {
      // Merge: incoming wins per place (importer chose for the whole import).
      applyOverrides((o) => ({ ...o, ...plan.overrides }));
      applyUserPlaces((u) => {
        const byId = new Map(u.map((p) => [p.id, p]));
        for (const p of plan.userPlaces) byId.set(p.id, p);
        return [...byId.values()];
      });
    }
    setImportPlan(null);
  }

  // On load: decode a #plan= hash (robust to malformed input), prompt, clear it.
  useEffect(() => {
    const m = location.hash.match(/[#&]plan=([^&]+)/);
    if (!m) return;
    const plan = decodePlan(m[1]);
    // Always clear the hash so a refresh doesn't re-prompt.
    history.replaceState(null, '', location.pathname + location.search);
    if (plan) setImportPlan(plan);
    else alert('That shared-plan link could not be read (it may be corrupted or truncated).');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setStatus(id: string, status: Status) {
    applyOverrides((o) => ({ ...o, [id]: { ...o[id], status } }));
  }

  function setNote(id: string, note: string) {
    applyOverrides((o) => ({ ...o, [id]: { ...o[id], note } }));
  }

  function assignDay(id: string, day: number | null) {
    if (day == null) {
      applyOverrides((o) => ({ ...o, [id]: { ...o[id], day: undefined, dayOrder: undefined } }));
      return;
    }
    const order = places.filter((p) => p.day === day && p.id !== id).length;
    applyOverrides((o) => ({ ...o, [id]: { ...o[id], day, dayOrder: order } }));
  }

  function moveInDay(id: string, dir: 'up' | 'down') {
    const place = placeById.get(id);
    if (!place?.day) return;
    const day = place.day;
    const ordered = places.filter((p) => p.day === day).sort(byOrder);
    const idx = ordered.findIndex((p) => p.id === id);
    const swap = idx + (dir === 'up' ? -1 : 1);
    if (swap < 0 || swap >= ordered.length) return;
    [ordered[idx], ordered[swap]] = [ordered[swap], ordered[idx]];
    applyOverrides((o) => {
      const next = { ...o };
      ordered.forEach((p, i) => {
        next[p.id] = { ...next[p.id], day, dayOrder: i };
      });
      return next;
    });
  }

  // ---- Route builder ----
  function toggleRbSelect(id: string) {
    setRbSelected((prev) => {
      const next = toggle(prev, id);
      if (!next.has(id)) setRbAnchors((a) => a.filter((x) => x !== id));
      return next;
    });
  }
  function selectAllShortlisted() {
    setRbSelected(new Set(places.filter((p) => p.status === 'shortlist').map((p) => p.id)));
  }
  function clearRbSelection() {
    setRbSelected(new Set());
    setRbAnchors([]);
    setRbTrip(null);
    setRbError(null);
  }
  function toggleAnchor(id: string) {
    setRbAnchors((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  }
  function moveAnchor(id: string, dir: 'up' | 'down') {
    setRbAnchors((a) => {
      const i = a.indexOf(id);
      const j = i + (dir === 'up' ? -1 : 1);
      if (i < 0 || j < 0 || j >= a.length) return a;
      const next = [...a];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function setLegFerry(idA: string, idB: string, hours: number) {
    setFerryHours((prev) => {
      const next = { ...prev };
      const key = ferryPairKey(idA, idB);
      if (!hours || Number.isNaN(hours)) delete next[key];
      else next[key] = hours;
      saveFerryHours(next);
      return next;
    });
  }

  /** Ferry seconds for the leg between two places (0 if not marked). */
  function legFerrySec(idA: string, idB: string): number {
    return (ferryHours[ferryPairKey(idA, idB)] ?? 0) * 3600;
  }

  /**
   * Build the optimal route: one OSRM /table call for the duration matrix,
   * then a LOCAL solve (exact Held-Karp for small sets, NN + 2-opt/or-opt for
   * larger). User-pinned anchors split the problem into independently-solved
   * ordered segments. OSRM /route is used only to draw the final geometry.
   */
  async function buildRoute() {
    const chosen = places.filter((p) => rbSelected.has(p.id));
    if (chosen.length < 2) return;
    const start = rbStart
      ? chosen.find((p) => p.id === rbStart)
      : [...chosen].sort((a, b) => b.lat - a.lat)[0]; // northernmost
    const end = rbEnd
      ? chosen.find((p) => p.id === rbEnd)
      : [...chosen].sort((a, b) => a.lat - b.lat)[0]; // southernmost
    if (!start || !end || start.id === end.id) {
      setRbError('Pick a distinct start and end.');
      return;
    }
    // Ordered anchor sequence: start → pinned stops (user order) → end.
    const midAnchors = rbAnchors
      .filter((id) => id !== start.id && id !== end.id)
      .map((id) => chosen.find((p) => p.id === id))
      .filter(Boolean) as PlaceWithOverride[];
    const anchorSeq = [start, ...midAnchors, end];
    const anchorIds = new Set(anchorSeq.map((p) => p.id));
    const free = chosen.filter((p) => !anchorIds.has(p.id));
    const inputPlaces = [...anchorSeq, ...free];
    const points = inputPlaces.map((p) => [p.lat, p.lng] as LatLng);
    if (points.length > 100) {
      setRbError('Too many stops — the public OSRM server caps at ~100 waypoints.');
      return;
    }
    setRbBuilding(true);
    setRbError(null);

    // Everything below must never leave the UI stuck on "Solving…": any
    // unexpected throw (storage, parsing, …) is caught and surfaced, and the
    // built route always renders from memory even if persisting it fails.
    try {
      const key = `trip2:${routeKey(points)}|a:${anchorSeq.length}`;
      const cache = loadTripCache();
      let result: TripResult | null = cache[key] ?? null;

      if (!result) {
        // 1. Duration matrix (one cheap call).
        const table = await fetchTable(points);
        if (!table) {
          setRbError('OSRM /table failed (server busy?). Try again in a moment.');
          return;
        }
        const dur = table.durations;

        // 2. Assign each free stop to the anchor segment with the smallest detour.
        const A = anchorSeq.length; // input indices 0..A-1 are anchors, in order
        const segFree: number[][] = Array.from({ length: A - 1 }, () => []);
        for (let f = A; f < points.length; f++) {
          let bestSeg = 0;
          let bestDetour = Infinity;
          for (let s = 0; s < A - 1; s++) {
            const detour = dur[s][f] + dur[f][s + 1] - dur[s][s + 1];
            if (detour < bestDetour) {
              bestDetour = detour;
              bestSeg = s;
            }
          }
          segFree[bestSeg].push(f);
        }

        // 3. Solve each segment locally (exact when small enough).
        const order: number[] = [0];
        const segStarts: number[] = [0];
        let allExact = true;
        let unroutable = false;
        for (let s = 0; s < A - 1; s++) {
          const nodes = [s, ...segFree[s], s + 1]; // input indices in this segment
          const sub = nodes.map((i) => nodes.map((j) => dur[i][j]));
          const solved: SolveResult = solveOrder(sub, 0, nodes.length - 1);
          if (!Number.isFinite(solved.cost)) unroutable = true;
          if (!solved.exact) allExact = false;
          for (let k = 1; k < solved.order.length; k++) order.push(nodes[solved.order[k]]);
          if (s < A - 2) segStarts.push(order.length - 1);
        }
        if (unroutable) {
          setRbError('No road path between some of the chosen stops (check islands without ferries).');
          return;
        }

        const method =
          anchorSeq.length > 2
            ? allExact
              ? `anchored ${A - 1} segments · exact per segment`
              : `anchored ${A - 1} segments · heuristic in large segments`
            : allExact
              ? 'exact optimum (Held-Karp)'
              : 'heuristic (NN + 2-opt/or-opt)';

        // 4. Geometry via /route, only for drawing. Fall back to straight lines.
        const orderedPts = order.map((i) => points[i]);
        const road = await fetchRoute(orderedPts);
        const matrixLegs = order.slice(0, -1).map((from, k) => ({
          duration: dur[from][order[k + 1]],
          distance: table.distances[from]?.[order[k + 1]] ?? 0,
        }));
        result = road
          ? {
              distance: road.distance,
              duration: road.duration,
              coordinates: road.coordinates,
              snapped: road.snapped,
              legs: road.legs && road.legs.length === order.length - 1 ? road.legs : matrixLegs,
              order,
              exact: allExact,
              method,
              segStarts,
            }
          : {
              distance: matrixLegs.reduce((s, l) => s + l.distance, 0),
              duration: matrixLegs.reduce((s, l) => s + l.duration, 0),
              coordinates: orderedPts.map(([lat, lng]) => [lng, lat] as [number, number]),
              snapped: orderedPts.map(([lat, lng]) => [lng, lat] as [number, number]),
              legs: matrixLegs,
              order,
              exact: allExact,
              method: `${method} · straight-line preview (route fetch failed)`,
              segStarts,
            };
        cache[key] = result;
        // Quota-safe: slims geometry, evicts old entries, and on a full storage
        // skips persisting entirely — the in-memory `result` still renders.
        saveTripCache(cache);

        // Dev-only sanity check: how does OSRM /trip's heuristic compare?
        if (import.meta.env.DEV && anchorSeq.length === 2) {
          const ours = result.duration;
          fetchTrip(points).then((t) => {
            if (!t) return;
            const diff = t.duration - ours;
            if (Math.abs(diff) < 30) {
              console.log(`[route] /trip matches local solver (${Math.round(ours / 60)}min)`);
            } else if (diff > 0) {
              console.log(
                `[route] local solver BEAT /trip by ${Math.round(diff / 60)}min ` +
                  `(${Math.round(ours / 60)} vs ${Math.round(t.duration / 60)}min)`,
              );
            } else {
              console.warn(
                `[route] /trip was ${Math.round(-diff / 60)}min BETTER than local solver — investigate`,
                { ours, trip: t.duration },
              );
            }
          });
        }
      }

      setRbTrip(result);
      setRbInputIds(inputPlaces.map((p) => p.id));
    } catch (e) {
      console.warn('[route] build failed', e);
      setRbError('Route build failed unexpectedly — see the console for details.');
    } finally {
      setRbBuilding(false);
    }
  }

  const rbInputPlaces = useMemo(
    () => rbInputIds.map((id) => placeById.get(id)).filter(Boolean) as PlaceWithOverride[],
    [rbInputIds, placeById],
  );

  /** Places in optimal visiting order (aligned with rbTrip.legs). */
  const rbOrdered = useMemo(
    () =>
      rbTrip
        ? (rbTrip.order.map((i) => rbInputPlaces[i]).filter(Boolean) as PlaceWithOverride[])
        : [],
    [rbTrip, rbInputPlaces],
  );

  /** Trip legs with manual ferry hours folded in (ferry = wait + crossing). */
  const rbLegSeconds = useMemo(() => {
    if (!rbTrip) return [];
    return rbTrip.legs.map((l, i) => {
      const a = rbOrdered[i];
      const b = rbOrdered[i + 1];
      return l.duration + (a && b ? legFerrySec(a.id, b.id) : 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rbTrip, rbOrdered, ferryHours]);

  // Live "splits into N days" preview + over-the-limit day warnings.
  const rbSplit = useMemo(() => {
    if (!rbTrip) return null;
    const orderedIds = rbTrip.order.map((i) => rbInputIds[i]);
    const { days, dayTotals } = splitIntoDays(orderedIds, rbLegSeconds, rbMaxHours);
    const overDays = dayTotals
      .map((sec, i) => ({ day: i + 1, sec }))
      .filter((d) => d.sec > rbMaxHours * 3600 + 60);
    return { days, overDays };
  }, [rbTrip, rbInputIds, rbLegSeconds, rbMaxHours]);

  function applyTripToDays() {
    if (!rbTrip) return;
    const orderedIds = rbTrip.order.map((i) => rbInputIds[i]);
    const { assign } = splitIntoDays(orderedIds, rbLegSeconds, rbMaxHours);
    applyOverrides((o) => {
      const next = { ...o };
      for (const id of Object.keys(assign)) next[id] = { ...next[id], ...assign[id] };
      return next;
    });
    setView('itinerary');
  }

  function selectPlace(p: Place | PlaceWithOverride) {
    setSelectedId(p.id);
    // On a phone the open sidebar (list / Today view) covers the detail
    // bottom-sheet, so collapse it and let the sheet own the screen. Remember
    // that it was open so the ✕ returns to the list. Desktop keeps both.
    if (isNarrow() && sidebarOpen) {
      reopenSidebarOnClose.current = true;
      setSidebarOpen(false);
    }
  }

  /** Close the detail sheet; on a phone, restore the list it was opened from. */
  function closeDetail() {
    setSelectedId(null);
    if (reopenSidebarOnClose.current) {
      reopenSidebarOnClose.current = false;
      if (isNarrow()) setSidebarOpen(true);
    }
  }

  /** Focus the map (and detail panel) on a place by id — used by Essentials
   *  to jump to a hospital pin from contingency-places.json. */
  function focusPin(id: string) {
    const p = placeById.get(id);
    if (!p) return;
    setEssentialsOpen(false);
    setSelectedId(id);
    mapRef.current?.flyTo([p.lat, p.lng], Math.max(mapRef.current.getZoom(), 11), {
      duration: 0.8,
    });
  }

  // ---- Offline prep: build every day route once on wifi so it replays from
  // the localStorage cache in dead zones (tiles cache as you pan, via the SW).
  const [prepping, setPrepping] = useState(false);

  async function prepOffline() {
    setPrepping(true);
    const cache = loadRouteCache();
    const already: number[] = [];
    const built: number[] = []; // fetched AND persisted to the cache
    const memOnly: number[] = []; // fetched but NOT persisted (storage full)
    const failed: number[] = []; // fetch failed
    for (const [dayStr, pts] of Object.entries(dayPoints)) {
      if (pts.length < 2) continue;
      const day = Number(dayStr);
      const key = routeKey(pts);
      if (cache[key]?.legs) {
        already.push(day);
        continue; // already offline-ready
      }
      const r = await fetchRoute(pts); // sequential — kind to the demo server
      if (!r) {
        failed.push(day);
        continue;
      }
      cache[key] = r;
      // Persist, then verify this day's entry actually survived the write
      // (quota or LRU trimming can drop it) — report honestly either way.
      const persisted = saveRouteCache(cache) && Boolean(loadRouteCache()[key]);
      (persisted ? built : memOnly).push(day);
    }
    setPrepping(false);
    const lines = [
      `Offline prep finished — ${already.length + built.length} day route(s) saved` +
        (built.length ? ` (${built.length} newly built)` : '') +
        '.',
    ];
    if (memOnly.length) {
      lines.push(
        `⚠ Day ${memOnly.join(', ')}: built but NOT saved — storage is full. ` +
          `These still work this session and via the offline copy of OSRM responses.`,
      );
    }
    if (failed.length) {
      lines.push(`⚠ Day ${failed.join(', ')}: route fetch failed — retry later.`);
    }
    lines.push(
      '',
      'Now pan/zoom your route areas on the map while on wifi to cache those tiles, ' +
        'then add the app to your home screen.',
    );
    alert(lines.join('\n'));
  }

  const showTripLayer = view === 'route' && !!rbTrip;

  return (
    <div className="app">
      <button
        className="sidebar-fab"
        onClick={() => {
          // Manually toggling the sidebar cancels the auto-restore the detail
          // sheet would otherwise do on close (no surprise double-toggle).
          reopenSidebarOnClose.current = false;
          setSidebarOpen((s) => !s);
        }}
        title="Toggle panel"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="head-row">
          <h1>Balkans Trip</h1>
          <button
            className="who-pill"
            onClick={() => setWhoOpen(person ? 'edit' : 'firstUse')}
            title="Your name (used on votes & comments) — tap to change"
          >
            {person ? `🙂 ${person}` : '🙂 Set name'}
          </button>
          <button
            className={`mode-pill ${mode}`}
            onClick={() => setMode(mode === 'trip' ? 'planning' : 'trip')}
            title="Switch between planning (research) and trip (on the road) mode"
          >
            {mode === 'trip' ? '🚗 Trip' : '🗺 Planning'}
          </button>
        </div>

        {mode === 'trip' ? (
          <Today
            day={tripDay}
            realDay={isDuringTrip() ? currentTripDay() : -1}
            onDay={setTripDay}
            stops={todayStops}
            route={routes[tripDay]}
            ferryFor={(a, b) => ferryHours[ferryPairKey(a, b)] ?? 0}
            done={doneIds}
            onToggleDone={toggleDone}
            onSkip={skipStop}
            onSelect={selectPlace}
            kmFromGps={(lat, lng) =>
              gpsFix ? haversineKm(gpsFix.lat, gpsFix.lng, lat, lng) : null
            }
            sleepOpen={sleepOpen}
            onToggleSleep={() => {
              setSleepOpen((s) => !s);
              setNearOpen(false);
            }}
            sleepMatches={sleepMatches}
            nearOpen={nearOpen}
            onToggleNear={() => {
              setNearOpen((s) => !s);
              setSleepOpen(false);
            }}
            nearMatches={nearMatches}
            anchorLabel={tripAnchor?.label ?? null}
            onAddPlace={openAddPlace}
            onEssentials={() => setEssentialsOpen(true)}
            totalPlanned={totalPlanned}
            totalDone={totalDone}
          />
        ) : (
        <>
        <p className="subtitle">
          Jun 16–28 · Zadar → Dubrovnik ·{' '}
          <strong>{statusCounts.shortlist}</strong> shortlisted ·{' '}
          <strong>{statusCounts.candidate}</strong> to review
        </p>

        <div className="view-tabs">
          {(['places', 'itinerary', 'route'] as View[]).map((v) => (
            <button
              key={v}
              className={view === v ? 'on' : ''}
              onClick={() => {
                setView(v);
                setCorridor(null);
              }}
            >
              {v === 'places' ? 'Places' : v === 'itinerary' ? 'Itinerary' : 'Route builder'}
            </button>
          ))}
          <button
            className={view === 'review' ? 'on review-tab-btn' : 'review-tab-btn'}
            onClick={() => {
              setView('review');
              setCorridor(null);
            }}
            title="Card-by-card triage: shortlist, skip, or reject"
          >
            📋 Review
          </button>
        </div>

        <input
          className="search"
          placeholder="Search name, note, tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {!corridor && view !== 'itinerary' && (
          <>
            {/* Always-visible: one-tap presets cover the common flows. */}
            <div className="filter-group preset-row">
              {FILTER_PRESETS.map((pr) => (
                <button
                  key={pr.id}
                  className={`chip preset ${presetActive(pr) ? 'on' : ''}`}
                  title={pr.title}
                  onClick={() => applyPreset(pr)}
                >
                  {pr.label}
                </button>
              ))}
            </div>

            {/* One-tap hint when candidates are hidden (the largest pool). */}
            {!statusFilter.has('candidate') && statusCounts.candidate > 0 && (
              <div className="filter-group">
                <button
                  className="chip chip-hint"
                  onClick={() => {
                    setStatusFilter(toggle(statusFilter, 'candidate'));
                    setVoteFilter('all');
                  }}
                >
                  + show {statusCounts.candidate} candidates
                </button>
              </div>
            )}

            {/* Progressive disclosure: the full filter wall lives behind a
                single toggle so it doesn't overwhelm. */}
            <details className="filters-disclosure">
              <summary>More filters{advancedFilterCount > 0 ? ` · ${advancedFilterCount} active` : ''}</summary>

              <div className="filter-group">
                {COUNTRIES.map((c) => (
                  <button
                    key={c}
                    className={`chip ${countryFilter.has(c) ? 'on' : ''}`}
                    onClick={() => setCountryFilter(toggle(countryFilter, c))}
                  >
                    {COUNTRY_NAMES[c]}
                  </button>
                ))}
              </div>

              <div className="filter-group">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    className={`chip ${statusFilter.has(s) ? 'on' : ''}`}
                    onClick={() => {
                      setStatusFilter(toggle(statusFilter, s));
                      setVoteFilter('all');
                    }}
                  >
                    {s} <span className="chip-count">{statusCounts[s]}</span>
                  </button>
                ))}
              </div>

              <div className="filter-group">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    className={`chip ${categoryFilter.has(c) ? 'on' : ''}`}
                    style={{ borderColor: CATEGORY_COLORS[c] }}
                    onClick={() => {
                      setCategoryFilter(toggle(categoryFilter, c));
                      setVoteFilter('all');
                    }}
                  >
                    <span className="dot" style={{ background: CATEGORY_COLORS[c] }} />
                    {c}
                  </button>
                ))}
              </div>

              {allTags.length > 0 && (
                <details className="tag-filter">
                  <summary>
                    Tags{tagFilter.size > 0 ? ` (${tagFilter.size})` : ''}
                  </summary>
                  <div className="filter-group">
                    {allTags.map((t) => (
                      <button
                        key={t}
                        className={`chip ${tagFilter.has(t) ? 'on' : ''}`}
                        onClick={() => setTagFilter(toggle(tagFilter, t))}
                      >
                        #{t}
                      </button>
                    ))}
                    {tagFilter.size > 0 && (
                      <button className="chip clear-tags" onClick={() => setTagFilter(new Set())}>
                        clear
                      </button>
                    )}
                  </div>
                </details>
              )}
            </details>
          </>
        )}

        {corridor && (
          <CorridorPanel
            label={corridor.label}
            stops={corridor.stops}
            radius={corridorRadius}
            onRadius={setCorridorRadius}
            matches={corridorMatches}
            selectedId={selectedId}
            onSelect={selectPlace}
            onClose={() => setCorridor(null)}
          />
        )}

        {!corridor && view === 'places' && (
          <>
            <button className="add-place-btn" onClick={openAddPlace}>
              ＋ Add place
            </button>
            {visible.length === 0 && (
              <div className="place-list-empty">
                <p>No places match these filters.</p>
                {search && (
                  <button onClick={() => setSearch('')}>Clear search</button>
                )}
                {!statusFilter.has('candidate') && statusCounts.candidate > 0 && (
                  <button
                    className="hint-btn"
                    onClick={() => { setStatusFilter(toggle(statusFilter, 'candidate')); setVoteFilter('all'); }}
                  >
                    Show {statusCounts.candidate} candidates
                  </button>
                )}
                <button onClick={() => applyPreset(FILTER_PRESETS.find(p => p.id === 'reset')!)}>
                  Reset filters
                </button>
              </div>
            )}

            <ul className="place-list">
              {[...visible]
                .sort((a, b) => {
                  const statusOrder = { shortlist: 0, backup: 1, candidate: 2, rejected: 3 };
                  const sd = statusOrder[a.status] - statusOrder[b.status];
                  if (sd !== 0) return sd;
                  return (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name);
                })
                .map((p) => {
                  const booking = bookingById.get(p.id);
                  const t = tallies.get(p.id);
                  // When the status filter is narrowed to a single status, the badge
                  // is redundant — every row has the same status, so suppress it.
                  const showBadge = statusFilter.size !== 1;
                  return (
                    <li
                      key={p.id}
                      className={selectedId === p.id ? 'selected' : ''}
                      onClick={() => selectPlace(p)}
                    >
                      <span className="dot" style={{ background: CATEGORY_COLORS[p.category] }} />
                      <span className="place-name">{p.name}</span>
                      {t && (t.up > 0 || t.down > 0) && (
                        <span className="row-tally" title={`👍 ${t.up} · 👎 ${t.down}`}>
                          {t.up > 0 && <span className="row-tally-up">👍{t.up}</span>}
                          {t.down > 0 && <span className="row-tally-down">👎{t.down}</span>}
                        </span>
                      )}
                      {booking && (
                        <a
                          className={`book-mini kind-${booking.kind}`}
                          href={booking.url}
                          title={booking.label}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ↗
                        </a>
                      )}
                      {p.day && (
                        <span className="day-tag" style={{ background: dayColor(p.day) }}>
                          D{p.day}
                        </span>
                      )}
                      {p.note && <span className="note-tag" title={p.note}>📝</span>}
                      {showBadge && <span className={`badge badge-${p.status}`}>{p.status}</span>}
                    </li>
                  );
                })}
            </ul>

            {rejected.length > 0 && (
              <details className="rejected-box">
                <summary>Rejected ({rejected.length})</summary>
                <ul className="place-list rejected-list">
                  {rejected.map((p) => (
                    <li key={p.id} className={selectedId === p.id ? 'selected' : ''} onClick={() => selectPlace(p)} style={{ cursor: 'pointer' }}>
                      <span
                        className="dot"
                        style={{ background: CATEGORY_COLORS[p.category] }}
                      />
                      <span className="place-name">{p.name}</span>
                      <button className="restore" onClick={(e) => { e.stopPropagation(); setStatus(p.id, 'candidate'); }}>
                        ↩ restore
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}

        {!corridor && view === 'itinerary' && (
          <Itinerary
            places={places}
            routes={routes}
            routesLoading={routesLoading}
            ferrySecByDay={dayFerrySec}
            selectedId={selectedId}
            onSelect={selectPlace}
            onMove={moveInDay}
            onAssignDay={assignDay}
            onFindSleep={findSleepAlongDay}
          />
        )}

        {!corridor && view === 'route' && (
          <RouteBuilder
            candidates={visible}
            selectedIds={rbSelected}
            onToggleSelect={toggleRbSelect}
            onSelectAllShortlisted={selectAllShortlisted}
            onClearSelection={clearRbSelection}
            startId={rbStart}
            endId={rbEnd}
            onStart={setRbStart}
            onEnd={setRbEnd}
            anchorIds={rbAnchors}
            onToggleAnchor={toggleAnchor}
            onMoveAnchor={moveAnchor}
            onBuild={buildRoute}
            building={rbBuilding}
            error={rbError}
            trip={rbTrip}
            tripPlaces={rbInputPlaces}
            getLegFerry={(a, b) => ferryHours[ferryPairKey(a, b)] ?? 0}
            onSetLegFerry={setLegFerry}
            maxHours={rbMaxHours}
            onMaxHours={setRbMaxHours}
            onApplyToDays={applyTripToDays}
            split={rbSplit}
            onFocus={selectPlace}
            onFindSleep={findSleepAlongTrip}
          />
        )}

        </>
        )}
      </aside>

      <MapContainer ref={mapRef} className="map" center={[43.4, 17.3]} zoom={7} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HashSync />
        <MapTapCapture active={addPlaceOpen} onTap={onMapTap} />
        <FlyTo placeId={selectedId} lat={selected?.lat} lng={selected?.lng} />
        <FitBounds pts={visible.map((p) => [p.lat, p.lng])} nonce={fitNonce} />

        {/* Add-place: a draggable pin for the tapped/captured point */}
        {addPlaceOpen && tappedPoint && (
          <Marker
            position={[tappedPoint.lat, tappedPoint.lng]}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const ll = (e.target as L.Marker).getLatLng();
                onMapTap(ll.lat, ll.lng);
              },
            }}
          />
        )}

        {/* Per-day committed routes (trip mode: only today's, to cut clutter) */}
        {Object.entries(routes)
          .filter(([day]) => mode !== 'trip' || Number(day) === tripDay)
          .map(([day, r]) => (
            <Polyline
              key={`day-${day}`}
              positions={toLatLngs(r.coordinates)}
              pathOptions={{ color: dayColor(Number(day)), weight: 4, opacity: 0.75 }}
            />
          ))}

        {/* Today's ferry legs, dashed (when the day's route has snapped waypoints) */}
        {mode === 'trip' &&
          routes[tripDay]?.snapped &&
          todayStops.slice(0, -1).map((a, i) => {
            const b = todayStops[i + 1];
            if (!b || legFerrySec(a.id, b.id) <= 0) return null;
            const r = routes[tripDay];
            return (
              <Polyline
                key={`tferry-${a.id}-${b.id}`}
                positions={toLatLngs(sliceLegCoords(r.coordinates, r.snapped!, i))}
                pathOptions={{ color: '#0077be', weight: 5, opacity: 0.9, dashArray: '8 10' }}
              />
            );
          })}

        {/* Route builder preview line */}
        {showTripLayer && rbTrip && (
          <Polyline
            positions={toLatLngs(rbTrip.coordinates)}
            pathOptions={{ color: '#111', weight: 5, opacity: 0.5, dashArray: '1 8' }}
          />
        )}

        {/* Ferry legs: dashed blue overlay on legs marked with manual ferry hours */}
        {showTripLayer &&
          rbTrip?.snapped &&
          rbOrdered.slice(0, -1).map((a, i) => {
            const b = rbOrdered[i + 1];
            if (!b || legFerrySec(a.id, b.id) <= 0) return null;
            return (
              <Polyline
                key={`ferry-${a.id}-${b.id}`}
                positions={toLatLngs(sliceLegCoords(rbTrip.coordinates, rbTrip.snapped!, i))}
                pathOptions={{ color: '#0077be', weight: 5, opacity: 0.9, dashArray: '8 10' }}
              />
            );
          })}

        {/* Corridor route highlight */}
        {corridor && (
          <Polyline
            positions={corridor.coords}
            pathOptions={{ color: '#8e44ad', weight: 6, opacity: 0.35 }}
          />
        )}

        {markersToShow.map((p) => {
          const isTrip = mode === 'trip';
          const isSel = p.id === selectedId;
          const rbSel = !isTrip && view === 'route' && rbSelected.has(p.id);
          let dim = false;
          let matchHi = false;
          let radius = p.status === 'shortlist' ? 10 : 7;
          if (isSel) radius = 15;
          if (isTrip) {
            matchHi = tripMatchIds.has(p.id);
            if (matchHi) {
              radius = 11;
            } else if (todayIds.has(p.id)) {
              radius = 10;
            } else if (sleepOpen || nearOpen) {
              dim = true; // a finder is active: fade everything that isn't a match
            } else {
              radius = 6; // shortlist/backup/tomorrow backdrop pins
            }
          } else if (corridor) {
            matchHi = corridorMatchIds.has(p.id);
            dim = !matchHi && !corridorStopIds.has(p.id);
            if (matchHi) radius = 11;
          } else if (nearbyActive && selected) {
            matchHi = nearbyMatchIds.has(p.id);
            dim = selectedId !== p.id && !matchHi;
            if (matchHi) radius = 11;
          }
          const softTrip = isTrip && !matchHi && !todayIds.has(p.id) && !dim;
          // No Leaflet popup: one pin click opens ONE surface — the detail panel.
          return (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={radius}
              pathOptions={{
                color: isSel ? '#FF3B30' : rbSel || matchHi ? '#111' : '#ffffff',
                weight: isSel ? 4 : rbSel ? 3.5 : matchHi ? 2.5 : p.status === 'shortlist' ? 3 : 1.5,
                fillColor: CATEGORY_COLORS[p.category],
                fillOpacity: dim
                  ? 0.15
                  : softTrip
                    ? 0.55
                    : p.status === 'rejected'
                      ? 0.3
                      : 0.9,
                opacity: dim ? 0.2 : softTrip ? 0.6 : 1,
              }}
              eventHandlers={{ click: () => selectPlace(p) }}
            />
          );
        })}

        {/* Vote tally badges on pins that have votes (both modes) */}
        {markersToShow.map((p) => {
          const t = tallies.get(p.id);
          if (!t || (t.up === 0 && t.down === 0)) return null;
          return (
            <Marker
              key={`vb-${p.id}`}
              position={[p.lat, p.lng]}
              icon={voteBadgeIcon(t.up, t.down)}
              interactive={false}
              keyboard={false}
            />
          );
        })}

        {/* Trip mode: big numbered pins for today's stops */}
        {mode === 'trip' &&
          todayStops.map((p, i) => (
            <Marker
              key={`today-${p.id}`}
              position={[p.lat, p.lng]}
              icon={numberIcon(i + 1, doneIds[p.id] ? '#9aa5ad' : dayColor(tripDay))}
              eventHandlers={{ click: () => selectPlace(p) }}
            />
          ))}

        {/* You-are-here dot (last cached fix until a fresh one lands) */}
        {gpsFix && (
          <CircleMarker
            center={[gpsFix.lat, gpsFix.lng]}
            radius={8}
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              fillColor: '#1e80ff',
              fillOpacity: 1,
            }}
          />
        )}

        {/* Numbered waypoints for the route-builder preview */}
        {showTripLayer &&
          rbTrip &&
          rbTrip.order.map((inputIdx, pos) => {
            const p = rbInputPlaces[inputIdx];
            if (!p) return null;
            return (
              <Marker
                key={`wp-${p.id}`}
                position={[p.lat, p.lng]}
                icon={numberIcon(pos + 1, '#111')}
                eventHandlers={{ click: () => selectPlace(p) }}
              />
            );
          })}
      </MapContainer>

      <button className="locate-fab" onClick={locateMe} title="Center on me">
        📍
      </button>

      {undoToast && (
        <div className="undo-toast">
          <span>{undoToast.label}</span>
          <button
            onClick={() => {
              undoToast.undo();
              setUndoToast(null);
            }}
          >
            Undo
          </button>
        </div>
      )}

      <DetailPanel
        place={selected}
        tripMode={mode === 'trip'}
        onClose={closeDetail}
        onStatus={setStatus}
        onAssignDay={assignDay}
        onNote={setNote}
        onEdit={selected?.userAdded ? () => openEditPlace(selected.id) : undefined}
        isDone={selected ? !!doneIds[selected.id] : false}
        onToggleDone={(id) => toggleDone(id)}
        nearbyActive={nearbyActive}
        nearbyRadius={nearbyRadius}
        nearbyCount={nearbyMatchIds.size}
        onToggleNearby={() => setNearbyActive((a) => !a)}
        onNearbyRadius={setNearbyRadius}
        person={person}
        myVote={selected ? myVoteFor(votes, selected.id, person) : 0}
        tally={selected ? tallies.get(selected.id) : undefined}
        comments={comments}
        onNeedName={() => setWhoOpen('firstUse')}
        onVote={(v) => selected && castVote(selected.id, v)}
        onComment={(body) => selected && addComment(selected.id, body)}
      />

      {addPlaceOpen && (
        <AddPlace
          tappedPoint={tappedPoint}
          gpsFix={gpsFix ? { lat: gpsFix.lat, lng: gpsFix.lng } : null}
          editing={editingPlace}
          editingDay={editingId ? overrides[editingId]?.day ?? null : null}
          editingNote={editingId ? overrides[editingId]?.note ?? '' : ''}
          onSave={saveDraftPlace}
          onDelete={editingId ? () => deleteUserPlace(editingId) : undefined}
          onClose={closeAddPlace}
        />
      )}

      {essentialsOpen && (
        <Essentials onClose={() => setEssentialsOpen(false)} onShowPin={focusPin} />
      )}

      {importPlan && (
        <ImportPrompt
          summary={{
            overrides: Object.keys(importPlan.overrides).length,
            userPlaces: importPlan.userPlaces.length,
          }}
          onMerge={() => applyImportedPlan(importPlan, 'merge')}
          onReplace={() => applyImportedPlan(importPlan, 'replace')}
          onCancel={() => setImportPlan(null)}
        />
      )}

      {whoOpen && (
        <WhoAreYou
          current={whoOpen === 'edit' ? person : null}
          onSave={saveName}
          onCancel={whoOpen === 'edit' ? () => setWhoOpen(null) : undefined}
        />
      )}

      {view === 'review' && (
        <Review
          places={places}
          onStatus={setStatus}
          onExit={() => setView('places')}
          onShowOnMap={(p) => {
            selectPlace(p);
            setView('places');
          }}
        />
      )}
    </div>
  );
}
