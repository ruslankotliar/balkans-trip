import { Suspense, lazy, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
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
import { type DraftPlace } from './components/AddPlace';
import DetailPanel from './components/DetailPanel';
import { type CorridorMatch } from './components/CorridorPanel';
import { type ProximityMatch } from './components/Today';
import {
  loadRemotePlacesCache,
  pushUserPlace,
  queuePlanOverrideSync,
  syncCollab,
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
import { fetchRoute, routeKey } from './osrm';
import {
  applyPlanOverrideRows,
  ferryPairKey,
  loadDayNotes,
  loadDone,
  loadFerryHours,
  loadLastFix,
  loadOverrides,
  loadPlaces,
  loadRouteCache,
  loadSavedMode,
  loadTripCache,
  loadUserPlaces,
  saveDayNotes,
  saveDone,
  saveFerryHours,
  saveLastFix,
  saveMode,
  saveOverrides,
  saveRouteCache,
  saveTripCache,
  saveUserPlaces,
  normalizeOverrides,
  type FerryHours,
  type GpsFix,
  type Mode,
  type Overrides,
  type PlaceWithOverride,
} from './store';
import { hasSupabase } from './supabase';
import { buildDaySchedule } from './schedule';
import {
  currentTripDay,
  dayColor,
  haversineKm,
  isDuringTrip,
  nearestLegIndex,
  pointToPolylineKm,
  formatDuration,
} from './trip';
import type { Category, Country, Place, Status } from './types';
import { useDayRoutes } from './useDayRoutes';

const AddPlace = lazy(() => import('./components/AddPlace'));
const CorridorPanel = lazy(() => import('./components/CorridorPanel'));
const Today = lazy(() => import('./components/Today'));
const LazyEssentials = lazy(() => import('./components/Essentials'));
const LazyReview = lazy(() => import('./components/Review'));
const LazyItinerary = lazy(() => import('./components/Itinerary'));
function PanelFallback({ text }: { text: string }) {
  return (
    <div className="place-list-empty">
      <p>{text}</p>
      <p className="loading-dot">Loading…</p>
    </div>
  );
}

function DialogFallback({ title }: { title: string }) {
  return (
    <div className="import-overlay" role="dialog" aria-modal="true">
      <div className="import-modal">
        <h2>{title}</h2>
        <p className="loading-dot">Loading…</p>
      </div>
    </div>
  );
}

type View = 'places' | 'itinerary' | 'review';

// Categories that count as a place to sleep, for the nearby finder.
const SLEEP_CATEGORIES: Category[] = ['campsite', 'accommodation'];

// Sightseeing categories for the "Do & see" filter preset.
const SIGHT_CATEGORIES: Category[] = ['sight', 'viewpoint', 'beach', 'hike', 'activity', 'nature'];

// Near me includes food/nightlife too — useful when near a town.
const NEAR_ME_CATEGORIES: Category[] = [...SIGHT_CATEGORIES, 'food', 'nightlife', 'town'];

const SLEEP_TONIGHT_KM = 25;
const NEAR_ME_KM = 30;
// One-tap quick filters: the common planning flows must be 1–2 taps.
// (Trip mode has its own one-tap finders: 🛏 Sleep tonight / 📍 Near me.)
const NON_REJECTED: Status[] = ['candidate', 'shortlist', 'backup'];
interface FilterPreset {
  id: string;
  label: string;
  title: string;
  categories?: Category[];
  statuses?: Status[];
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
    id: 'reset',
    label: '↺ All',
    title: 'Back to the default view (all categories, shortlist + backup)',
    categories: CATEGORIES,
    statuses: ['shortlist', 'backup'],
  },
];

function isFavorite(t: { up: number; down: number; net: number } | undefined): boolean {
  if (!t) return false;
  return t.net >= 2 || (t.down === 0 && t.up >= 2);
}
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

export default function App() {
  // User-added places merge after the bundle so a runtime pin can override a
  // baked id without breaking the rest of the app.
  const [userPlaces, setUserPlaces] = useState<Place[]>(loadUserPlaces);
  const [remotePlaces, setRemotePlaces] = useState<Place[]>(loadRemotePlacesCache);
  const [syncOnline, setSyncOnline] = useState<boolean | null>(hasSupabase ? null : false);
  // Merge baked → local user places → remote user places (first id wins).
  const basePlaces = useMemo<Place[]>(() => {
    const localIds = new Set(userPlaces.map((p) => p.id));
    const remoteOnly = remotePlaces.filter((p) => !localIds.has(p.id));
    return [...loadPlaces(), ...userPlaces, ...remoteOnly];
  }, [userPlaces, remotePlaces]);

  /** Pull the latest collab state from Supabase (best-effort; degrades to cache). */
  const runSync = useRef(async () => {});
  runSync.current = async () => {
    const res = await syncCollab();
    setSyncOnline(res.online);
    setRemotePlaces(res.remotePlaces);
    if (res.planRows.length > 0) {
      setOverrides((prev) => {
        const next = applyPlanOverrideRows(prev, res.planRows);
        saveOverrides(next);
        return next;
      });
    }
  };

  // Sync on load and whenever the window regains focus (cheap, best-effort).
  useEffect(() => {
    void runSync.current();
    const onFocus = () => void runSync.current();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  // One-tap filter presets (filtering-convenience: common flows in 1–2 taps).
  const setEq = <T,>(set: Set<T>, arr: readonly T[]) =>
    set.size === arr.length && arr.every((x) => set.has(x));
  function applyPreset(pr: FilterPreset) {
    setCategoryFilter(new Set(pr.categories ?? CATEGORIES));
    setStatusFilter(new Set(pr.statuses ?? NON_REJECTED));
  }
  const presetActive = (pr: FilterPreset) =>
    setEq(categoryFilter, pr.categories ?? CATEGORIES) &&
    setEq(statusFilter, pr.statuses ?? NON_REJECTED);

  // How many advanced filters are narrowing the view (for the disclosure label).
  const advancedFilterCount =
    (countryFilter.size < COUNTRIES.length ? 1 : 0) +
    (categoryFilter.size < CATEGORIES.length ? 1 : 0) +
    (statusFilter.size < STATUSES.length ? 1 : 0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>('places');
  const [fitNonce, setFitNonce] = useState(0);
  const [toolsOpen, setToolsOpen] = useState(false);

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
  const [dayNotes, setDayNotes] = useState<Record<number, string>>(loadDayNotes);
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

  // GPS "you are here" (last fix cached so a cold start still shows a dot)
  const [gpsFix, setGpsFix] = useState<GpsFix | null>(loadLastFix);
  const mapRef = useRef<L.Map | null>(null);
  const watchRef = useRef<number | null>(null);

  function setMode(m: Mode) {
    setModeState(m);
    saveMode(m);
    setToolsOpen(false);
    if (m === 'trip') {
      setTripDay(currentTripDay());
      setSidebarOpen(true);
    }
    setCorridor(null);
    setSleepOpen(false);
    setNearOpen(false);
  }
  const paceMultiplier = 1;

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

  // Manual ferry hours per leg (persisted; keyed by place-id pair)
  const [ferryHours, setFerryHours] = useState<FerryHours>(loadFerryHours);

  const selected = selectedId ? placeById.get(selectedId) ?? null : null;

  const matchesText = (p: PlaceWithOverride) => {
    if (deferredSearch === '') return true;
    const q = deferredSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.note ?? '').toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q) ||
      (p.communityNotes ?? '').toLowerCase().includes(q)
    );
  };

  const visible = places.filter(
    (p) =>
      countryFilter.has(p.country) &&
      categoryFilter.has(p.category) &&
      statusFilter.has(p.status) &&
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
        matchesText(p)
      ) {
        counts[p.status]++;
      }
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, countryFilter, categoryFilter, search]);

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
    for (const [dayStr, ps] of Object.entries(dayStops)) {
      const dayNum = Number(dayStr);
      const pts: [number, number][] = ps.map((p) => [p.lat, p.lng]);
      // Prepend the previous night's sleep location so the route — and its
      // drive time — covers the full day including the morning relocation drive.
      const prevPs = dayStops[dayNum - 1];
      if (prevPs && prevPs.length > 0 && pts.length > 0) {
        const sleepSet = new Set<string>(SLEEP_CATEGORIES);
        const prevSleep =
          [...prevPs].reverse().find((p) => sleepSet.has(p.category)) ??
          prevPs[prevPs.length - 1];
        // Skip if overnight stop is essentially the same location as first stop.
        if (
          Math.abs(prevSleep.lat - pts[0][0]) > 0.001 ||
          Math.abs(prevSleep.lng - pts[0][1]) > 0.001
        ) {
          pts.unshift([prevSleep.lat, prevSleep.lng]);
        }
      }
      result[dayNum] = pts;
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

  const daySchedules = useMemo(() => {
    const out: Record<number, ReturnType<typeof buildDaySchedule>> = {};
    for (const [dayStr, stops] of Object.entries(dayStops)) {
      const day = Number(dayStr);
      const route = routes[day];
      if (!route) continue;
      const schedule = buildDaySchedule(
        stops,
        route,
        (idA, idB) => ferryHours[ferryPairKey(idA, idB)] ?? 0,
        { paceMultiplier },
      );
      if (schedule) out[day] = schedule;
    }
    return out;
  }, [dayStops, routes, ferryHours, paceMultiplier]);

  // ---- Trip mode: today, GPS, sleep tonight, near me ----
  const todayStops = useMemo(() => dayStops[tripDay] ?? [], [dayStops, tripDay]);
  const todayIds = useMemo(() => new Set(todayStops.map((p) => p.id)), [todayStops]);
  const todaySchedule = daySchedules[tripDay] ?? null;
  const totalPlanned = useMemo(
    () => Object.values(dayStops).reduce((sum, ps) => sum + ps.length, 0),
    [dayStops],
  );
  const totalDone = useMemo(
    () => Object.values(dayStops).flat().filter((p) => doneIds[p.id]).length,
    [dayStops, doneIds],
  );

  const syncLabel = !hasSupabase
    ? 'local only'
    : syncOnline === null
      ? 'syncing…'
      : syncOnline
        ? 'shared'
        : 'offline';
  const syncTitle = !hasSupabase
    ? 'This browser is running local-only — no shared Supabase sync is configured.'
    : syncOnline === null
      ? 'Checking shared plan sync…'
      : syncOnline
        ? 'Shared sync is live — plan edits should reach the other phones.'
        : 'Shared sync is unavailable right now; changes are staying on this device until it reconnects.';

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
          NEAR_ME_CATEGORIES.includes(p.category) &&
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

  function setDayNote(day: number, text: string) {
    setDayNotes((prev) => {
      const next = { ...prev, [day]: text };
      if (!text) delete next[day];
      saveDayNotes(next);
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

  // ---- Mutations ----
  function applyOverrides(updater: (o: Overrides) => Overrides) {
    setOverrides((prev) => {
      const next = normalizeOverrides(updater(prev));
      queuePlanOverrideSync(prev, next);
      saveOverrides(next);
      return next;
    });
    void runSync.current();
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
      pushUserPlace(updated);
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
    pushUserPlace(place);
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

  function setStatus(id: string, status: Status) {
    applyOverrides((o) => ({ ...o, [id]: { ...o[id], status } }));
  }

  function setNote(id: string, note: string) {
    applyOverrides((o) => ({ ...o, [id]: { ...o[id], note } }));
  }

  function setTimeMinutes(id: string, minutes: number | null) {
    applyOverrides((o) => {
      const current = o[id] ?? {};
      const next = { ...o };
      if (minutes == null) {
        const { timeMinutes, ...rest } = current;
        if (Object.keys(rest).length === 0) delete next[id];
        else next[id] = rest;
      } else {
        next[id] = { ...current, timeMinutes: minutes };
      }
      return next;
    });
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

  /** Ferry seconds for the leg between two places (0 if not marked). */
  function legFerrySec(idA: string, idB: string): number {
    return (ferryHours[ferryPairKey(idA, idB)] ?? 0) * 3600;
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
            className={`mode-pill ${mode}`}
            onClick={() => setMode(mode === 'trip' ? 'planning' : 'trip')}
            title="Switch between planning (research) and trip (on the road) mode"
          >
            {mode === 'trip' ? '🚗 Trip' : '🗺️ Planning'}
          </button>
        </div>

        {mode === 'trip' ? (
          <Suspense fallback={<PanelFallback text="Loading trip view…" />}>
            <Today
              day={tripDay}
              realDay={isDuringTrip() ? currentTripDay() : -1}
              onDay={setTripDay}
              stops={todayStops}
              route={routes[tripDay]}
              schedule={todaySchedule}
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
              dayNote={dayNotes[tripDay] ?? ''}
              onDayNote={(text) => setDayNote(tripDay, text)}
            />
          </Suspense>
        ) : (
        <>
        <p className="subtitle">
          Jun 16–28 · <strong>{statusCounts.shortlist}</strong> shortlisted · <strong>{statusCounts.backup}</strong> backup · <strong>{statusCounts.candidate}</strong> candidates
          <span
            className={`sync-state ${
              syncLabel === 'shared' ? 'on' : syncLabel === 'offline' ? 'warn' : ''
            }`}
            title={syncTitle}
          >
            {' '}
            · {syncLabel}
          </span>
        </p>

        <div className="view-tabs">
          <button
            className={view === 'places' || view === 'review' ? 'on' : ''}
            onClick={() => { setView('places'); setCorridor(null); setToolsOpen(false); }}
          >
            Places
          </button>
          <button
            className={view === 'itinerary' ? 'on' : ''}
            onClick={() => { setView('itinerary'); setCorridor(null); setToolsOpen(false); }}
          >
            Itinerary
          </button>
        </div>

        <input
          className="search"
          placeholder="Search name or note…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {!corridor && view !== 'itinerary' && view !== 'review' && (
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
                    onClick={() => setStatusFilter(toggle(statusFilter, s))}
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
                    style={categoryFilter.has(c) ? { borderColor: CATEGORY_COLORS[c], background: CATEGORY_COLORS[c] + '22' } : undefined}
                    onClick={() => setCategoryFilter(toggle(categoryFilter, c))}
                  >
                    <span className="dot" style={{ background: CATEGORY_COLORS[c] }} />
                    {c}
                  </button>
                ))}
              </div>
            </details>
          </>
        )}

        {corridor && (
          <Suspense fallback={<PanelFallback text="Loading corridor view…" />}>
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
          </Suspense>
        )}

        {!corridor && view === 'places' && (
          <>
        <div className="places-action-row">
          <button className="add-place-btn" onClick={openAddPlace}>
            ＋ Add place
          </button>
        </div>
            {visible.length === 0 && (
              <div className="place-list-empty">
                <p>No places match these filters.</p>
                {search && (
                  <button onClick={() => setSearch('')}>Clear search</button>
                )}
                {!statusFilter.has('candidate') && statusCounts.candidate > 0 && (
                  <button
                    className="hint-btn"
                    onClick={() => { setStatusFilter(toggle(statusFilter, 'candidate')); }}
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

        {!corridor && view === 'review' && (
          <Suspense fallback={<PanelFallback text="Loading triage view…" />}>
            <LazyReview
              places={places}
              onStatus={setStatus}
              onExit={() => setView('places')}
              onSelect={(p) => { selectPlace(p); }}
              selectedId={selectedId}
            />
          </Suspense>
        )}

        {!corridor && view === 'itinerary' && (
          <Suspense fallback={<PanelFallback text="Loading itinerary…" />}>
            <>
              <LazyItinerary
                places={places}
                routes={routes}
                routesLoading={routesLoading}
                realDay={isDuringTrip() ? currentTripDay() : -1}
                ferrySecByDay={dayFerrySec}
                selectedId={selectedId}
                onSelect={selectPlace}
                onMove={moveInDay}
                onAssignDay={assignDay}
                onFindSleep={findSleepAlongDay}
                dayNotes={dayNotes}
                scheduleByDay={daySchedules}
              />
            </>
          </Suspense>
        )}

        </>
        )}

        <div className="sidebar-footer">
          {mode === 'planning' && (
            <div className="tools-menu-wrap">
              <button
                className={`tools-pill ${toolsOpen ? 'on' : ''}`}
                onClick={() => setToolsOpen((v) => !v)}
                aria-expanded={toolsOpen}
                title="Secondary tools"
              >
                ⋯ More
              </button>
              {toolsOpen && (
                <div className="tools-menu" role="menu">
                  <button
                    role="menuitem"
                    onClick={() => {
                      setView('review');
                      setCorridor(null);
                      setToolsOpen(false);
                    }}
                  >
                    Triage
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setEssentialsOpen(true);
                      setToolsOpen(false);
                    }}
                  >
                    Essentials
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
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
                color: isSel ? '#FF3B30' : matchHi ? '#111' : '#ffffff',
                weight: isSel ? 4 : matchHi ? 2.5 : p.status === 'shortlist' ? 3 : 1.5,
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
        onTimeMinutes={setTimeMinutes}
        onEdit={selected?.userAdded ? () => openEditPlace(selected.id) : undefined}
        isDone={selected ? !!doneIds[selected.id] : false}
        onToggleDone={(id) => toggleDone(id)}
        nearbyActive={nearbyActive}
        nearbyRadius={nearbyRadius}
        nearbyCount={nearbyMatchIds.size}
        onToggleNearby={() => setNearbyActive((a) => !a)}
        onNearbyRadius={setNearbyRadius}
      />

      {addPlaceOpen && (
        <Suspense fallback={<DialogFallback title="Loading add place…" />}>
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
        </Suspense>
      )}

      {essentialsOpen && (
        <Suspense fallback={<DialogFallback title="Loading essentials…" />}>
          <LazyEssentials
            onClose={() => setEssentialsOpen(false)}
            tripMode={mode === 'trip'}
            onShowPin={focusPin}
          />
        </Suspense>
      )}

    </div>
  );
}
