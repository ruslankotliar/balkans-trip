// Trip is Jun 16 (day 1) → Jun 28, 2026 (day 13). 13 days, 12 nights.
export const TRIP_START = new Date(2026, 5, 16); // months are 0-indexed → 5 = June
export const TRIP_DAYS = 13;
export const DAYS = Array.from({ length: TRIP_DAYS }, (_, i) => i + 1);

/** Date object for trip day N (1-based). */
export function dayDate(day: number): Date {
  const d = new Date(TRIP_START);
  d.setDate(d.getDate() + (day - 1));
  return d;
}

/** e.g. "Tue Jun 16" */
export function dayDateLabel(day: number): string {
  return dayDate(day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** e.g. "Day 1 · Tue Jun 16" */
export function dayLabel(day: number): string {
  return `Day ${day} · ${dayDateLabel(day)}`;
}

// Distinct color per trip day for route polylines / itinerary accents.
const DAY_PALETTE = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
  '#469990', '#9A6324', '#800000', '#808000', '#000075',
  '#e67e22', '#1abc9c', '#c0392b',
];

export function dayColor(day: number): string {
  return DAY_PALETTE[(day - 1) % DAY_PALETTE.length];
}

/** Days since trip start, 1-based; can be <1 (before) or >13 (after). */
function rawTripDay(now: Date): number {
  const startMid = new Date(
    TRIP_START.getFullYear(),
    TRIP_START.getMonth(),
    TRIP_START.getDate(),
  );
  const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((nowMid.getTime() - startMid.getTime()) / 86400000) + 1;
}

/** Real date → trip day, clamped to 1–13 (before the trip → 1, after → 13). */
export function currentTripDay(now = new Date()): number {
  return Math.min(TRIP_DAYS, Math.max(1, rawTripDay(now)));
}

/** True while the real date is within the Jun 16–28 trip window. */
export function isDuringTrip(now = new Date()): boolean {
  const d = rawTripDay(now);
  return d >= 1 && d <= TRIP_DAYS;
}

/** Great-circle distance in km between two lat/lng points. */
export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Equirectangular projection to local km (good enough at these scales).
function projXY(lat: number, lng: number, lat0: number): [number, number] {
  const R = 6371;
  const x = ((lng * Math.PI) / 180) * Math.cos((lat0 * Math.PI) / 180) * R;
  const y = ((lat * Math.PI) / 180) * R;
  return [x, y];
}

/** Distance in km from a point to the segment A–B. */
export function pointToSegmentKm(
  plat: number,
  plng: number,
  alat: number,
  alng: number,
  blat: number,
  blng: number,
): number {
  const lat0 = (alat + blat) / 2;
  const [px, py] = projXY(plat, plng, lat0);
  const [ax, ay] = projXY(alat, alng, lat0);
  const [bx, by] = projXY(blat, blng, lat0);
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Minimum distance in km from a point to a polyline ([lat,lng][]). */
export function pointToPolylineKm(
  plat: number,
  plng: number,
  line: [number, number][],
): number {
  let min = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const d = pointToSegmentKm(
      plat,
      plng,
      line[i][0],
      line[i][1],
      line[i + 1][0],
      line[i + 1][1],
    );
    if (d < min) min = d;
  }
  return min === Infinity ? 0 : min;
}

/** Index of the stop-to-stop leg the point is nearest to (0-based). */
export function nearestLegIndex(
  plat: number,
  plng: number,
  stops: [number, number][],
): number {
  let min = Infinity;
  let idx = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const d = pointToSegmentKm(
      plat,
      plng,
      stops[i][0],
      stops[i][1],
      stops[i + 1][0],
      stops[i + 1][1],
    );
    if (d < min) {
      min = d;
      idx = i;
    }
  }
  return idx;
}

/** Format seconds as "3h 25m" / "45m". */
export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/** Format meters as "123 km" / "0.8 km". */
export function formatDistance(meters: number): string {
  const km = meters / 1000;
  return km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
}

/**
 * Split an ordered stop sequence into trip days, capping driving time per day.
 * `legSeconds[i]` is the drive from orderedIds[i] to orderedIds[i+1]; the
 * relocation leg that crosses midnight counts toward the new day.
 * Returns the day/dayOrder per id and the number of days used.
 */
export function splitIntoDays(
  orderedIds: string[],
  legSeconds: number[],
  maxHoursPerDay: number,
): {
  assign: Record<string, { day: number; dayOrder: number }>;
  days: number;
  /** Driving seconds per day, index 0 = day 1 (incl. the morning relocation leg). */
  dayTotals: number[];
} {
  const maxSec = maxHoursPerDay * 3600;
  const assign: Record<string, { day: number; dayOrder: number }> = {};
  const dayTotals: number[] = [0];
  let day = 1;
  let orderInDay = 0;
  let accum = 0;
  orderedIds.forEach((id, i) => {
    if (i > 0) {
      const leg = legSeconds[i - 1] ?? 0;
      if (orderInDay > 0 && accum + leg > maxSec) {
        day++;
        orderInDay = 0;
        accum = leg; // morning relocation drive belongs to the new day
        dayTotals.push(leg);
      } else {
        accum += leg;
        dayTotals[day - 1] += leg;
      }
    }
    assign[id] = { day, dayOrder: orderInDay };
    orderInDay++;
  });
  return { assign, days: day, dayTotals };
}
