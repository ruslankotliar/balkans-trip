/**
 * KML / GPX exports — the dead-zone fallback (see research/offline-deploy.md §3).
 *
 * KML imports into Organic Maps (fully-offline vector maps + turn-by-turn nav)
 * and Google My Maps. GPX is the nav-only secondary format.
 */
import { CATEGORIES, CATEGORY_COLORS, COUNTRIES, COUNTRY_NAMES } from './constants';
import type { PlaceWithOverride } from './store';
import { TRIP_DAYS, dayColor, dayLabel } from './trip';
import type { DayRoutes } from './useDayRoutes';

/** "#9b59b6" → KML aabbggrr (alpha-first, B-G-R reversed): "ffb6599b" */
const hex2kml = (hex: string) => {
  const h = hex.replace('#', '');
  return `ff${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toLowerCase();
};

const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function placeDesc(p: PlaceWithOverride): string {
  const L: string[] = [];
  L.push(`${p.category} · ${COUNTRY_NAMES[p.country]} · ${p.status}`);
  if (p.rating) L.push('★'.repeat(p.rating));
  if (p.cost) L.push(`Cost: ${p.cost}`);
  if (p.timeNeeded) L.push(`Time: ${p.timeNeeded}`);
  if (p.bestTime) L.push(`Best: ${p.bestTime}`);
  if (p.facilities) L.push(`Facilities: ${p.facilities}`);
  if (p.description) L.push(p.description);
  if (p.communityNotes) L.push(`“${p.communityNotes}”`);
  if (p.note) L.push(`Note: ${p.note}`);
  if (p.tags?.length) L.push(`#${p.tags.join(' #')}`);
  const src = (p.sources ?? [])
    .map((u) => `<a href="${xml(u)}">${xml(u)}</a>`)
    .join('<br/>');
  return `<![CDATA[${L.map(xml).join('<br/>')}${src ? '<br/>' + src : ''}]]>`;
}

/**
 * Build a KML document with styled per-category points and per-day route lines.
 * groupBy 'day' suits Organic Maps (folders → toggleable bookmark groups);
 * groupBy 'country' keeps Google My Maps under its 10-layer import cap.
 */
export function buildKml(
  places: PlaceWithOverride[],
  routes: DayRoutes,
  groupBy: 'day' | 'country',
): string {
  const styles = CATEGORIES.map(
    (c) =>
      `<Style id="cat-${c}"><IconStyle><color>${hex2kml(CATEGORY_COLORS[c])}</color>` +
      `<scale>1.1</scale></IconStyle></Style>`,
  ).join('');

  const placemark = (p: PlaceWithOverride) =>
    `<Placemark><name>${xml(p.name)}</name><description>${placeDesc(p)}</description>` +
    `<styleUrl>#cat-${p.category}</styleUrl>` +
    // KML coordinate order is lng,lat,alt — longitude FIRST.
    `<Point><coordinates>${p.lng},${p.lat},0</coordinates></Point></Placemark>`;

  const lineString = (day: number, coords: [number, number][]) =>
    `<Placemark><name>Day ${day} route</name>` +
    `<Style><LineStyle><color>${hex2kml(dayColor(day))}</color><width>4</width></LineStyle></Style>` +
    `<LineString><tessellate>1</tessellate><coordinates>` +
    // OSRM geometry is already [lng, lat] → no flip.
    coords.map(([lng, lat]) => `${lng},${lat},0`).join(' ') +
    `</coordinates></LineString></Placemark>`;

  let folders = '';
  if (groupBy === 'day') {
    for (let d = 1; d <= TRIP_DAYS; d++) {
      const ps = places.filter((p) => p.day === d);
      const r = routes[d];
      if (!ps.length && !r) continue;
      folders +=
        `<Folder><name>${xml(dayLabel(d))}</name>` +
        ps.map(placemark).join('') +
        (r ? lineString(d, r.coordinates) : '') +
        `</Folder>`;
    }
    const loose = places.filter((p) => !p.day && p.status !== 'rejected');
    if (loose.length) {
      folders += `<Folder><name>Unassigned</name>${loose.map(placemark).join('')}</Folder>`;
    }
  } else {
    // ≤3 folders → safe for Google My Maps' 10-layer cap
    for (const c of COUNTRIES) {
      const ps = places.filter((p) => p.country === c && p.status !== 'rejected');
      if (ps.length) {
        folders += `<Folder><name>${COUNTRY_NAMES[c]}</name>${ps.map(placemark).join('')}</Folder>`;
      }
    }
  }
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<kml xmlns="http://www.opengis.net/kml/2.2"><Document>` +
    `<name>Balkans Trip — Jun 16–28</name>${styles}${folders}</Document></kml>`
  );
}

/** GPX: waypoints + per-day tracks; for pure navigation apps. */
export function buildGpx(places: PlaceWithOverride[], routes: DayRoutes): string {
  const wpts = places
    .filter((p) => p.status !== 'rejected')
    .map(
      (p) =>
        `<wpt lat="${p.lat}" lon="${p.lng}"><name>${xml(p.name)}</name>` +
        `<desc>${xml(p.description ?? '')}</desc></wpt>`,
    )
    .join('');
  const trks = Object.entries(routes)
    .map(
      ([d, r]) =>
        `<trk><name>Day ${d}</name><trkseg>` +
        r.coordinates.map(([lng, lat]) => `<trkpt lat="${lat}" lon="${lng}"></trkpt>`).join('') +
        `</trkseg></trk>`,
    )
    .join('');
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx version="1.1" creator="balkans-trip" xmlns="http://www.topografix.com/GPX/1/1">` +
    `${wpts}${trks}</gpx>`
  );
}

export function downloadText(text: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
