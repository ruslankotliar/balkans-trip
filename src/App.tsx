import { useEffect, useMemo, useState } from 'react';
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
import {
  CATEGORIES,
  CATEGORY_COLORS,
  COUNTRIES,
  COUNTRY_NAMES,
  STATUSES,
  toggle,
} from './constants';
import { fetchTrip, tripKey } from './osrm';
import {
  loadOverrides,
  loadPlaces,
  loadTripCache,
  saveOverrides,
  saveTripCache,
  type Overrides,
  type PlaceWithOverride,
  type TripResult,
} from './store';
import {
  dayColor,
  haversineKm,
  nearestLegIndex,
  pointToPolylineKm,
  splitIntoDays,
} from './trip';
import type { Category, Country, Place, Status } from './types';
import { useDayRoutes } from './useDayRoutes';

type View = 'places' | 'itinerary' | 'route';

// Categories that count as a place to sleep, for the nearby finder.
const SLEEP_CATEGORIES: Category[] = ['campsite', 'accommodation'];

const byOrder = (a: PlaceWithOverride, b: PlaceWithOverride) =>
  (a.dayOrder ?? 0) - (b.dayOrder ?? 0) || a.name.localeCompare(b.name);

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
  const [statusFilter, setStatusFilter] = useState<Set<Status>>(
    new Set<Status>(['candidate', 'shortlist', 'backup']),
  );
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>('places');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fitNonce, setFitNonce] = useState(0);

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
  const [rbTrip, setRbTrip] = useState<TripResult | null>(null);
  const [rbInputIds, setRbInputIds] = useState<string[]>([]);
  const [rbBuilding, setRbBuilding] = useState(false);
  const [rbError, setRbError] = useState<string | null>(null);
  const [rbMaxHours, setRbMaxHours] = useState(3);

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
  const dayPoints = useMemo(() => {
    const grouped: Record<number, PlaceWithOverride[]> = {};
    for (const p of places) {
      if (!p.day) continue;
      (grouped[p.day] ??= []).push(p);
    }
    const result: Record<number, [number, number][]> = {};
    for (const [day, ps] of Object.entries(grouped)) {
      result[Number(day)] = ps.sort(byOrder).map((p) => [p.lat, p.lng] as [number, number]);
    }
    return result;
  }, [places]);

  const { routes, loading: routesLoading } = useDayRoutes(dayPoints);

  // ---- Nearby matches ----
  const nearbyMatchIds = useMemo(() => {
    const ids = new Set<string>();
    if (!nearbyActive || !selected) return ids;
    for (const p of places) {
      if (p.id === selected.id) continue;
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

  function findSleepAlongDay(day: number) {
    const route = routes[day];
    if (!route) return;
    const stops = places.filter((p) => p.day === day).sort(byOrder);
    setCorridor({ coords: toLatLngs(route.coordinates), stops, label: `Day ${day} route` });
  }

  function findSleepAlongTrip() {
    if (!rbTrip) return;
    const stops = rbTrip.order.map((i) => rbInputPlaces[i]).filter(Boolean) as PlaceWithOverride[];
    setCorridor({ coords: toLatLngs(rbTrip.coordinates), stops, label: 'the optimized route' });
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
    setRbSelected((prev) => toggle(prev, id));
  }
  function selectAllShortlisted() {
    setRbSelected(new Set(places.filter((p) => p.status === 'shortlist').map((p) => p.id)));
  }
  function clearRbSelection() {
    setRbSelected(new Set());
    setRbTrip(null);
    setRbError(null);
  }

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
    const middle = chosen.filter((p) => p.id !== start.id && p.id !== end.id);
    const inputPlaces = [start, ...middle, end];
    const points = inputPlaces.map((p) => [p.lat, p.lng] as [number, number]);
    if (points.length > 100) {
      setRbError('Too many stops — the public OSRM server caps at ~100 waypoints.');
      return;
    }
    setRbBuilding(true);
    setRbError(null);
    const key = tripKey(points);
    const cache = loadTripCache();
    let result: TripResult | null = cache[key] ?? null;
    if (!result) {
      result = await fetchTrip(points);
      if (!result) {
        setRbBuilding(false);
        setRbError(
          'OSRM could not solve this route (server busy or no road path between stops). Try again or change stops.',
        );
        return;
      }
      cache[key] = result;
      saveTripCache(cache);
    }
    setRbTrip(result);
    setRbInputIds(inputPlaces.map((p) => p.id));
    setRbBuilding(false);
  }

  const rbInputPlaces = useMemo(
    () => rbInputIds.map((id) => placeById.get(id)).filter(Boolean) as PlaceWithOverride[],
    [rbInputIds, placeById],
  );

  // Live "splits into N days" preview for the current trip + slider.
  const rbDaysNeeded = useMemo(() => {
    if (!rbTrip) return null;
    const orderedIds = rbTrip.order.map((i) => rbInputIds[i]);
    return splitIntoDays(orderedIds, rbTrip.legs.map((l) => l.duration), rbMaxHours).days;
  }, [rbTrip, rbInputIds, rbMaxHours]);

  function applyTripToDays() {
    if (!rbTrip) return;
    const orderedIds = rbTrip.order.map((i) => rbInputIds[i]);
    const { assign } = splitIntoDays(
      orderedIds,
      rbTrip.legs.map((l) => l.duration),
      rbMaxHours,
    );
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
        <h1>Balkans Trip</h1>
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
            onBuild={buildRoute}
            building={rbBuilding}
            error={rbError}
            trip={rbTrip}
            tripPlaces={rbInputPlaces}
            maxHours={rbMaxHours}
            onMaxHours={setRbMaxHours}
            onApplyToDays={applyTripToDays}
            daysNeeded={rbDaysNeeded}
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
      </aside>

      <MapContainer className="map" center={[43.4, 17.3]} zoom={7} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HashSync />
        <FlyTo placeId={selectedId} lat={selected?.lat} lng={selected?.lng} />
        <FitBounds pts={visible.map((p) => [p.lat, p.lng])} nonce={fitNonce} />

        {/* Per-day committed routes */}
        {Object.entries(routes).map(([day, r]) => (
          <Polyline
            key={`day-${day}`}
            positions={toLatLngs(r.coordinates)}
            pathOptions={{ color: dayColor(Number(day)), weight: 4, opacity: 0.75 }}
          />
        ))}

        {/* Route builder preview line */}
        {showTripLayer && rbTrip && (
          <Polyline
            positions={toLatLngs(rbTrip.coordinates)}
            pathOptions={{ color: '#111', weight: 5, opacity: 0.5, dashArray: '1 8' }}
          />
        )}

        {/* Corridor route highlight */}
        {corridor && (
          <Polyline
            positions={corridor.coords}
            pathOptions={{ color: '#8e44ad', weight: 6, opacity: 0.35 }}
          />
        )}

        {visible.map((p) => {
          const rbSel = view === 'route' && rbSelected.has(p.id);
          let dim = false;
          let matchHi = false;
          if (corridor) {
            matchHi = corridorMatchIds.has(p.id);
            dim = !matchHi && !corridorStopIds.has(p.id);
          } else if (nearbyActive && selected) {
            matchHi = nearbyMatchIds.has(p.id);
            dim = selectedId !== p.id && !matchHi;
          }
          return (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={matchHi ? 11 : p.status === 'shortlist' ? 10 : 7}
              pathOptions={{
                color: rbSel || matchHi ? '#111' : '#ffffff',
                weight: rbSel ? 3.5 : matchHi ? 2.5 : p.status === 'shortlist' ? 3 : 1.5,
                fillColor: CATEGORY_COLORS[p.category],
                fillOpacity: dim ? 0.15 : p.status === 'rejected' ? 0.3 : 0.9,
                opacity: dim ? 0.2 : 1,
              }}
              eventHandlers={{ click: () => selectPlace(p) }}
            >
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
            </CircleMarker>
          );
        })}

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

      <DetailPanel
        place={selected}
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
