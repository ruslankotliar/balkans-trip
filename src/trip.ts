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

// FIXED external facts only — these are true regardless of which stops are scheduled.
// Stop-specific timing advice lives in each place's bestTime field and appears
// dynamically in the itinerary day view when that stop is scheduled.
export const DAY_HINTS: Record<number, DayHint> = {
  1:  { icon: '🌑', text: 'New moon Jun 16–18 — darkest skies of the trip. Good night for stargazing wherever you camp.' },
  2:  { icon: '🕙', text: 'Day 3 airport run: leave wherever you are by ~14:00. Flight lands 17:20; be at arrivals by 17:30.' },
  3:  { icon: '✈️', text: 'Flight FR9423 lands 17:20 — allow 3h drive from Makarska. After pickup: drive north to Camp Prapratno (~90 km, 1h20m) for the morning ferry to Mljet.' },
  4:  { icon: '⛴', text: 'Mljet ferry (Prapratno→Sobra): first-come, no deck reservation. Friday = lighter queue than weekend. First sailings ~07:00; queue 60+ min early.' },
  5:  { icon: '💧', text: 'Return ferry Sobra→Prapratno: 06:00 gets you to Kravica by 08:45 (before crowds). 09:00 ferry lands at Kravica ~11:30 — swimmable but busier.' },
  6:  { icon: '🌞', text: 'Solstice week (Jun 21) — 15h+ daylight. Blagaj Tekija opens ~08:00. Žuta tabija (Yellow Fortress) in Sarajevo: golden-hour sunset ritual.' },
  7:  { icon: '🚣', text: 'Tara rafting starts early (~08:30 meet). Piva tunnels: lights on, honk before entry — single-lane, no signal. Cross into Montenegro at Šćepan Polje.' },
  8:  { icon: '⛰️', text: 'Durmitor: storm risk 12:00–15:00 — be off any exposed ridge by noon. Nights 6–10°C; warm layer required.' },
  9:  { icon: '🛐', text: 'Ostrog Monastery: cover knees+shoulders strictly enforced. Skadar Lake delta: DEET at dusk — mosquitoes vicious.' },
  10: { icon: '🦟', text: 'Velika Plaža / Ada Bojana: mosquitoes severe at dusk — DEET essential. The south end of the coast is a long beach drive, so keep the afternoon compact.' },
  11: { icon: '🚢', text: 'Summer cruise ships in Kotor Bay — start fortress before 08:00. Border: use Vitaljina (not Debeli Brijeg) for ME→HR on the drive to Trebinje.' },
  12: { icon: '🏛️', text: 'Dubrovnik walls open 06:30 — hit them before cruise ships arrive (~10:00). Pasjača Beach: cliff descent via rope, park at the roadside pullout.' },
  13: { icon: '✈️', text: 'Flight FR9756: DBV 20:40 → Vienna 22:05. Car drop ref D013947246 by 19:15 — fill fuel first. Ryanair check-in closes 20:00.' },
};

/**
 * Static weather + daylight digest per trip day.
 * Source: trip-ops.md §1 (weather zones) and §2 (sun times / CEST).
 * These are planning notes, not live forecasts.
 */
export const DAY_OPS: Record<number, string> = {
  1:  'Zadar coast ~28/20°C, sunny · 🌅 05:13 → 20:47 · sea ~22°C',
  2:  'Omiš ~31/22°C, sunny · 🌅 05:16 → 20:43 · Cetina river cold',
  3:  'DBV ~32/24°C, hot/sunny · 🌅 05:08 → 20:30 · Biokovo breeze at altitude',
  4:  'Mljet ~31/25°C, sunny · 🌅 05:08 → 20:30 · sea ~23°C · Friday ferry lighter queue',
  5:  'Mostar ~36/23°C, possible PM shower · 🌅 05:05 → 20:27 · Kravica: arrive early',
  6:  'Mostar hot → Sarajevo ~33/18°C, PM thunder risk · 🌅 05:05 → 20:27 · solstice',
  7:  'Sarajevo ~31°C PM thunder → Žabljak ~25/13°C · ⛺ cool night · 🌅 05:02 → 20:23',
  8:  'Žabljak ~24/12°C with thunderstorm risk · ⚡ be off ridge by noon · 🌅 05:02 → 20:23',
  9:  'Žabljak cool AM → Skadar/Virpazar ~27/22°C · mosquitoes at dusk · 🌅 05:04 → 20:22',
  10: '27–30°C coast likely · 🌅 05:04 → 20:22 · sea 23–24°C · mosquitoes after sunset on the south coast',
  11: '27–30°C coast likely · 🌅 05:04 → 20:22 · Kotor bay shaded from late afternoon',
  12: '27–30°C likely · 🌅 05:08 → 20:30 · Dubrovnik sea 23°C · cruise ships in port by 10:00',
  13: '27–30°C likely · 🌅 05:08 → 20:30 · sea 23°C',
};

/**
 * Strip "Day N (Jun DD) — " prefix from a bestTime string and truncate to
 * the first sentence (up to 100 chars) or a word boundary near 75 chars.
 * Used in both the Itinerary day view and the Today stop list.
 */
export function stopHint(bestTime: string | undefined): string {
  if (!bestTime) return '';
  const text = bestTime.replace(/^(?:Day|Night)\s+\d+[^—]*—\s*/, '').trim();
  const dotIdx = text.indexOf('. ');
  if (dotIdx >= 0 && dotIdx < 100) {
    const snippet = text.slice(0, dotIdx);
    return snippet.length < text.length ? snippet + '…' : snippet;
  }
  if (text.length <= 75) return text;
  const lastSpace = text.lastIndexOf(' ', 75);
  return text.slice(0, lastSpace > 0 ? lastSpace : 75) + '…';
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
