import { describe, expect, it } from 'vitest';
import { planText } from './planText';
import { NO_ROUTE } from './osrm';
import { buildDaySchedule } from './schedule';
import type { PlaceWithOverride } from './store';

const stop = (id: string, extra: Partial<PlaceWithOverride> = {}): PlaceWithOverride => ({
  id,
  name: id,
  country: 'AL',
  category: 'sight',
  lat: 0,
  lng: 0,
  description: '',
  status: 'shortlist',
  timeMinutes: 60,
  ...extra,
});
const noFerry = () => 0;
const nineAm = { dayStartHour: 9 };

const day1Stops = [stop('Old town'), stop('Kayak', { timeMinutes: 120 })];
const day2Stops = [
  stop('Pier', { timeMinutes: 15, legMinutes: 10, legMode: 'walk' }),
  stop('Island', { legMinutes: 50, legMode: 'boat', fixedStartMin: 11 * 60 }),
  stop('Bus', { timeMinutes: 30, legMinutes: 45, legMode: 'taxi', fixedStartMin: 12 * 60 + 30 }),
];

describe('planText', () => {
  it('writes each planned day with its date, stop times, legs by mode and fixed times', () => {
    const text = planText([
      { day: 1, date: 'Tue Jun 16', stops: day1Stops, schedule: buildDaySchedule(day1Stops, [0, 30 * 60], noFerry, nineAm) },
      { day: 2, date: 'Wed Jun 17', stops: day2Stops, schedule: buildDaySchedule(day2Stops, [10 * 60, 50 * 60, 45 * 60], noFerry, nineAm) },
      { day: 3, date: 'Thu Jun 18', stops: [], schedule: null },
    ]);
    expect(text).toBe(
      [
        'Day 1 · Tue Jun 16',
        '09:00–10:00 Old town',
        '↓ 30m drive',
        '10:30–12:30 Kayak',
        '',
        'Day 2 · Wed Jun 17',
        '09:10–09:25 Pier',
        '↓ 50m boat',
        '11:00–12:00 Island · fixed 11:00 · wait 45m',
        '↓ 45m taxi',
        '12:45–13:15 Bus · fixed 12:30 · late 15m',
      ].join('\n'),
    );
  });

  it('lists the stops of a day whose route is not loaded as unscheduled', () => {
    expect(planText([{ day: 4, date: 'Fri Jun 19', stops: [stop('Old town')], schedule: null }])).toBe(
      ['Day 4 · Fri Jun 19', 'Unscheduled Old town'].join('\n'),
    );
  });
});

describe('planText with a stop that has no road route', () => {
  it('says which stop has no road route and lists it and the stops after as unscheduled', () => {
    const stops = [stop('Pier', { timeMinutes: 30 }), stop('Island'), stop('Beach')];
    const text = planText([
      { day: 1, date: 'Sun Jan 10', stops, schedule: buildDaySchedule(stops, [0, NO_ROUTE, 10 * 60], noFerry, nineAm) },
    ]);
    expect(text).toBe(
      [
        'Day 1 · Sun Jan 10',
        '09:00–09:30 Pier',
        'no road route to Island - set how you get here',
        'Unscheduled Island',
        'Unscheduled Beach',
      ].join('\n'),
    );
  });
});
