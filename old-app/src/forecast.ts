/**
 * Live forecast per trip day from Open-Meteo (free, no key, CORS on). Three
 * models are asked in one call and shown as a range, so one alarming number
 * never reads as a fact - the plan's own rule for the wet-Thursday call.
 * Cached in localStorage so the last fetch survives the days with no signal.
 */
import { getActiveTripId } from './trips';
import { safeSetItem } from './store';

export interface DayForecast {
  /** Spread across models: [min, max]. */
  tMax: [number, number];
  tMin: [number, number];
  rainMm: [number, number];
  /** Highest gust any model gives, km/h. */
  gustMax: number;
  /** Highest rain probability any model gives, %. */
  rainProb: number;
  /** Where the numbers are for, e.g. "high camp 2,206 m". */
  at: string;
  /** How many models answered for this day. */
  models: number;
}

export interface ForecastStore {
  fetchedAt: number;
  days: Record<number, DayForecast>;
}

export interface ForecastPoint {
  day: number;
  /** ISO date "2026-09-16". */
  date: string;
  lat: number;
  lng: number;
  label: string;
}

const MODELS = ['ecmwf_ifs025', 'gfs_seamless', 'icon_seamless'];
const VARS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_gusts_10m_max',
];

const forecastKey = () => `${getActiveTripId()}-forecast`;

export function loadForecast(): ForecastStore | null {
  try {
    const raw = localStorage.getItem(forecastKey());
    if (!raw) return null;
    const o = JSON.parse(raw);
    return o && typeof o.fetchedAt === 'number' && o.days ? (o as ForecastStore) : null;
  } catch {
    return null;
  }
}

export function saveForecast(store: ForecastStore): void {
  safeSetItem(forecastKey(), JSON.stringify(store));
}

function range(values: (number | null | undefined)[]): [number, number] | null {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (nums.length === 0) return null;
  return [Math.min(...nums), Math.max(...nums)];
}

/**
 * One Open-Meteo call per distinct point (the day's sleep stop). Every point is
 * asked for the whole trip window and its own day is picked out, so consecutive
 * days at the same place share a call.
 */
export async function fetchForecast(points: ForecastPoint[]): Promise<ForecastStore | null> {
  const dates = points.map((p) => p.date).sort();
  if (dates.length === 0) return null;
  const byPoint = new Map<string, ForecastPoint[]>();
  for (const p of points) {
    const k = `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
    (byPoint.get(k) ?? byPoint.set(k, []).get(k)!).push(p);
  }
  const days: Record<number, DayForecast> = {};
  for (const group of byPoint.values()) {
    const { lat, lng } = group[0];
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
      `&daily=${VARS.join(',')}&models=${MODELS.join(',')}&timezone=auto` +
      `&start_date=${dates[0]}&end_date=${dates[dates.length - 1]}`;
    let data: { daily?: Record<string, (number | null)[] | string[]> };
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      data = await res.json();
    } catch {
      continue;
    }
    const daily = data.daily;
    if (!daily) continue;
    const times = daily.time as string[];
    for (const p of group) {
      const i = times.indexOf(p.date);
      if (i < 0) continue;
      const pick = (v: string) => MODELS.map((m) => (daily[`${v}_${m}`] as (number | null)[] | undefined)?.[i]);
      const tMax = range(pick('temperature_2m_max'));
      const tMin = range(pick('temperature_2m_min'));
      const rain = range(pick('precipitation_sum'));
      const gust = range(pick('wind_gusts_10m_max'));
      const prob = range(pick('precipitation_probability_max'));
      if (!tMax || !tMin || !rain) continue;
      days[p.day] = {
        tMax,
        tMin,
        rainMm: rain,
        gustMax: gust ? gust[1] : 0,
        rainProb: prob ? prob[1] : 0,
        at: p.label,
        models: pick('temperature_2m_max').filter((v) => typeof v === 'number').length,
      };
    }
  }
  if (Object.keys(days).length === 0) return null;
  return { fetchedAt: Date.now(), days };
}

const r = (n: number) => Math.round(n);

/** "20-23 C, night 9-11, 0-1 mm, gusts 30 km/h" - the same shape as the plan's table. */
export function formatForecast(f: DayForecast): string {
  const span = ([a, b]: [number, number]) => (r(a) === r(b) ? `${r(a)}` : `${r(a)}-${r(b)}`);
  const rain = r(f.rainMm[1]) === 0 ? 'dry' : `${span(f.rainMm)} mm`;
  const parts = [`${span(f.tMax)} C`, `night ${span(f.tMin)}`, rain];
  if (f.rainProb >= 30 && r(f.rainMm[1]) > 0) parts.push(`${r(f.rainProb)}% chance`);
  if (f.gustMax >= 30) parts.push(`gusts ${r(f.gustMax)} km/h`);
  return parts.join(' · ');
}

/** "Mon 09:12" for the fetched-at stamp. */
export function formatFetchedAt(ms: number): string {
  return new Date(ms).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}
