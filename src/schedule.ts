import type { CachedRoute, PlaceWithOverride } from './store';

export const DEFAULT_DAY_START_HOUR = 8;
export const DEFAULT_DAY_END_HOUR = 21;

export type StopKind = 'sleep' | 'activity';

export interface StopTiming {
  place: PlaceWithOverride;
  kind: StopKind;
  arriveSec: number;
  departSec: number;
  /** Leg INTO this stop: road leg, or the stop's fixed legMinutes. */
  driveSec: number;
  ferrySec: number;
  staySec: number;
  source: 'override' | 'data' | 'heuristic';
}

export interface DaySchedule {
  dayStartSec: number;
  plannedEndSec: number;
  finishSec: number;
  driveSec: number;
  ferrySec: number;
  staySec: number;
  slackSec: number;
  overSec: number;
  entries: StopTiming[];
}

const CATEGORY_DEFAULT_MINUTES: Record<PlaceWithOverride['category'], number> = {
  campsite: 15,
  accommodation: 15,
  food: 90,
  nightlife: 150,
  beach: 150,
  activity: 180,
  hike: 240,
  nature: 90,
  sight: 60,
  viewpoint: 30,
  town: 120,
  other: 60,
};

function normalizeDurationText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ');
}

/** Parse a human "time needed" string to minutes, or null if it is not numeric. */
export function parseDurationMinutes(text: string | undefined): number | null {
  if (!text) return null;
  const s = normalizeDurationText(text);
  if (!s) return null;

  // Route/base language for accommodations should not count as a daytime activity.
  if (
    /(overnight|one night|overnight base|base for \d+ nights|sleep|sleeping base)/.test(s) &&
    !/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours|min|mins|minute|minutes)/.test(s)
  ) {
    return null;
  }

  // Numeric durations are parsed FIRST, so an explicit number always wins over a
  // vague word: "2-3h (full day possible)" must be 2.5h (not 8h), and
  // "half day (4-6h)" should use the 4-6h range, not the blunt 240-min default.
  // Ranges before single/mixed-hour: "2-3h" must not match the bare "3h" inside.
  const hourRange = s.match(
    /(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/,
  );
  if (hourRange) {
    return Math.round(((Number(hourRange[1]) + Number(hourRange[2])) / 2) * 60);
  }

  const minRange = s.match(
    /(\d+)\s*(?:-|to)\s*(\d+)\s*(?:min|mins|minute|minutes)\b/,
  );
  if (minRange) {
    return Math.round((Number(minRange[1]) + Number(minRange[2])) / 2);
  }

  const mixedHour = s.match(
    /(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\s*(\d{1,2})?\s*(?:m|min|mins|minute|minutes)?\b/,
  );
  if (mixedHour) {
    return Math.round(Number(mixedHour[1]) * 60 + Number(mixedHour[2] ?? 0));
  }

  const hourSingle = s.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/);
  if (hourSingle) return Math.round(Number(hourSingle[1]) * 60);

  const minSingle = s.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/);
  if (minSingle) return Math.round(Number(minSingle[1]));

  const plainMinutes = s.match(/^(\d{1,4})$/);
  if (plainMinutes) return Math.round(Number(plainMinutes[1]));

  // Word-based fallbacks — only reached when NO explicit number was given, so a
  // stray "full day possible" can never override a real "2-3h".
  if (/half[\s-]*day/.test(s)) return 240;
  if (/full[\s-]*day/.test(s)) return 480;
  if (/evening/.test(s)) return 150;
  if (/late\s*night/.test(s)) return 180;
  if (/\bmeal\b/.test(s)) return 90;

  return null;
}

export function formatClock(sec: number): string {
  const total = Math.max(0, Math.round(sec / 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  // Wrap past-midnight finishes (nightlife days) to a normal clock: 25:30 -> 01:30.
  return `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Format a clock range such as "08:00–09:30". */
export function formatTimeRange(startSec: number, endSec: number): string {
  return `${formatClock(startSec)}–${formatClock(endSec)}`;
}

/** Estimate minutes to spend at a stop, respecting explicit overrides first. */
export function estimateStopMinutes(place: PlaceWithOverride): { minutes: number; source: 'override' | 'data' | 'heuristic' } {
  if (typeof place.timeMinutes === 'number' && Number.isFinite(place.timeMinutes) && place.timeMinutes >= 0) {
    return { minutes: Math.round(place.timeMinutes), source: 'override' };
  }
  return estimateBaseStopMinutes(place);
}

/** Estimate minutes from the baked data/category, ignoring any manual override. */
export function estimateBaseStopMinutes(place: PlaceWithOverride): { minutes: number; source: 'data' | 'heuristic' } {
  if (place.category === 'accommodation' || place.category === 'campsite') {
    return { minutes: CATEGORY_DEFAULT_MINUTES[place.category], source: 'heuristic' };
  }

  const parsed = parseDurationMinutes(place.timeNeeded);
  if (parsed != null) return { minutes: parsed, source: 'data' };

  // Fallback to 60 if the category is unknown/invalid — never return undefined,
  // or the stop's stay (and the whole day's clock) becomes NaN.
  return { minutes: CATEGORY_DEFAULT_MINUTES[place.category] ?? 60, source: 'heuristic' };
}

/**
 * Build a simple day clock: one start time, route legs, stop durations, and
 * a soft day-end budget for overload warnings.
 */
export function buildDaySchedule(
  stops: PlaceWithOverride[],
  route: CachedRoute | undefined,
  ferryFor: (idA: string, idB: string) => number,
  options?: {
    dayStartHour?: number;
    dayEndHour?: number;
    paceMultiplier?: number;
  },
): DaySchedule | null {
  if (stops.length === 0) return null;
  const dayStartSec = (options?.dayStartHour ?? DEFAULT_DAY_START_HOUR) * 3600;
  const plannedEndSec = (options?.dayEndHour ?? DEFAULT_DAY_END_HOUR) * 3600;
  const paceMultiplier = Math.max(0.5, options?.paceMultiplier ?? 1);
  const routeLegs = route?.legs ?? [];
  // The road route runs through the stops WITHOUT a fixed leg (see
  // Place.legMinutes). It may start one point earlier - the previous night's
  // sleep - which shows up as one extra leg in front.
  const roadStops = stops.filter((s) => s.legMinutes == null).length;
  const offset = Math.max(0, routeLegs.length - Math.max(0, roadStops - 1));

  let clock = dayStartSec;
  let driveSec = 0;
  let ferrySec = 0;
  let staySec = 0;
  const entries: StopTiming[] = [];
  let roadSeen = 0;

  for (let i = 0; i < stops.length; i++) {
    const place = stops[i];
    // Leg into this stop: its fixed legMinutes, else the next road leg.
    let legSec = 0;
    if (place.legMinutes != null) {
      legSec = Math.round(place.legMinutes * 60);
    } else {
      const legIdx = roadSeen - 1 + offset; // -1 = first road stop, nothing before it
      legSec = legIdx >= 0 ? routeLegs[legIdx]?.duration ?? 0 : 0;
      roadSeen += 1;
    }
    const ferry = i > 0 ? ferryFor(stops[i - 1].id, place.id) * 3600 : 0;
    clock += legSec + ferry;
    driveSec += legSec + ferry;
    ferrySec += ferry;

    const estimate = estimateStopMinutes(place);
    const arrival = clock;
    const stopStaySec = Math.round(estimate.minutes * paceMultiplier) * 60;
    const isSleep = place.category === 'accommodation' || place.category === 'campsite';
    const departure = arrival + stopStaySec;
    clock = departure;
    staySec += stopStaySec;
    entries.push({
      place,
      kind: isSleep ? 'sleep' : 'activity',
      arriveSec: arrival,
      departSec: departure,
      driveSec: legSec,
      ferrySec: ferry,
      staySec: stopStaySec,
      source: estimate.source,
    });
  }

  const finishSec = clock;
  const slackSec = plannedEndSec - finishSec;
  const overSec = Math.max(0, finishSec - plannedEndSec);

  return {
    dayStartSec,
    plannedEndSec,
    finishSec,
    driveSec,
    ferrySec,
    staySec,
    slackSec,
    overSec,
    entries,
  };
}
