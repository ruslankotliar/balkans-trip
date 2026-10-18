import { describe, expect, it } from 'vitest';
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
