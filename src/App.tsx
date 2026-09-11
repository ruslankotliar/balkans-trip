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
import { fetchRoute, routeKey, type LatLng } from './osrm';
import {
  ferryPairKey,
  loadFerryHours,
  loadOverrides,
  loadPlaces,
  loadRouteCache,
  loadUserPlaces,
  saveOverrides,
  saveRouteCache,
  saveUserPlaces,
  guessCountry,
  normalizeOverrides,
  type FerryHours,
  type Overrides,
  type PlaceWithOverride,
} from './store';
import { buildDaySchedule } from './schedule';
import {
  currentTripDay,
  dayColor,
  haversineKm,
  isDuringTrip,
  setTripConfig,
} from './trip';
import { findTrip, pickInitialTripId, setActiveTripId, TRIPS, type TripConfig } from './trips';
import type { Category, Country, Place, Status } from './types';
import { useDayRoutes } from './useDayRoutes';

const AddPlace = lazy(() => import('./components/AddPlace'));
const LazyEssentials = lazy(() => import('./components/Essentials'));
const LazyPlan = lazy(() => import('./components/Itinerary'));
const LazyBoard = lazy(() => import('./components/TripBoard'));
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

type View = 'places' | 'plan' | 'board' | 'mix';

// Categories that count as a place to sleep (used when prepending the previous
// night's overnight to a day's route).
const SLEEP_CATEGORIES: Category[] = ['campsite', 'accommodation'];

const NON_REJECTED: Status[] = ['candidate', 'shortlist', 'extra', 'backup'];
const DEFAULT_PLAN_STATUSES: Status[] = ['shortlist'];

// Per-day schedule settings (start hour + pace) ride in a single sentinel
// plan_overrides row so they sync across devices through the existing layer
// without a new table. The id matches no real place, so it never renders.
const DAY_CONFIG_ID = '__day_config__';
type DayConfig = Record<number, { startHour?: number; endHour?: number; pace?: number; note?: string }>;
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

/** Flies the map to the active trip's region whenever the trip changes. */
function FlyToTrip({ center, zoom, tripId }: { center: [number, number]; zoom: number; tripId: string }) {
  const map = useMap();
  const prevId = useRef(tripId);
  useEffect(() => {
    if (prevId.current !== tripId) {
      prevId.current = tripId;
      map.flyTo(center, zoom, { duration: 0.9 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);
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
  // MUST be first: initializes the active-trip singleton before any loadXxx()
  // calls below, so all localStorage keys resolve to the correct trip.
  const [currentTripId, setCurrentTripId] = useState<string>(() => {
    const id = pickInitialTripId(localStorage.getItem('current-trip-id'));
    const trip = findTrip(id);
    setActiveTripId(id);
    setTripConfig(trip.startDate, trip.numDays);
    return id;
  });
  const activeTrip: TripConfig = findTrip(currentTripId);

  // User-added places merge after the bundle so a runtime pin can override a
  // baked id without breaking the rest of the app. Everything lives in this
  // phone's localStorage - there is no server behind the app.
  const [userPlaces, setUserPlaces] = useState<Place[]>(loadUserPlaces);
  // Merge baked -> user places (first id wins), then keep the active trip's countries.
  const basePlaces = useMemo<Place[]>(() => {
    const tripCountries = new Set<Country>(activeTrip.countries);
    return [...loadPlaces(), ...userPlaces].filter((p) => tripCountries.has(p.country));
  }, [userPlaces, currentTripId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Switch to a different trip: reconfigure module singletons then reload all trip-scoped state. */
  function switchTrip(id: string) {
    if (id === currentTripId) return;
    const trip = findTrip(id);
    // Update singletons first so subsequent loadXxx() calls use the new keys.
    setActiveTripId(id);
    setTripConfig(trip.startDate, trip.numDays);
    localStorage.setItem('current-trip-id', id);
    // Reload trip-specific state from the new localStorage keys.
    setCurrentTripId(id);
    setOverrides(loadOverrides());
    setUserPlaces(loadUserPlaces());
    setFerryHours(loadFerryHours());
    setSelectedId(null);
    setPlanDay(currentTripDay());
    // Show all non-rejected places when switching trips (new trips have no shortlisted items yet).
    setStatusFilter(new Set(NON_REJECTED));
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
  // Selected option index per optionGroup ID — shared between itinerary row and sidebar tabs.
  const [optGroupSel, setOptGroupSel] = useState<Record<string, number>>({});
  // On the road the plan for today is the screen you want; while planning, the places.
  const [view, setView] = useState<View>(() => (isDuringTrip() ? 'plan' : 'places'));

  const [sidebarOpen, setSidebarOpen] = useState(() => isDuringTrip());
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
  const [addOptionGroupId, setAddOptionGroupId] = useState<string | null>(null);

  // ---- Offline Essentials (feature B5) ----
  const [essentialsOpen, setEssentialsOpen] = useState(false);

  const mapRef = useRef<L.Map | null>(null);
  // Leaflet is ready a tick after mount; the day-fit effect below waits for it
  // (the app now opens straight on the Plan view during the trip).
  const [mapReady, setMapReady] = useState(false);

  // Auto-dismiss the undo toast.
  useEffect(() => {
    if (!undoToast) return;
    const t = setTimeout(() => setUndoToast(null), 6000);
    return () => clearTimeout(t);
  }, [undoToast]);

  // Manual ferry hours per leg (persisted; keyed by place-id pair)
  const [ferryHours, setFerryHours] = useState<FerryHours>(loadFerryHours);

  const selected = selectedId ? placeById.get(selectedId) ?? null : null;
  // When the selected place belongs to an option group, collect all siblings
  // (same optionGroup, not rejected) so the sidebar can show comparison tabs.
  const groupOptions = (() => {
    const gid = selected?.optionGroup;
    if (!gid) return undefined;
    const opts = places
      .filter((p) => p.optionGroup === gid && p.status !== 'rejected')
      .sort((a, b) => (a.dayOrder ?? 0) - (b.dayOrder ?? 0));
    return opts.length > 1 ? opts : undefined;
  })();
  const selectedGroupIdx = groupOptions
    ? Math.max(0, groupOptions.findIndex((p) => p.id === selected?.id))
    : 0;

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
      // The route/clock is ONLY the committed plan: shortlist + a day. Anything
      // else pinned to a day (backup/candidate/extra) is an option, not routed.
      const kept = ps.filter((p) => p.status === 'shortlist'); // already sorted by byOrder
      // For option groups, include only the ACTIVE alternative — not all of them as
      // sequential stops (that would sum their durations and route through all locations).
      const seenGroups = new Set<string>();
      const deduped = kept.filter((p) => {
        if (!p.optionGroup) return true;
        const gid = p.optionGroup;
        if (seenGroups.has(gid)) return false;
        seenGroups.add(gid);
        const members = kept.filter((q) => q.optionGroup === gid);
        const activeIdx = Math.min(optGroupSel[gid] ?? 0, members.length - 1);
        return p.id === members[activeIdx].id;
      });
      if (deduped.length) out[Number(day)] = deduped;
    }
    return out;
  }, [dayStops, optGroupSel]);

  /** Where the previous night was slept: the last sleep stop of the day before, else its last stop. */
  const prevSleepOf = (day: number): PlaceWithOverride | undefined => {
    const prevPs = routeStops[day - 1];
    if (!prevPs || prevPs.length === 0) return undefined;
    const sleepSet = new Set<string>(SLEEP_CATEGORIES);
    return [...prevPs].reverse().find((p) => sleepSet.has(p.category)) ?? prevPs[prevPs.length - 1];
  };

  // Each day's travel, stop by stop. A ROAD CHAIN is a run of stops reached by
  // car: it starts at the previous stop (or last night's sleep) and is routed by
  // OSRM in one call. A stop with legMinutes (on foot, or a drive not worth
  // routing) breaks the chain - it gets a fixed leg and a dashed straight
  // line - and the next road leg starts from it.
  const dayTravel = useMemo(() => {
    type LegSource = { fixedSec: number } | { chain: string; legIdx: number };
    const chains: Record<string, LatLng[]> = {};
    const legs: Record<number, LegSource[]> = {};
    const fixedSegs: Record<number, [LatLng, LatLng][]> = {};
    const same = (a: LatLng, b: LatLng) => Math.abs(a[0] - b[0]) < 0.001 && Math.abs(a[1] - b[1]) < 0.001;
    for (const [dayStr, ps] of Object.entries(routeStops)) {
      const day = Number(dayStr);
      const prevSleep = prevSleepOf(day);
      const dayLegs: LegSource[] = [];
      const segs: [LatLng, LatLng][] = [];
      let chainIdx = 0;
      let chainPts: LatLng[] = prevSleep ? [[prevSleep.lat, prevSleep.lng]] : [];
      const closeChain = () => {
        if (chainPts.length >= 2) chains[`${day}:${chainIdx}`] = chainPts;
        chainIdx += 1;
        chainPts = [];
      };
      ps.forEach((p, i) => {
        const pt: LatLng = [p.lat, p.lng];
        if (p.legMinutes != null) {
          closeChain();
          const from = i > 0 ? ps[i - 1] : prevSleep;
          if (from) segs.push([[from.lat, from.lng], pt]);
          dayLegs.push({ fixedSec: Math.round(p.legMinutes * 60) });
          chainPts = [pt];
          return;
        }
        if (chainPts.length === 0 || (chainPts.length === 1 && same(chainPts[0], pt))) {
          // Nothing to drive from (day 1), or we wake up at this very stop.
          dayLegs.push({ fixedSec: 0 });
          chainPts = [pt];
          return;
        }
        chainPts.push(pt);
        dayLegs.push({ chain: `${day}:${chainIdx}`, legIdx: chainPts.length - 2 });
      });
      closeChain();
      legs[day] = dayLegs;
      if (segs.length) fixedSegs[day] = segs;
    }
    return { chains, legs, fixedSegs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeStops]);

  const { routes, loading: routesLoading } = useDayRoutes(dayTravel.chains);

  /** Seconds into each stop of a day; null while a road chain is still loading. */
  const legsIntoDay = (day: number): (number | null)[] =>
    (dayTravel.legs[day] ?? []).map((l) =>
      'fixedSec' in l ? l.fixedSec : routes[l.chain]?.legs?.[l.legIdx]?.duration ?? null,
    );

  /** Road distance and time per day, summed over its chains (for the header line). */
  const roadByDay = useMemo(() => {
    const out: Record<number, { distance: number; duration: number }> = {};
    for (const [id, r] of Object.entries(routes)) {
      const day = Number(id.split(':')[0]);
      const acc = (out[day] ??= { distance: 0, duration: 0 });
      acc.distance += r.distance;
      acc.duration += r.duration;
    }
    return out;
  }, [routes]);

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
      const schedule = buildDaySchedule(
        stops,
        legsIntoDay(day),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeStops, routes, ferryHours, dayConfig, dayTravel]);

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
    if (view !== 'plan' || !mapReady) return;
    const pts = (dayStops[planDay] ?? []).map((p) => [p.lat, p.lng] as [number, number]);
    if (pts.length > 0 && mapRef.current) {
      mapRef.current.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 12 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, planDay, mapReady]);

  // The selected place must show on the map even if the current filters would
  // hide it (e.g. selecting a rejected pin from the list).
  const markersToShow = useMemo(() => {
    if (!selectedId) return visible;
    const inBase = visible.some((p) => p.id === selectedId);
    if (inBase) return visible;
    const sel = places.find((p) => p.id === selectedId);
    return sel ? [...visible, sel] : visible;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, selectedId]);

  // ---- Mutations ----
  function applyOverrides(updater: (o: Overrides) => Overrides) {
    setOverrides((prev) => {
      const next = normalizeOverrides(updater(prev));
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
    setAddOptionGroupId(null);
  }

  function openAddOption(groupId: string) {
    setEditingId(null);
    setTappedPoint(null);
    setEssentialsOpen(false);
    setSelectedId(null);
    setAddOptionGroupId(groupId);
    setAddPlaceOpen(true);
  }

  function saveDraftPlace(draft: DraftPlace) {
    if (draft.lat == null || draft.lng == null) return;
    if (editingId) {
      // Edit: update the immutable identity in userPlaces; status/day/note flow
      // through the overrides layer (one code path with baked places).
      const existing = placeById.get(editingId);
      const base = userPlaces.find((p) => p.id === editingId) as Place;
      const updated: Place = {
        ...base,
        name: draft.name,
        category: draft.category,
        lat: draft.lat!,
        lng: draft.lng!,
        country: guessCountry(draft.lat!, draft.lng!),
        optionGroup: draft.optionGroup || undefined,
        optionTabLabel: draft.optionTabLabel || undefined,
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
      ...(draft.optionGroup ? { optionGroup: draft.optionGroup } : {}),
      ...(draft.optionTabLabel ? { optionTabLabel: draft.optionTabLabel } : {}),
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

  function setPick(id: string, pick: boolean) {
    applyOverrides((o) => {
      const current = o[id] ?? {};
      if (pick) return { ...o, [id]: { ...current, pick: true } };
      // Unstar: drop the flag, and the whole row if nothing else is left.
      const { pick: _drop, ...rest } = current;
      const next = { ...o };
      if (Object.keys(rest).length === 0) delete next[id];
      else next[id] = rest;
      return next;
    });
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
    // On a day ⟹ committed: assigning a day promotes the stop to shortlist so we
    // never get a candidate/backup sitting on a day (a `extra` stays an area
    // option only while it has no day).
    applyOverrides((o) => ({ ...o, [id]: { ...o[id], status: 'shortlist', day, dayOrder: order } }));
  }

  function moveInDay(id: string, dir: 'up' | 'down') {
    const place = placeById.get(id);
    if (!place?.day) return;
    const day = place.day;
    const ordered = places
      .filter((p) => p.day === day && p.status !== 'rejected')
      .sort(byOrder);

    const gid = place.optionGroup;
    if (gid) {
      // Move the entire group as a block.
      const groupIds = new Set(ordered.filter((p) => p.optionGroup === gid).map((p) => p.id));
      const firstIdx = ordered.findIndex((p) => groupIds.has(p.id));
      let lastIdx = firstIdx;
      for (let i = firstIdx + 1; i < ordered.length; i++) {
        if (groupIds.has(ordered[i].id)) lastIdx = i;
      }
      if (dir === 'up' && firstIdx === 0) return;
      if (dir === 'down' && lastIdx === ordered.length - 1) return;
      const before = ordered.slice(0, firstIdx);
      // Items sandwiched between group members (shouldn't normally exist, but handled safely)
      const between = ordered.slice(firstIdx, lastIdx + 1).filter((p) => !groupIds.has(p.id));
      const groupItems = ordered.filter((p) => groupIds.has(p.id));
      const after = ordered.slice(lastIdx + 1);
      const newOrder =
        dir === 'up'
          ? [...before.slice(0, -1), ...groupItems, ...between, before[before.length - 1], ...after]
          : [...before, after[0], ...groupItems, ...between, ...after.slice(1)];
      applyOverrides((o) => {
        const next = { ...o };
        newOrder.forEach((p, i) => { next[p.id] = { ...next[p.id], day, dayOrder: i }; });
        return next;
      });
      return;
    }

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

  function removeGroup(groupId: string) {
    const day = places.find((p) => p.optionGroup === groupId && p.day)?.day;
    if (!day) return;
    applyOverrides((o) => {
      const next = { ...o };
      places
        .filter((p) => p.optionGroup === groupId && p.day === day)
        .forEach((p) => { next[p.id] = { ...next[p.id], day: undefined, dayOrder: undefined }; });
      return next;
    });
  }

  function handleGroupTabChangeFromItinerary(groupId: string, idx: number, placeId: string) {
    const option = placeById.get(placeId);
    if (!option) return;
    setOptGroupSel((s) => ({ ...s, [groupId]: idx }));
    selectPlace(option);
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

  function handleGroupTabChange(idx: number) {
    const option = groupOptions?.[idx];
    if (!option) return;
    setOptGroupSel((s) => ({ ...s, [option.optionGroup!]: idx }));
    selectPlace(option);
  }

  /** Close the detail sheet; on a phone, restore the list it was opened from. */
  function closeDetail() {
    setSelectedId(null);
    if (reopenSidebarOnClose.current) {
      reopenSidebarOnClose.current = false;
      if (isNarrow()) setSidebarOpen(true);
    }
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
    for (const [id, pts] of Object.entries(dayTravel.chains)) {
      if (pts.length < 2) continue;
      const day = Number(id.split(':')[0]);
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
          <select
            className="trip-selector"
            value={currentTripId}
            onChange={(e) => switchTrip(e.target.value)}
            aria-label="Switch trip"
          >
            {TRIPS.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <>
        <p className="subtitle">{activeTrip.subtitle}</p>

        <div className="view-tabs">
          <button
            className={view === 'places' ? 'on' : ''}
            onClick={() => setView('places')}
          >
            Places
          </button>
          <button
            className={view === 'plan' ? 'on' : ''}
            onClick={() => setView('plan')}
          >
            Plan
          </button>
          <button
            className={view === 'board' ? 'on' : ''}
            onClick={() => setView('board')}
          >
            Board
          </button>
          <button
            className={view === 'mix' ? 'on' : ''}
            onClick={() => setView('mix')}
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

        {view === 'places' && (
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

        {view === 'places' && (
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
                      {p.pick && <span className="pick-star" title="Recommended pick">★</span>}
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

        {view === 'board' && (
          <Suspense fallback={<PanelFallback text="Loading board…" />}>
            <LazyBoard
              places={places}
              scheduleByDay={daySchedules}
              realDay={isDuringTrip() ? currentTripDay() : -1}
              onPickDay={focusPlanDay}
            />
          </Suspense>
        )}

        {view === 'mix' && (
          <Suspense fallback={<PanelFallback text="Loading highlights…" />}>
            <LazyMix places={places} onPickDay={focusPlanDay} />
          </Suspense>
        )}

        {view === 'plan' && (
          <Suspense fallback={<PanelFallback text="Loading plan…" />}>
            <LazyPlan
              day={planDay}
              onDay={setPlanDay}
              places={places}
              roadByDay={roadByDay}
              routesLoading={routesLoading}
              realDay={isDuringTrip() ? currentTripDay() : -1}
              ferrySecByDay={dayFerrySec}
              selectedId={selectedId}
              onSelect={selectPlace}
              onMove={moveInDay}
              onAssignDay={assignDay}
              onRemoveGroup={removeGroup}
              onGroupTabChange={handleGroupTabChangeFromItinerary}
              scheduleByDay={daySchedules}
              dayConfig={dayConfig}
              onSetDayCfg={setDayCfg}
              optGroupSel={optGroupSel}
            />
          </Suspense>
        )}

        </>

        <div className="sidebar-footer">
          <button
            className="tools-pill"
            onClick={() => setEssentialsOpen(true)}
            title="Cache all routes for offline use"
          >
            📥 Offline cache
          </button>
        </div>
      </aside>

      <MapContainer
        ref={mapRef}
        className="map"
        center={activeTrip.mapCenter}
        zoom={activeTrip.mapZoom}
        scrollWheelZoom
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HashSync />
        <FlyToTrip center={activeTrip.mapCenter} zoom={activeTrip.mapZoom} tripId={currentTripId} />
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

        {/* Road chains of the committed plan (Plan view: only the viewed day) */}
        {Object.entries(routes)
          .filter(([id]) => !routeDaysToShow || routeDaysToShow.has(Number(id.split(':')[0])))
          .map(([id, r]) => (
            <Polyline
              key={`road-${id}`}
              positions={toLatLngs(r.coordinates)}
              pathOptions={{ color: dayColor(Number(id.split(':')[0])), weight: 4, opacity: 0.75 }}
            />
          ))}
        {/* Fixed legs (on foot / unrouted): dashed straight lines */}
        {Object.entries(dayTravel.fixedSegs)
          .filter(([day]) => !routeDaysToShow || routeDaysToShow.has(Number(day)))
          .flatMap(([day, segs]) =>
            segs.map((seg, i) => (
              <Polyline
                key={`fixed-${day}-${i}`}
                positions={seg}
                pathOptions={{ color: dayColor(Number(day)), weight: 3, opacity: 0.7, dashArray: '6 8' }}
              />
            )),
          )}

        {markersToShow.map((p) => {
          const isSel = p.id === selectedId;
          const radius = isSel ? 15 : p.status === 'shortlist' ? 10 : 7;
          // No Leaflet popup: one pin click opens ONE surface — the detail panel.
          return (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={radius}
              pathOptions={{
                color: isSel ? '#FF3B30' : '#ffffff',
                weight: isSel ? 4 : p.status === 'shortlist' ? 3 : 1.5,
                fillColor: CATEGORY_COLORS[p.category],
                fillOpacity: p.status === 'rejected' ? 0.3 : 0.9,
                opacity: 1,
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
        onPick={setPick}
        onEdit={selected?.userAdded ? () => openEditPlace(selected.id) : undefined}
        groupOptions={groupOptions}
        selectedGroupIdx={selectedGroupIdx}
        onGroupTabChange={handleGroupTabChange}
        onAddOption={openAddOption}
      />

      {addPlaceOpen && (
        <Suspense fallback={<DialogFallback title="Loading add place…" />}>
          <AddPlace
            tappedPoint={tappedPoint}
            editing={editingPlace}
            editingDay={editingId ? overrides[editingId]?.day ?? null : null}
            editingNote={editingId ? overrides[editingId]?.note ?? '' : ''}
            optionGroupPrefill={addOptionGroupId ?? undefined}
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
            onPrepOffline={prepOffline}
            prepping={prepping}
          />
        </Suspense>
      )}

    </div>
  );
}
