import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import CorridorPanel, { type CorridorMatch } from './components/CorridorPanel';
import DetailPanel from './components/DetailPanel';
import Itinerary from './components/Itinerary';
import RouteBuilder from './components/RouteBuilder';
import Today, { type ProximityMatch } from './components/Today';
import {
  CATEGORIES,
  CATEGORY_COLORS,
  COUNTRIES,
  COUNTRY_NAMES,
  STATUSES,
  toggle,
} from './constants';
import { fetchRoute, fetchTable, fetchTrip, routeKey, type LatLng } from './osrm';
import { solveOrder, type SolveResult } from './solver';
import {
  ferryPairKey,
  loadDone,
  loadFerryHours,
  loadLastFix,
  loadOverrides,
  loadPlaces,
  loadSavedMode,
  loadTripCache,
  saveDone,
  saveFerryHours,
  saveLastFix,
  saveMode,
  saveOverrides,
  saveTripCache,
  type FerryHours,
  type GpsFix,
  type Mode,
  type Overrides,
  type PlaceWithOverride,
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

type View = 'places' | 'itinerary' | 'route';

// Categories that count as a place to sleep, for the nearby finder.
const SLEEP_CATEGORIES: Category[] = ['campsite', 'accommodation'];

// Sightseeing categories for the trip-mode "Near me" finder.
const SIGHT_CATEGORIES: Category[] = ['sight', 'viewpoint', 'beach', 'hike', 'activity', 'nature'];

const SLEEP_TONIGHT_KM = 25;
const NEAR_ME_KM = 30;

const byOrder = (a: PlaceWithOverride, b: PlaceWithOverride) =>
  (a.dayOrder ?? 0) - (b.dayOrder ?? 0) || a.name.localeCompare(b.name);

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

function numberIcon(n: number, color: string) {
  return L.divIcon({
    className: 'num-marker',
    html: `<div style="background:${color}">${n}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export default function App() {
  const basePlaces = useMemo(loadPlaces, []);
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

  const [countryFilter, setCountryFilter] = useState<Set<Country>>(new Set(COUNTRIES));
  const [categoryFilter, setCategoryFilter] = useState<Set<Category>>(new Set(CATEGORIES));
  // Planning default: the plan you care about (shortlist+backup) — the candidate
  // haystack is one tap away on the status chips.
  const [statusFilter, setStatusFilter] = useState<Set<Status>>(
    new Set<Status>(['shortlist', 'backup']),
  );
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>('places');
  const [fitNonce, setFitNonce] = useState(0);

  // ---- Planning mode vs Trip mode ----
  // Trip mode is the on-the-road UI: today-centric, no research machinery.
  const [mode, setModeState] = useState<Mode>(
    () => loadSavedMode() ?? (isDuringTrip() ? 'trip' : 'planning'),
  );
  const [sidebarOpen, setSidebarOpen] = useState(mode === 'trip');
  const [tripDay, setTripDay] = useState(currentTripDay());
  const [doneIds, setDoneIds] = useState<Record<string, boolean>>(loadDone);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [nearOpen, setNearOpen] = useState(false);
  const [undoToast, setUndoToast] = useState<{ label: string; undo: () => void } | null>(null);

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
      (p.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  };

  const matchesTags = (p: PlaceWithOverride) =>
    tagFilter.size === 0 || (p.tags ?? []).some((t) => tagFilter.has(t));

  const visible = places.filter(
    (p) =>
      countryFilter.has(p.country) &&
      categoryFilter.has(p.category) &&
      statusFilter.has(p.status) &&
      matchesTags(p) &&
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
    if (forced.size === 0) return base;
    const inBase = new Set(base.map((p) => p.id));
    const extra = places.filter((p) => forced.has(p.id) && !inBase.has(p.id));
    return [...base, ...extra];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tripBase, visible, tripMatchIds, nearbyMatchIds, corridorMatchIds, corridorStopIds]);

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

    const key = `trip2:${routeKey(points)}|a:${anchorSeq.length}`;
    const cache = loadTripCache();
    let result: TripResult | null = cache[key] ?? null;

    if (!result) {
      // 1. Duration matrix (one cheap call).
      const table = await fetchTable(points);
      if (!table) {
        setRbBuilding(false);
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
        setRbBuilding(false);
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
    setRbBuilding(false);
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
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(places, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'places-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  const showTripLayer = view === 'route' && !!rbTrip;

  return (
    <div className="app">
      <button
        className="sidebar-fab"
        onClick={() => setSidebarOpen((s) => !s)}
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
            {mode === 'trip' ? '🚗 Trip' : '🗺 Planning'}
          </button>
        </div>

        {mode === 'trip' ? (
          <Today
            day={tripDay}
            realDay={currentTripDay()}
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
          />
        ) : (
        <>
        <p className="subtitle">
          Jun 16–28 · Zadar → Dubrovnik · {visible.length}/{places.length} places
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
        </div>

        <input
          className="search"
          placeholder="Search name, note, tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {!corridor && view !== 'itinerary' && (
          <>
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
                  style={{ borderColor: CATEGORY_COLORS[c] }}
                  onClick={() => setCategoryFilter(toggle(categoryFilter, c))}
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
            <ul className="place-list">
              {[...visible]
                .sort(
                  (a, b) =>
                    (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name),
                )
                .map((p) => (
                  <li
                    key={p.id}
                    className={selectedId === p.id ? 'selected' : ''}
                    onClick={() => selectPlace(p)}
                  >
                    <span className="dot" style={{ background: CATEGORY_COLORS[p.category] }} />
                    <span className="place-name">{p.name}</span>
                    {p.day && (
                      <span className="day-tag" style={{ background: dayColor(p.day) }}>
                        D{p.day}
                      </span>
                    )}
                    {p.note && <span className="note-tag" title={p.note}>📝</span>}
                    <span className={`badge badge-${p.status}`}>{p.status}</span>
                  </li>
                ))}
            </ul>

            {rejected.length > 0 && (
              <details className="rejected-box">
                <summary>Rejected ({rejected.length})</summary>
                <ul className="place-list rejected-list">
                  {rejected.map((p) => (
                    <li key={p.id}>
                      <span
                        className="dot"
                        style={{ background: CATEGORY_COLORS[p.category] }}
                      />
                      <span className="place-name">{p.name}</span>
                      <button className="restore" onClick={() => setStatus(p.id, 'candidate')}>
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

        <div className="sidebar-actions">
          <button className="export" onClick={() => setFitNonce((n) => n + 1)}>
            Fit map
          </button>
          <button className="export" onClick={exportJson}>
            Export JSON
          </button>
        </div>
        </>
        )}
      </aside>

      <MapContainer ref={mapRef} className="map" center={[43.4, 17.3]} zoom={7} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HashSync />
        <FlyTo placeId={selectedId} lat={selected?.lat} lng={selected?.lng} />
        <FitBounds pts={visible.map((p) => [p.lat, p.lng])} nonce={fitNonce} />

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
          const rbSel = !isTrip && view === 'route' && rbSelected.has(p.id);
          let dim = false;
          let matchHi = false;
          let radius = p.status === 'shortlist' ? 10 : 7;
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
          return (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={radius}
              pathOptions={{
                color: rbSel || matchHi ? '#111' : '#ffffff',
                weight: rbSel ? 3.5 : matchHi ? 2.5 : p.status === 'shortlist' ? 3 : 1.5,
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
            >
              {/* Trip mode: a tap opens the detail sheet directly — no popup two-step */}
              {!isTrip && (
                <Popup maxWidth={260}>
                  <div className="popup">
                    <h3>{p.name}</h3>
                    <p className="meta">
                      {p.category} · {COUNTRY_NAMES[p.country]}
                      {p.day ? ` · Day ${p.day}` : ''}
                    </p>
                    <div className="status-buttons">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          className={p.status === s ? `on badge-${s}` : ''}
                          onClick={() => setStatus(p.id, s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <button className="popup-details" onClick={() => selectPlace(p)}>
                      Details →
                    </button>
                  </div>
                </Popup>
              )}
            </CircleMarker>
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
        onClose={() => setSelectedId(null)}
        onStatus={setStatus}
        onAssignDay={assignDay}
        onNote={setNote}
        nearbyActive={nearbyActive}
        nearbyRadius={nearbyRadius}
        nearbyCount={nearbyMatchIds.size}
        onToggleNearby={() => setNearbyActive((a) => !a)}
        onNearbyRadius={setNearbyRadius}
      />
    </div>
  );
}
