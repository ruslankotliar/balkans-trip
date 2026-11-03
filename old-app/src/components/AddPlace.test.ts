import { describe, expect, it } from 'vitest';
import { outsideTripArea, tripArea } from './AddPlace';
import { loadPlaces } from '../store';
import { findTrip } from '../trips';

// App passes the active trip's places: baked + user-added, kept by country.
const placesOf = (tripId: string) => {
  const countries = new Set(findTrip(tripId).countries);
  return loadPlaces().filter((p) => countries.has(p.country));
};

const BELLAGIO: [number, number] = [45.9878, 9.2601]; // it-bellagio
const KOTOR: [number, number] = [42.42721, 18.77336]; // me-kotor-fortress-free-ladder

describe('"outside the trip area" warning in Add place', () => {
  it('Italy trip: a Lake Como point is inside, a Kotor point is outside', () => {
    const area = tripArea(placesOf('como-2026'));
    expect(outsideTripArea(area, ...BELLAGIO)).toBe(false);
    expect(outsideTripArea(area, 46.42, 9.7)).toBe(false);
    expect(outsideTripArea(area, ...KOTOR)).toBe(true);
  });

  it('Balkans trip: Kotor is inside and Lake Como outside, as before', () => {
    const area = tripArea(placesOf('balkans-trip'));
    expect(outsideTripArea(area, ...KOTOR)).toBe(false);
    expect(outsideTripArea(area, ...BELLAGIO)).toBe(true);
  });

  it('a trip with no places warns nowhere', () => {
    expect(outsideTripArea(tripArea([]), ...KOTOR)).toBe(false);
  });
});
