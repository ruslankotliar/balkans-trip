import { describe, expect, it } from 'vitest';
import { daySunHM, formatHM, sunTimes } from './sun';
import type { Country } from './types';

// npm test runs with TZ=Europe/Vienna: planning from Vienna, as on the phone.
const at = (country: Country, lat: number, lng: number) => ({ country, lat, lng });

describe('daySunHM', () => {
  it('runs in Vienna time, like the phone it is checked against', () => {
    expect(new Date(2027, 0, 10).getTimezoneOffset()).toBe(-60);
  });

  it('formats a time in the given zone, not the phone zone', () => {
    const s = sunTimes(9.73, 100.01, new Date(2027, 0, 10))!;
    expect(formatHM(s.sunrise, 'Asia/Bangkok')).toBe('06:39');
  });

  it('gives sunrise and sunset in Bangkok time for a day on Koh Phangan', () => {
    expect(daySunHM([at('TH', 9.73, 100.01)], new Date(2027, 0, 10))).toEqual({ sunrise: '06:39', sunset: '18:14' });
  });

  it('keeps the Albania times the plan was checked against (Theth, 15 Sep)', () => {
    expect(daySunHM([at('AL', 42.395, 19.775)], new Date(2026, 8, 15))).toEqual({ sunrise: '06:20', sunset: '18:52' });
  });

  it("takes the place and its time zone from the day's middle stop", () => {
    const day = [at('MY', 6.1, 100.4), at('TH', 9.73, 100.01), at('MY', 6.1, 100.4)];
    expect(daySunHM(day, new Date(2027, 0, 10))?.sunrise).toBe('06:39');
  });
});
