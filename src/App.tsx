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
import {
  loadRemotePlacesCache,
  pushUserPlace,
  queuePlanOverrideSync,
  syncCollab,
} from './collab';
import {
  CATEGORY_COLORS,
  COUNTRY_NAMES,
  GROUP_META,
  GROUP_OF,
  GROUPS,
  STATUSES,
  toggle,
  type Group,
} from './constants';
import { bookingFor, type SourceLink } from './links';
import { fetchRoute, routeKey } from './osrm';
import {
  applyPlanOverrideRows,
  ferryPairKey,
  loadFerryHours,
  loadOverrides,
  loadPlaces,
  loadRouteCache,
  loadUserPlaces,
  saveOverrides,
  saveRouteCache,
  saveUserPlaces,
  normalizeOverrides,
  type FerryHours,
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
} from './trip';
import type { Category, Country, Place, Status } from './types';
import { useDayRoutes } from './useDayRoutes';

const AddPlace = lazy(() => import('./components/AddPlace'));
const CorridorPanel = lazy(() => import('./components/CorridorPanel'));
const LazyEssentials = lazy(() => import('./components/Essentials'));
const LazyPlan = lazy(() => import('./components/Itinerary'));
const LazyMix = lazy(() => import('./components/ActivityMix'));
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

type View = 'places' | 'plan' | 'mix';

// Categories that count as a place to sleep (used when prepending the previous
// night's overnight to a day's route).
const SLEEP_CATEGORIES: Category[] = ['campsite', 'accommodation'];

const NON_REJECTED: Status[] = ['candidate', 'shortlist', 'extra', 'backup'];
const DEFAULT_PLAN_STATUSES: Status[] = ['shortlist'];

// Per-day schedule settings (start hour + pace) ride in a single sentinel
// plan_overrides row so they sync across devices through the existing layer
// without a new table. The id matches no real place, so it never renders.
const DAY_CONFIG_ID = '__day_config__';
type DayConfig = Record<number, { startHour?: number; endHour?: number; pace?: number }>;
function parseDayConfig(note: string | undefined): DayConfig {
  if (!note) return {};
  try {
    const o = JSON.parse(note);
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as DayConfig) : {};
  } catch {
    return {};
  }
}

function insertionDetourKm(
  prev: Pick<PlaceWithOverride, 'lat' | 'lng'> | undefined,
  next: Pick<PlaceWithOverride, 'lat' | 'lng'> | undefined,
  candidate: Pick<PlaceWithOverride, 'lat' | 'lng'>,
): number {
  if (prev && next) {
    return (
      haversineKm(prev.lat, prev.lng, candidate.lat, candidate.lng) +
      haversineKm(candidate.lat, candidate.lng, next.lat, next.lng) -
      haversineKm(prev.lat, prev.lng, next.lat, next.lng)
    );
  }
  if (prev) return haversineKm(prev.lat, prev.lng, candidate.lat, candidate.lng);
  if (next) return haversineKm(candidate.lat, candidate.lng, next.lat, next.lng);
  return 0;
}

function chooseBestInsertionIndex(
  candidate: Pick<PlaceWithOverride, 'lat' | 'lng' | 'category'>,
  stops: PlaceWithOverride[],
): number {
  if (stops.length === 0) return 0;
  const preferLater = candidate.category === 'campsite' || candidate.category === 'accommodation';
  const tolerance = 0.05; // ~50m: small enough to stay practical, big enough for ties.
  let bestIndex = 0;
  let bestScore = Infinity;

  for (let i = 0; i <= stops.length; i++) {
    const score = insertionDetourKm(stops[i - 1], stops[i], candidate);
    if (score + tolerance < bestScore) {
      bestScore = score;
      bestIndex = i;
      continue;
    }
    if (Math.abs(score - bestScore) <= tolerance) {
      bestIndex = preferLater ? Math.max(bestIndex, i) : Math.min(bestIndex, i);
    }
  }
  return bestIndex;
}

function dayOrderForInsertion(stops: PlaceWithOverride[], index: number): number {
  const prev = stops[index - 1];
  const next = stops[index];
  const prevOrder = prev?.dayOrder ?? index - 1;
  const nextOrder = next?.dayOrder ?? index;

  if (!prev && !next) return 0;
  if (!prev) return nextOrder - 1;
  if (!next) return prevOrder + 1;
  if (nextOrder <= prevOrder) return prevOrder + 0.5;
  return (prevOrder + nextOrder) / 2;
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

  // Filter by category GROUP (Eat/Swim/Active/See/Sleep/Nightlife/Logistics)
  // instead of the 12 fine-grained categories — fewer, clearer buttons.
  const [groupFilter, setGroupFilter] = useState<Set<Group>>(new Set(GROUPS));
  // Default view shows the committed plan (shortlist); other statuses (candidate,
  // extra, backup) are one tap away via the status chips.
  const [statusFilter, setStatusFilter] = useState<Set<Status>>(
    new Set<Status>(DEFAULT_PLAN_STATUSES),
  );
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  function resetFilters() {
    setGroupFilter(new Set(GROUPS));
    setStatusFilter(new Set(NON_REJECTED));
  }
  const filtersNarrowed =
    groupFilter.size < GROUPS.length || !NON_REJECTED.every((s) => statusFilter.has(s));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>('places');
  const [toolsOpen, setToolsOpen] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  // On phones the open sidebar fills the screen and would cover the detail
  // bottom-sheet, so selecting a place auto-collapses it; we remember whether
  // it was open so closing the sheet restores the list.
  const reopenSidebarOnClose = useRef(false);
  // Currently-viewed day in the Plan view (defaults to today's trip day if the
  // trip is underway, else Day 1).
  const [planDay, setPlanDay] = useState(currentTripDay());
  const [undoToast, setUndoToast] = useState<{ label: string; undo: () => void } | null>(null);

  // ---- Add place (feature A) ----
  // addPlaceOpen drives both the form and the tap-the-map capture. editingId is
  // set when editing an existing user place. tappedPoint is the last map tap.
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tappedPoint, setTappedPoint] = useState<{ lat: number; lng: number } | null>(null);

  // ---- Offline Essentials (feature B5) ----
  const [essentialsOpen, setEssentialsOpen] = useState(false);

  const mapRef = useRef<L.Map | null>(null);

  // Auto-dismiss the undo toast.
  useEffect(() => {
    if (!undoToast) return;
    const t = setTimeout(() => setUndoToast(null), 6000);
    return () => clearTimeout(t);
  }, [undoToast]);

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
      groupFilter.has(GROUP_OF[p.category]) &&
      statusFilter.has(p.status) &&
      matchesText(p),
  );

  // Facet counts per status (respecting the group + search filters, but not status).
  const statusCounts = useMemo(() => {
    const counts: Record<Status, number> = {
      candidate: 0,
      shortlist: 0,
      extra: 0,
      backup: 0,
      rejected: 0,
    };
    for (const p of places) {
      if (groupFilter.has(GROUP_OF[p.category]) && matchesText(p)) {
        counts[p.status]++;
      }
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, groupFilter, search]);

  const rejected = places.filter((p) => p.status === 'rejected');

  // ---- Per-day driving routes (feature 2) ----
  const dayStops = useMemo(() => {
    const grouped: Record<number, PlaceWithOverride[]> = {};
    for (const p of places) {
      // Rejected places keep their day in storage (so un-rejecting restores it)
      // but must not appear in the route, schedule, or itinerary — same as the map.
      if (!p.day || p.status === 'rejected') continue;
      (grouped[p.day] ??= []).push(p);
    }
    for (const ps of Object.values(grouped)) ps.sort(byOrder);
    return grouped;
  }, [places]);

  // The route line + driving + day-fit clock reflect only the COMMITTED plan
  // (shortlist & friends). `extra` = situational "what else is around here"
  // options the group browses on the ground — they must never bend the route
  // or the schedule, even if one has a day assigned.
  const routeStops = useMemo(() => {
    const out: Record<number, PlaceWithOverride[]> = {};
    for (const [day, ps] of Object.entries(dayStops)) {
      const kept = ps.filter((p) => p.status !== 'extra');
      if (kept.length) out[Number(day)] = kept;
    }
    return out;
  }, [dayStops]);

  const dayPoints = useMemo(() => {
    const result: Record<number, [number, number][]> = {};
    for (const [dayStr, ps] of Object.entries(routeStops)) {
      const dayNum = Number(dayStr);
      const pts: [number, number][] = ps.map((p) => [p.lat, p.lng]);
      // Prepend the previous night's sleep location so the route — and its
      // drive time — covers the full day including the morning relocation drive.
      const prevPs = routeStops[dayNum - 1];
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
  }, [routeStops]);

  const { routes, loading: routesLoading } = useDayRoutes(dayPoints);

  // Manual ferry hours per day (sum over the day's consecutive stop pairs).
  const dayFerrySec = useMemo(() => {
    const out: Record<number, number> = {};
    for (const [day, ps] of Object.entries(routeStops)) {
      let s = 0;
      for (let i = 0; i < ps.length - 1; i++) {
        s += (ferryHours[ferryPairKey(ps[i].id, ps[i + 1].id)] ?? 0) * 3600;
      }
      if (s > 0) out[Number(day)] = s;
    }
    return out;
  }, [routeStops, ferryHours]);

  const dayConfig = useMemo<DayConfig>(
    () => parseDayConfig(overrides[DAY_CONFIG_ID]?.note),
    [overrides],
  );
  const setDayCfg = (day: number, patch: { startHour?: number; endHour?: number; pace?: number }) => {
    applyOverrides((o) => {
      const cfg = parseDayConfig(o[DAY_CONFIG_ID]?.note);
      const entry: { startHour?: number; endHour?: number; pace?: number } = { ...cfg[day] };
      for (const k of Object.keys(patch) as (keyof typeof patch)[]) {
        if (patch[k] === undefined) delete entry[k];
        else entry[k] = patch[k];
      }
      const next: DayConfig = { ...cfg };
      if (Object.keys(entry).length === 0) delete next[day];
      else next[day] = entry;
      return { ...o, [DAY_CONFIG_ID]: { note: JSON.stringify(next) } };
    });
  };

  const daySchedules = useMemo(() => {
    const out: Record<number, ReturnType<typeof buildDaySchedule>> = {};
    for (const [dayStr, stops] of Object.entries(routeStops)) {
      const day = Number(dayStr);
      const route = routes[day];
      if (!route) continue;
      const schedule = buildDaySchedule(
        stops,
        route,
        (idA, idB) => ferryHours[ferryPairKey(idA, idB)] ?? 0,
        {
          dayStartHour: dayConfig[day]?.startHour,
          dayEndHour: dayConfig[day]?.endHour,
          paceMultiplier: dayConfig[day]?.pace,
        },
      );
      if (schedule) out[day] = schedule;
    }
    return out;
  }, [routeStops, routes, ferryHours, dayConfig]);

  const syncLabel = syncOnline ? 'online' : 'offline';
  const syncTitle = syncOnline
    ? 'Shared sync is online.'
    : 'Shared sync is offline right now; local changes stay on this device and will queue until it reconnects.';

  // In the Plan view, draw only the selected day's route; in Places, none.
  const routeDaysToShow = useMemo(() => {
    if (view === 'plan') return new Set<number>([planDay]);
    return null;
  }, [view, planDay]);

  function focusPlanDay(day: number) {
    setView('plan');
    setPlanDay(day);
    if (!sidebarOpen) setSidebarOpen(true);
  }

  // Changing the viewed Plan day focuses the map on that day's stops.
  useEffect(() => {
    if (view !== 'plan') return;
    const pts = (dayStops[planDay] ?? []).map((p) => [p.lat, p.lng] as [number, number]);
    if (pts.length > 0 && mapRef.current) {
      mapRef.current.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 12 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, planDay]);

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
    const base = visible;
    const forced = new Set<string>([...nearbyMatchIds, ...corridorMatchIds, ...corridorStopIds]);
    // Always show the selected place even if rejected or filtered out.
    if (selectedId) forced.add(selectedId);
    if (forced.size === 0) return base;
    const inBase = new Set(base.map((p) => p.id));
    const extra = places.filter((p) => forced.has(p.id) && !inBase.has(p.id));
    return [...base, ...extra];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, nearbyMatchIds, corridorMatchIds, corridorStopIds, selectedId]);

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
      const existing = placeById.get(editingId);
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
        [editingId]: (() => {
          const current = o[editingId];
          const next = { ...(current ?? {}) };
          if (draft.day == null) {
            delete next.day;
            delete next.dayOrder;
          } else if (existing?.day === draft.day && current?.dayOrder != null) {
            next.day = draft.day;
            next.dayOrder = current.dayOrder;
          } else {
            const peers = (dayStops[draft.day] ?? []).filter((p) => p.id !== editingId);
            const insertAt = chooseBestInsertionIndex(
              { lat: draft.lat!, lng: draft.lng!, category: draft.category },
              peers,
            );
            next.day = draft.day;
            next.dayOrder = dayOrderForInsertion(peers, insertAt);
          }
          if (draft.note) next.note = draft.note;
          else delete next.note;
          return next;
        })(),
      }));
      // Propagate the edit to the other phones too.
      pushUserPlace(updated);
      void runSync.current();
      if (draft.day != null) focusPlanDay(draft.day);
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
        [id]: (() => {
          const next = { ...(o[id] ?? {}) };
          if (draft.day != null) {
            const peers = (dayStops[draft.day] ?? []).filter((p) => p.id !== id);
            const insertAt = chooseBestInsertionIndex(
              { lat: draft.lat!, lng: draft.lng!, category: draft.category },
              peers,
            );
            next.day = draft.day;
            next.dayOrder = dayOrderForInsertion(peers, insertAt);
          }
          if (draft.note) next.note = draft.note;
          else delete next.note;
          return next;
        })(),
      }));
    }
    // Sync to user_places so all 4 phones see this pin (best-effort + queued).
    pushUserPlace(place);
    void runSync.current();
    if (draft.day != null) focusPlanDay(draft.day);
    closeAddPlace();
    setSelectedId(id); // open the detail panel on the new pin
  }

  function deleteUserPlace(id: string) {
    if (!confirm('Delete this place? This cannot be undone.')) return;
    applyUserPlaces((u) => u.filter((p) => p.id !== id));
    // Clean its override so nothing dangles.
    applyOverrides((o) => {
      const next = { ...o };
      delete next[id];
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
    const place = placeById.get(id);
    if (!place) return;
    if (place.day === day && place.dayOrder != null) return;
    const peers = (dayStops[day] ?? []).filter((p) => p.id !== id);
    const insertAt = chooseBestInsertionIndex(place, peers);
    const order = dayOrderForInsertion(peers, insertAt);
    applyOverrides((o) => ({ ...o, [id]: { ...o[id], day, dayOrder: order } }));
  }

  function moveInDay(id: string, dir: 'up' | 'down') {
    const place = placeById.get(id);
    if (!place?.day) return;
    const day = place.day;
    const ordered = places
      .filter((p) => p.day === day && p.status !== 'rejected')
      .sort(byOrder);
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
        </div>

        <>
        <p className="subtitle">
          Jun 16–28 · trip plan
          <span
            className={`sync-state ${
              syncLabel === 'online' ? 'on' : ''
            }`}
            title={syncTitle}
          >
            {' '}
            · {syncLabel}
          </span>
        </p>

        <div className="view-tabs">
          <button
            className={view === 'places' ? 'on' : ''}
            onClick={() => { setView('places'); setCorridor(null); setToolsOpen(false); }}
          >
            Places
          </button>
          <button
            className={view === 'plan' ? 'on' : ''}
            onClick={() => { setView('plan'); setCorridor(null); setToolsOpen(false); }}
          >
            Plan
          </button>
          <button
            className={view === 'mix' ? 'on' : ''}
            onClick={() => { setView('mix'); setCorridor(null); setToolsOpen(false); }}
          >
            Highlights
          </button>
        </div>

        {view === 'places' && (
          <input
            className="search"
            placeholder="Search name or note…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}

        {!corridor && view === 'places' && (
          <>
            {/* What: category-group chips (the primary "what do we want" filter). */}
            <div className="filter-group">
              {GROUPS.map((g) => (
                <button
                  key={g}
                  className={`chip ${groupFilter.has(g) ? 'on' : ''}`}
                  style={groupFilter.has(g) ? { borderColor: GROUP_META[g].color, background: GROUP_META[g].color + '22' } : undefined}
                  onClick={() => setGroupFilter(toggle(groupFilter, g))}
                >
                  <span className="dot" style={{ background: GROUP_META[g].color }} />
                  {GROUP_META[g].icon} {GROUP_META[g].label}
                </button>
              ))}
            </div>

            {/* Decision state: status chips with live counts. */}
            <div className="filter-group">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  className={`chip ${statusFilter.has(s) ? `on badge-${s}` : ''}`}
                  onClick={() => setStatusFilter(toggle(statusFilter, s))}
                >
                  {s} <span className="chip-count">{statusCounts[s]}</span>
                </button>
              ))}
            </div>

            {filtersNarrowed && (
              <div className="filter-group">
                <button className="chip chip-hint" onClick={resetFilters}>
                  ↺ Reset filters
                </button>
              </div>
            )}
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
                <button onClick={resetFilters}>Reset filters</button>
              </div>
            )}

            <ul className="place-list">
              {[...visible]
                .sort((a, b) => {
                  const statusOrder = { shortlist: 0, extra: 1, backup: 2, candidate: 3, rejected: 4 };
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

        {!corridor && view === 'mix' && (
          <Suspense fallback={<PanelFallback text="Loading highlights…" />}>
            <LazyMix places={places} onPickDay={focusPlanDay} />
          </Suspense>
        )}

        {!corridor && view === 'plan' && (
          <Suspense fallback={<PanelFallback text="Loading plan…" />}>
            <LazyPlan
              day={planDay}
              onDay={setPlanDay}
              places={places}
              routes={routes}
              routesLoading={routesLoading}
              realDay={isDuringTrip() ? currentTripDay() : -1}
              ferrySecByDay={dayFerrySec}
              selectedId={selectedId}
              onSelect={selectPlace}
              onMove={moveInDay}
              onAssignDay={assignDay}
              scheduleByDay={daySchedules}
              dayConfig={dayConfig}
              onSetDayCfg={setDayCfg}
            />
          </Suspense>
        )}

        </>

        <div className="sidebar-footer">
          <button
            className="tools-pill"
            onClick={() => setEssentialsOpen(true)}
            title="Shared pre-trip checklist + offline route cache"
          >
            ✅ Checklist
          </button>
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
          .filter(([day]) => !routeDaysToShow || routeDaysToShow.has(Number(day)))
          .map(([day, r]) => (
            <Polyline
              key={`day-${day}`}
              positions={toLatLngs(r.coordinates)}
              pathOptions={{ color: dayColor(Number(day)), weight: 4, opacity: 0.75 }}
            />
          ))}

        {/* Corridor route highlight */}
        {corridor && (
          <Polyline
            positions={corridor.coords}
            pathOptions={{ color: '#8e44ad', weight: 6, opacity: 0.35 }}
          />
        )}

        {markersToShow.map((p) => {
          const isSel = p.id === selectedId;
          let dim = false;
          let matchHi = false;
          let radius = p.status === 'shortlist' ? 10 : 7;
          if (isSel) radius = 15;
          if (corridor) {
            matchHi = corridorMatchIds.has(p.id);
            dim = !matchHi && !corridorStopIds.has(p.id);
            if (matchHi) radius = 11;
          } else if (nearbyActive && selected) {
            matchHi = nearbyMatchIds.has(p.id);
            dim = selectedId !== p.id && !matchHi;
            if (matchHi) radius = 11;
          }
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
                fillOpacity: dim ? 0.15 : p.status === 'rejected' ? 0.3 : 0.9,
                opacity: dim ? 0.2 : 1,
              }}
              eventHandlers={{ click: () => selectPlace(p) }}
            />
          );
        })}

      </MapContainer>

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
        onClose={closeDetail}
        onStatus={setStatus}
        onAssignDay={assignDay}
        onFocusDay={focusPlanDay}
        onTimeMinutes={setTimeMinutes}
        onEdit={selected?.userAdded ? () => openEditPlace(selected.id) : undefined}
      />

      {addPlaceOpen && (
        <Suspense fallback={<DialogFallback title="Loading add place…" />}>
          <AddPlace
            tappedPoint={tappedPoint}
            gpsFix={null}
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
            onShowPin={focusPin}
            onPrepOffline={prepOffline}
            prepping={prepping}
          />
        </Suspense>
      )}

    </div>
  );
}
