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
];

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
