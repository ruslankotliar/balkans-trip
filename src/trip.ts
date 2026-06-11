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

/** Whole calendar days until trip start (0 = departure day, negative = after). */
export function daysToTripStart(now = new Date()): number {
  return -rawTripDay(now) + 1;
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

/** One-line daily ops hint shown at the top of the Today view. */
export interface DayHint {
  icon: string;
  text: string;
}

export const DAY_HINTS: Record<number, DayHint> = {
  1:  { icon: '🌑', text: 'New moon tonight — best dark sky of the trip (Jun 16–18). Paklenica NP: call camp at 08:00 (+385 23 369 452) if walking in.' },
  2:  { icon: '🪂', text: 'Canyoning start early (09:00 latest). Leave Omiš by 13:00 if doing Biokovo/airport tomorrow.' },
  3:  { icon: '🏔️', text: 'Leave Makarska by 14:30–15:00 sharp for ~19:00 airport pickup. Biokovo: booked? 20-car cap/hour.' },
  4:  { icon: '🧱', text: 'Dubrovnik walls: arrive 07:30 — crowds pack in from 10:00. Use Ploče Gate side.' },
  5:  { icon: '⛴', text: 'Mljet ferry (Prapratno → Sobra): queue 90+ min early on a Saturday. Target 13:00 sailing → arrive Sobra 13:45 → pay €25pp NP entry and use all afternoon. Arriving after 16:00 ferry saves €6pp but leaves only 3h of daylight on the island.' },
  6:  { icon: '💧', text: 'Kravica: arrive before 09:00 — packed with tour buses by 11:00. Mostar Stari Most glows amber at sunset.' },
  7:  { icon: '🎶', text: 'Blagaj + Boračko swim en route to Sarajevo. Tonight: Cinemas Sloga (Dalmatinska 36) or Underground Club — both do Monday Latin Night from 22:00.' },
  8:  { icon: '🚗', text: 'Depart Sarajevo 07:00. Piva canyon: lights on, honk before blind tunnels — 56 unlit one-lane tunnels. Drive in daylight only.' },
  9:  { icon: '⛰️', text: 'Durmitor: leave camp by 06:30–07:00. Storm risk builds 12:00–15:00 — be off the ridge by noon. Žabljak nights 6–10°C.' },
  10: { icon: '🛐', text: 'Ostrog: cover knees+shoulders (no exceptions). Skadar: mosquitoes vicious at dusk — repellent essential.' },
  11: { icon: '🏖️', text: 'Sveti Stefan islet view free from the road. Budva Friday = busiest night on the coast — book ahead if you need parking.' },
  12: { icon: '🚢', text: 'Kotor: CONFIRMED 1 ship (Star Clipper, ~170 pax) — a tiny sailing clipper vs 4 ships on Jun 25. Start the fortress at 07:30, the cruise passengers won\'t arrive until ~09:30. Use VITALJINA crossing (not Debeli Brijeg) — 15–45 min.' },
  13: { icon: '✈️', text: 'Car drop at Dubrovnik Airport (Sicily By Car) by 20:00. Ref: D013947246. Full usable day.' },
};

/**
 * Static weather + daylight digest per trip day.
 * Source: trip-ops.md §1 (weather zones) and §2 (sun times / CEST).
 * Sunrise/sunset ± 2 min across Jun 16–28; storm notes only where actionable.
 */
export const DAY_OPS: Record<number, string> = {
  1:  '27–30°C · 🌅 05:13 → 20:47 · sea 22°C',
  2:  '27–30°C · 🌅 05:16 → 20:43 · sea 22°C · Cetina river cold',
  3:  '27–30°C → DBV: 🌅 05:08 → 20:30 · Biokovo breeze at altitude',
  4:  '27–30°C · 🌅 05:08 → 20:30 · sea 23°C',
  5:  '27–30°C · 🌅 05:08 → 20:30 · sea 23°C',
  6:  '30–35°C (Mostar bakes) · 🌅 05:05 → 20:27 · solstice! 15.5h day',
  7:  '25–28°C (Sarajevo, milder) · 🌅 05:05 → 20:27 · afternoon storms possible',
  8:  '14–22°C Durmitor (5–10°C night) · 🌅 05:02 → 20:23',
  9:  '14–22°C Durmitor · ⚡ storms 12:00–15:00 · 🌅 05:02 → 20:23',
  10: '28–35°C Skadar basin (hottest zone) · 🌅 05:04 → 20:22',
  11: '27–30°C · 🌅 05:04 → 20:22 · sea 23–24°C',
  12: '27–30°C · 🌅 05:04 → 20:22 · Kotor bay shaded ~19:30',
  13: '27–30°C · 🌅 05:08 → 20:30 · sea 23°C',
};

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
