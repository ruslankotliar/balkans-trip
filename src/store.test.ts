import { describe, expect, it } from 'vitest';
import { normalizeUserPlace } from './store';

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
});
