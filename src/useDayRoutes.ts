import { useEffect, useRef, useState } from 'react';
import { fetchRoute, routeKey, type LatLng } from './osrm';
import { loadRouteCache, saveRouteCache, type CachedRoute } from './store';

export type DayRoutes = Record<number, CachedRoute>;

/**
 * Given the ordered coordinates for each day (only days with 2+ stops matter),
 * return the driving route per day. Cached in localStorage by coordinate
 * sequence; missing routes are fetched from OSRM, debounced and sequentially
 * (to be kind to the free public server).
 */
export function useDayRoutes(dayPoints: Record<number, LatLng[]>): {
  routes: DayRoutes;
  loading: boolean;
} {
  const [routes, setRoutes] = useState<DayRoutes>({});
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef(loadRouteCache());

  // Stable dependency: changes only when a day's coordinate sequence changes.
  const depKey = Object.entries(dayPoints)
    .filter(([, pts]) => pts.length >= 2)
    .map(([day, pts]) => `${day}:${routeKey(pts)}`)
    .sort()
    .join('|');

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const cache = cacheRef.current;
      const next: DayRoutes = {};
      const toFetch: Array<{ day: number; key: string; pts: LatLng[] }> = [];

      for (const [dayStr, pts] of Object.entries(dayPoints)) {
        if (pts.length < 2) continue;
        const day = Number(dayStr);
        const key = routeKey(pts);
        if (cache[key]) next[day] = cache[key];
        else toFetch.push({ day, key, pts });
      }

      if (!cancelled) setRoutes(next); // paint cached routes immediately
      if (toFetch.length === 0) return;

      if (!cancelled) setLoading(true);
      for (const { day, key, pts } of toFetch) {
        const r = await fetchRoute(pts);
        if (cancelled) return;
        if (r) {
          cache[key] = r;
          saveRouteCache(cache);
          setRoutes((prev) => ({ ...prev, [day]: r }));
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

  return { routes, loading };
}
