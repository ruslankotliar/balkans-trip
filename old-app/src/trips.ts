import type { Country } from './types';

export interface TripConfig {
  id: string;
  name: string;
  /** Short date range + duration shown under the trip name. */
  subtitle: string;
  startDate: Date;
  numDays: number;
  /** Country codes whose places belong to this trip. */
  countries: Country[];
  mapCenter: [number, number];
  mapZoom: number;
}

export const TRIPS: TripConfig[] = [
  {
    id: 'balkans-trip',
    name: 'Balkans Trip',
    subtitle: 'Jun 16–28 · 13 days',
    startDate: new Date(2026, 5, 16),
    numDays: 13,
    countries: ['HR', 'BA', 'ME'],
    mapCenter: [43.4, 17.3],
    mapZoom: 7,
  },
  {
    id: 'como-2026',
    name: 'Italy — Lake Como',
    subtitle: 'Jul 8–11 · 4 days',
    startDate: new Date(2026, 6, 8),
    numDays: 4,
    countries: ['IT'],
    mapCenter: [46.15, 9.75],
    mapZoom: 10,
  },
  {
    id: 'albania-2026',
    name: 'Albania',
    subtitle: 'Sep 12-19 · 8 days',
    startDate: new Date(2026, 8, 12),
    numDays: 8,
    countries: ['AL'],
    mapCenter: [42.05, 19.65],
    mapZoom: 9,
  },
];

/** Midnight after the trip's last day. */
function tripEnd(t: TripConfig): Date {
  const end = new Date(t.startDate.getFullYear(), t.startDate.getMonth(), t.startDate.getDate());
  end.setDate(end.getDate() + t.numDays);
  return end;
}

export function tripIsOver(t: TripConfig, now = new Date()): boolean {
  return now >= tripEnd(t);
}

export function tripIsUnderway(t: TripConfig, now = new Date()): boolean {
  return now >= t.startDate && !tripIsOver(t, now);
}

/**
 * Which trip to open on load: the stored choice while that trip is still ahead
 * or underway; once it is over, the trip that is underway today (else the stored
 * one, else the first). Stops a phone from opening on a finished trip.
 */
export function pickInitialTripId(stored: string | null, now = new Date()): string {
  const storedTrip = stored ? TRIPS.find((t) => t.id === stored) : undefined;
  if (storedTrip && !tripIsOver(storedTrip, now)) return storedTrip.id;
  const underway = TRIPS.find((t) => tripIsUnderway(t, now));
  return underway?.id ?? storedTrip?.id ?? TRIPS[0].id;
}

export function findTrip(id: string): TripConfig {
  return TRIPS.find((t) => t.id === id) ?? TRIPS[0];
}

// ---- Active trip ID module singleton ----
// store.ts and collab.ts import this to scope their localStorage keys.
// App.tsx calls setActiveTripId() on mount and on every trip switch.
let _activeTripId = 'balkans-trip';
export function getActiveTripId(): string {
  return _activeTripId;
}
export function setActiveTripId(id: string): void {
  _activeTripId = id;
}
