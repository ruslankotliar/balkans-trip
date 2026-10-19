import { describe, expect, it } from 'vitest';
import { guessCountry, normalizeOverride, normalizeUserPlace, restoredStatus, withStatus } from './store';
import { setActiveTripId } from './trips';

// loadUserPlaces reads the saved JSON back through normalizeUserPlace.
const reload = (place: object) => normalizeUserPlace(JSON.parse(JSON.stringify(place)));

describe('normalizeUserPlace', () => {
  it('keeps the option group and tab label of a user-added place after a reload', () => {
    const p = reload({
      id: 'user-1',
      name: 'Lago option',
      country: 'IT',
      category: 'hike',
      lat: 46.01,
      lng: 9.29,
      status: 'shortlist',
      userAdded: true,
      source: 'user',
      optionGroup: 'd3-hike',
      optionTabLabel: 'Lago',
    });
    expect(p?.optionGroup).toBe('d3-hike');
    expect(p?.optionTabLabel).toBe('Lago');
  });

  it.each(['TH', 'MY', 'SG', 'VN', 'KH'])('keeps the Winter-trip country %s instead of guessing a Balkan one', (country) => {
    const p = reload({ id: 'user-2', name: 'Haad Rin', country, category: 'beach', lat: 9.676, lng: 100.067, status: 'extra' });
    expect(p?.country).toBe(country);
  });

  it('still guesses the country for a code the app does not know', () => {
    for (const country of ['XX', 'toString', 'hr']) {
      const p = reload({ id: 'user-3', name: 'Pin', country, category: 'sight', lat: 42.64, lng: 18.11, status: 'extra' });
      expect(['HR', 'BA', 'ME']).toContain(p?.country);
    }
  });
});

describe('normalizeOverride', () => {
  it('keeps a fixed leg into the stop and how you travel it', () => {
    expect(normalizeOverride({ legMinutes: 50, legMode: 'boat' })).toEqual({ legMinutes: 50, legMode: 'boat' });
  });

  it('keeps a fixed start time at the stop', () => {
    expect(normalizeOverride({ fixedStartMin: 630 })).toEqual({ fixedStartMin: 630 });
  });
});

describe('guessCountry', () => {
  const winter = ['TH', 'MY', 'SG', 'VN', 'KH'] as const;
  const known = [
    { lat: 9.73, lng: 100.01, country: 'TH' as const }, // Koh Phangan
    { lat: 3.15, lng: 101.7, country: 'MY' as const }, // Kuala Lumpur
  ];

  it('gives a pin next to a known Thai place Thailand', () => {
    expect(guessCountry(9.7, 100.03, known, [...winter])).toBe('TH');
  });

  it('takes the nearest known place, not the first country of the trip', () => {
    expect(guessCountry(3.1, 101.65, known, [...winter])).toBe('MY');
  });

  it('gives Balkans pins the country of the nearest curated place', () => {
    expect(guessCountry(43.337, 17.815)).toBe('BA'); // Mostar
    expect(guessCountry(42.4247, 18.7712)).toBe('ME'); // Kotor
    expect(guessCountry(42.6407, 18.1077)).toBe('HR'); // Dubrovnik old town, guessed BA before
  });

  it('gives a one-country trip its country outright', () => {
    setActiveTripId('albania-2026');
    try {
      expect(guessCountry(42.6407, 18.1077)).toBe('AL');
    } finally {
      setActiveTripId('balkans-trip');
    }
  });
});

describe('withStatus and restoredStatus', () => {
  it('restores a rejected plan stop to shortlist, with its day kept', () => {
    const rejected = withStatus({ status: 'shortlist', day: 4, dayOrder: 2 }, 'shortlist', 'rejected');
    expect(rejected).toMatchObject({ status: 'rejected', day: 4, dayOrder: 2 });
    expect(restoredStatus(rejected)).toBe('shortlist');
  });

  it('restores a place with no edits of its own to the status it came with', () => {
    expect(restoredStatus(withStatus(undefined, 'extra', 'rejected'))).toBe('extra');
  });

  it('remembers the status before the first rejection when rejected again', () => {
    const once = withStatus(undefined, 'backup', 'rejected');
    expect(restoredStatus(withStatus(once, 'rejected', 'rejected'))).toBe('backup');
  });

  it('keeps the remembered status through a save and reload', () => {
    const saved = JSON.parse(JSON.stringify(normalizeOverride(withStatus(undefined, 'extra', 'rejected'))));
    expect(restoredStatus(normalizeOverride(saved) ?? undefined)).toBe('extra');
  });

  it('restores to candidate when nothing was remembered, as before', () => {
    expect(restoredStatus({ status: 'rejected' })).toBe('candidate');
  });

  it('forgets the remembered status once the place is not rejected', () => {
    const back = withStatus(withStatus(undefined, 'extra', 'rejected'), 'rejected', 'shortlist');
    expect(back).toEqual({ status: 'shortlist' });
    expect(normalizeOverride({ status: 'shortlist', prevStatus: 'extra' })).toEqual({ status: 'shortlist' });
  });
});
