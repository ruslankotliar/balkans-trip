import { useEffect, useRef, useState } from 'react';
import { NO_ROUTE, fetchRoute, routeKey, type LatLng, type NoRoute } from './osrm';
import { loadRouteCache, saveRouteCache, type CachedRoute } from './store';

/** Road routes keyed by chain id ("<day>:<n>"). A day can hold several chains. */
export type DayRoutes = Record<string, CachedRoute>;

/**
 * Chains OSRM could not route as a whole, with each leg routed on its own:
 * seconds, NO_ROUTE where no road joins the two stops, null where the check failed.
 */
export type NoRouteLegs = Record<string, (number | NoRoute | null)[]>;

/**
 * Given the ordered coordinates of each road chain (only chains with 2+ points
 * matter), return the driving route per chain. Cached in localStorage by
 * coordinate sequence; missing routes are fetched from OSRM, debounced and
 * sequentially (to be kind to the free public server).
 */
export function useDayRoutes(dayPoints: Record<string, LatLng[]>): {
  routes: DayRoutes;
  noRoute: NoRouteLegs;
  loading: boolean;
} {
  const [routes, setRoutes] = useState<DayRoutes>({});
  const [noRoute, setNoRoute] = useState<NoRouteLegs>({});
  // Per coordinate sequence, kept for this session only: no road today may be a road after an OSM edit.
  const noRouteRef = useRef<Record<string, (number | NoRoute | null)[]>>({});
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef(loadRouteCache());

  // Stable dependency: changes only when a day's coordinate sequence changes.
  const depKey = Object.entries(dayPoints)
    .filter(([, pts]) => pts.length >= 2)
    .map(([key, pts]) => `${key}=${routeKey(pts)}`)
    .sort()
    .join('|');

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const cache = cacheRef.current;
      const next: DayRoutes = {};
      const nextNoRoute: NoRouteLegs = {};
      const toFetch: Array<{ id: string; key: string; pts: LatLng[] }> = [];

      for (const [id, pts] of Object.entries(dayPoints)) {
        if (pts.length < 2) continue;
        const key = routeKey(pts);
        // Entries cached before per-leg data existed are refetched once to
        // upgrade them (the schedule needs leg durations).
        if (cache[key]?.legs) next[id] = cache[key];
        else if (noRouteRef.current[key]) nextNoRoute[id] = noRouteRef.current[key];
        else toFetch.push({ id, key, pts });
      }

      if (!cancelled) {
        setRoutes(next); // paint cached routes immediately
        setNoRoute(nextNoRoute);
      }
      if (toFetch.length === 0) return;

      if (!cancelled) setLoading(true);
      for (const { id, key, pts } of toFetch) {
        const r = await fetchRoute(pts);
        if (cancelled) return;
        if (r === NO_ROUTE) {
          // Route each leg on its own to find the stop no road leads to.
          const legs: (number | NoRoute | null)[] = [];
          for (let i = 0; i < pts.length - 1; i++) {
            const leg = pts.length === 2 ? r : await fetchRoute([pts[i], pts[i + 1]]);
            if (cancelled) return;
            legs.push(leg === NO_ROUTE ? NO_ROUTE : leg ? leg.duration : null);
          }
          if (!legs.includes(null)) noRouteRef.current[key] = legs;
          setNoRoute((prev) => ({ ...prev, [id]: legs }));
        } else if (r) {
          cache[key] = r;
          saveRouteCache(cache);
          setRoutes((prev) => ({ ...prev, [id]: r }));
        }
      }
      if (!cancelled) setLoading(false);
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  return { routes, noRoute, loading };
}
