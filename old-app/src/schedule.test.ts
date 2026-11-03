import { describe, expect, it } from 'vitest';
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
const at = (h: number, m = 0) => (h * 60 + m) * 60;
const nineAm = { dayStartHour: 9 };

// a 09:00-09:30, 10 min to the pier (computed arrival 09:40), 50 min boat to the island.
const boatDay = (pier: Partial<PlaceWithOverride>) =>
  buildDaySchedule(
    [stop('a', { timeMinutes: 30 }), stop('pier', { timeMinutes: 15, ...pier }), stop('island')],
    [0, 10 * 60, 50 * 60],
    nineAm,
  );

describe('buildDaySchedule with a fixed time at a stop', () => {
  it('waits until the fixed time when the stop is reached early, and the later stops move with it', () => {
    const s = boatDay({ fixedStartMin: 10 * 60 + 30 });
    expect(s?.entries[1]).toMatchObject({ arriveSec: at(10, 30), departSec: at(10, 45), waitSec: 50 * 60, lateSec: 0 });
    expect(s?.entries[2]).toMatchObject({ arriveSec: at(11, 35), departSec: at(12, 35) });
    expect(s?.finishSec).toBe(at(12, 35));
  });

  it('keeps the computed arrival and flags how late it is when the stop is reached after the fixed time', () => {
    const s = buildDaySchedule(
      [stop('a', { timeMinutes: 90 }), stop('bus', { fixedStartMin: 10 * 60 + 30 })],
      [0, 30 * 60],
      nineAm,
    );
    expect(s?.entries[1]).toMatchObject({ arriveSec: at(11), departSec: at(12), waitSec: 0, lateSec: 30 * 60 });
  });

  it('keeps the plain clock for a stop without a fixed time', () => {
    const s = boatDay({});
    expect(s?.entries[1]).toMatchObject({ arriveSec: at(9, 40), departSec: at(9, 55) });
    expect(s?.entries[2]).toMatchObject({ arriveSec: at(10, 45), departSec: at(11, 45) });
    expect(s?.finishSec).toBe(at(11, 45));
  });
});

describe('buildDaySchedule with a stop that has no road route', () => {
  // a 09:00-09:30, 10 min to the pier (09:40-09:55), no road to the island, then 20 min to the beach.
  const islandDay = () =>
    buildDaySchedule(
      [stop('a', { timeMinutes: 30 }), stop('pier', { timeMinutes: 15 }), stop('island'), stop('beach')],
      [0, 10 * 60, NO_ROUTE, 20 * 60],
      nineAm,
    );

  it('names the stop that has no road route', () => {
    expect(islandDay()?.noRouteTo?.id).toBe('island');
  });

  it('times the stops before it and leaves it and the stops after unscheduled', () => {
    const s = islandDay();
    expect(s?.entries.map((e) => e.place.id)).toEqual(['a', 'pier']);
    expect(s?.finishSec).toBe(at(9, 55));
  });

  it('names the first stop of the day when the leg from last night has no road', () => {
    const s = buildDaySchedule([stop('island'), stop('beach')], [NO_ROUTE, 5 * 60], nineAm);
    expect(s?.noRouteTo?.id).toBe('island');
    expect(s?.entries).toEqual([]);
  });

  it('is not held up by a road leg still loading after it', () => {
    const s = buildDaySchedule([stop('a'), stop('island'), stop('b')], [0, NO_ROUTE, null], nineAm);
    expect(s?.noRouteTo?.id).toBe('island');
  });

  it('still waits for a road leg loading before it', () => {
    expect(buildDaySchedule([stop('a'), stop('b'), stop('island')], [0, null, NO_ROUTE], nineAm)).toBeNull();
  });

  it('has no unroutable stop when every leg is known', () => {
    expect(boatDay({})?.noRouteTo).toBeUndefined();
  });
});
