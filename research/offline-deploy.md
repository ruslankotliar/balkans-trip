# Offline & Deployment spec

**Audience:** the dev session (session G owns app code). This file is a spec — paste-ready code, exact commands, verified claims. I did **not** edit any app code.

**The situation.** Jun 16–28, 4 phones across HR → BA → ME → HR. Croatia has EU roaming; **Bosnia and Montenegro do not** — data is pay-as-you-go expensive, and Durmitor / Sutjeska / Piva canyon / border crossings have real dead zones. The app needs network for **three** things, and each needs its own answer:

| Dependency | Where | Offline answer |
|---|---|---|
| The bundle (HTML/JS/CSS) | served from host | **PWA service worker** caches the app shell → opens with no signal |
| OSM raster tiles | `tile.openstreetmap.org/{z}/{x}/{y}.png` ([App.tsx:621](../src/App.tsx#L621)) | runtime cache *what you view* (compliant); **bulk prefetch is against OSM policy** — true offline maps come from Organic Maps |
| OSRM routing | `router.project-osrm.org` Route + Trip ([osrm.ts:27](../src/osrm.ts#L27), [osrm.ts:53](../src/osrm.ts#L53)) | already cached in localStorage — **build every route once on wifi**, they replay offline |

> **Bottom line up front:** Full offline raster tiles for this corridor are **both too heavy (~0.6–1 GB at z14) and prohibited by the OSM tile policy.** The highest value-for-effort path to "still works in a dead zone in Durmitor" is **(a)** a thin PWA so the app + already-built routes open offline, plus **(b)** a one-click **KML/GPX export into Organic Maps**, which has *proper* offline vector maps and turn-by-turn car nav built from the same OSM data. The prioritized list is at the end.

---

## 1. Hosting — Netlify CLI (recommended)

**Goal:** a public HTTPS URL all 4 phones open; redeploy on data change is one command.

**Why Netlify CLI over the alternatives, for *this* repo:**

- **This dir is not a git repo** (verified: `Is a git repository: false`). GitHub Pages *requires* a repo + remote + a push/Action on every change, and a Pages **project site** forces a base-path change (below). That's the most moving parts for a throwaway tool.
- **Netlify CLI deploys a folder directly, no git needed**, auto-provisions HTTPS, and serves at the **site root** so `base` stays `'/'` — **no base-path gotcha at all.** ([Netlify: deploy without git](https://www.matthewhowell.net/notes/2025/deploying-static-sites-on-netlify-without-github/), [CLI deploy ref](https://cli.netlify.com/commands/deploy/))
- Vercel CLai (`vercel --prod`) is equally fine and auto-detects Vite ([Vite deploy guide](https://vite.dev/guide/static-deploy.html)); pick it instead if you already have a Vercel account. Same root-base, same HTTPS. Netlify is the recommendation only because its `--dir` flag makes "deploy this exact `dist/`" the most explicit.

### Exact steps (one-time)

```bash
npm i -g netlify-cli         # once, globally
npm run build                # produces dist/  (tsc + vite build)
netlify deploy --dir=dist    # draft deploy; first run: "Create & configure a new site",
                             # pick a team, name it e.g. balkans-trip-2026
netlify deploy --dir=dist --prod   # promote to the live URL
```

You get `https://balkans-trip-2026.netlify.app` (rename in the dashboard). HTTPS is automatic and is **required for phone GPS** (§4) — `navigator.geolocation` only works in a secure context.

### Redeploy on data change — make it one command

Data is baked into the bundle at build time (`import.meta.glob('./data/*.json', { eager: true })`, [store.ts:3](../src/store.ts#L3)). **Any edit to `src/data/*.json` requires a rebuild + redeploy** — the live site does not see JSON changes until then. Add one script to `package.json` so it's a single command (dev session: add this, I didn't):

```jsonc
// package.json → "scripts"
"deploy": "npm run build && netlify deploy --dir=dist --prod"
```

Then every data change ships with:

```bash
npm run deploy
```

> **Base-path gotcha (only relevant if you reject Netlify for GitHub Pages).** A GH Pages *project* site lives at `https://<user>.github.io/<repo>/`, so you **must** set `base: '/<repo>/'` in `vite.config.ts` or every asset 404s ([Vite docs](https://vite.dev/guide/static-deploy.html)). [index.html:11](../index.html#L11) uses an absolute `/src/main.tsx` and Leaflet loads marker assets by URL — both break under a sub-path unless `base` is set. Netlify/Vercel root deploys keep `base: '/'`, so **none of this applies** and you save the config + a `gh-pages` Action. This is the single biggest reason to prefer Netlify here.

---

## 2. PWA / offline

Use **`vite-plugin-pwa`** (Workbox under the hood). Minimal, well-documented, generates the manifest + service worker and wires registration automatically. ([vite-pwa guide](https://vite-pwa-org.netlify.app/guide/))

```bash
npm i -D vite-plugin-pwa
```

### 2a. Config — app shell + baked data (the easy, 100%-worth-it part)

```ts
// vite.config.ts  (dev session edits this — I did not)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',           // new deploy → SW updates silently next load
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Balkans Trip — Jun 16–28',
        short_name: 'Balkans',
        theme_color: '#8e44ad',
        background_color: '#ffffff',
        display: 'standalone',              // "Add to Home Screen" → opens like an app
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // App shell: every built JS/CSS/HTML asset is precached → app opens with zero signal.
        // The places JSON is compiled INTO the JS bundle (import.meta.glob eager), so it is
        // precached automatically — no separate data-caching rule needed.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // OSM raster tiles: cache-first, cache ONLY what the user actually views.
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*\.png$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30d ≥ OSM 7d min
              cacheableResponse: { statuses: [0, 200] }, // 0 = opaque cross-origin tile responses
            },
          },
          {
            // OSRM responses: network-first so fresh edits win, fall back to cache offline.
            // (The app ALSO persists routes in localStorage — this is belt-and-suspenders.)
            urlPattern: /^https:\/\/router\.project-osrm\.org\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'osrm', expiration: { maxEntries: 200 } },
          },
        ],
      },
    }),
  ],
});
```

Add icons `public/pwa-192.png` / `public/pwa-512.png` (any square logo). That's the whole "app opens offline" story — **do this regardless of everything below.**

### 2b. Tile caching strategy + honest storage estimate

**The blocker, verified against the source of truth.** The [OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) explicitly **prohibits prefetching**: *"any pre-emptive fetching of tiles other than those a user is actively viewing"* — including *"offline download features that rely on prefetching"* and *"automated scans across wide bounding boxes at high zoom (z≥14)."* It states such patterns *"will be blocked without notice."* So a "download all tiles for the corridor" button pointed at `tile.openstreetmap.org` is **not an option** — it risks getting all 4 phones' IP / our deploy throttled mid-trip, the opposite of what we want.

**What *is* compliant:** the `CacheFirst` rule in 2a — it caches exactly the tiles a user pans/zooms over, keeps them ≥7 days, sends no `no-cache`. Realistically after browsing the planned areas on wifi you accumulate a few tens of MB and those exact views render offline. (Set a unique `User-Agent` is a native-app requirement; browsers set their own and that's fine.)

**Storage estimate — for the whole corridor, if a bulk prefetch *were* allowed** (it isn't; numbers show why it's also too heavy). Computed from real tile-grid math (`avg 15–20 KB/PNG` for this mixed coast/mountain/rural terrain):

| Area | z8–13 | z14 alone | **z8–14 total** |
|---|---|---|---|
| **Full** (incl. Plitvice N + deep-south Ulcinj/Ada Bojana) | ~204 MB | ~605–806 MB | **~0.8–1.1 GB** |
| **Core** (Zadar→Dubrovnik + BA/ME loop, no Plitvice/deep-south) | ~128 MB | ~375–500 MB | **~0.5–0.67 GB** |
| **Route-corridor ribbon** (10 km buffer each side of the loop) | ~33 MB | ~100 MB | **~134 MB** |

Takeaways: **z14 quadruples everything** — it's where streets/labels get useful but also where size explodes; **z8–13 of a route-only ribbon is just ~33 MB** and would have been the sweet spot. But since OSM policy forbids the prefetch regardless, the honest conclusion is: **don't build offline raster tiles.** Alternatives if you ever truly need cached raster:
1. **A tile provider that *permits* offline/caching** with a free key — e.g. MapTiler / Stadia Maps / Thunderforest — then a corridor-ribbon prefetch at z8–13 (~33 MB) becomes legitimate. (Swap the `TileLayer` URL + add the rule. Extra setup; only if §3 isn't enough.)
2. **Accept online-only tiles** in the app and use **Organic Maps for offline maps** (§3) — recommended.

### 2c. "Download for offline" button — spec (routes, not tiles)

Because tiles can't be legitimately bulk-fetched, this button's real job is **pre-building every OSRM route while on wifi** so they replay from the existing localStorage cache in dead zones. Routes already persist to `balkans-trip-osrm-cache` ([store.ts:60](../src/store.ts#L60)) and `balkans-trip-osrm-trip-cache` ([store.ts:82](../src/store.ts#L82)); the app reads cache-first before hitting the network ([useDayRoutes.ts:39](../src/useDayRoutes.ts#L39), [App.tsx:342](../src/App.tsx#L342)). So **once a route is built online, it renders offline forever** (until localStorage is cleared). The button just guarantees they're all built.

Spec (dev session — sibling to `exportJson` in [App.tsx:392](../src/App.tsx#L392), button in `.sidebar-actions` [App.tsx:608](../src/App.tsx#L608)):

```ts
// "Prep offline" — build every committed day-route + the current trip, sequentially.
async function prepOffline() {
  const cache = loadRouteCache();
  let built = 0;
  for (const [dayStr, pts] of Object.entries(dayPoints)) {       // dayPoints already in App scope
    if (pts.length < 2) continue;
    const key = routeKey(pts);
    if (cache[key]) continue;                                    // already offline-ready
    const r = await fetchRoute(pts);                             // sequential = kind to demo OSRM
    if (r) { cache[key] = r; saveRouteCache(cache); built++; }
  }
  // The active route-builder trip (if any) is already cached by buildRoute().
  alert(`Offline-ready: ${Object.keys(cache).length} routes (${built} new). ` +
        `Now pan/zoom your route areas on the map while on wifi to cache those tiles, ` +
        `then add the app to your home screen.`);
}
```

Note the localStorage ~5 MB/origin ceiling: full-geometry day routes are ~10–50 KB JSON each, so ~13 days + a handful of trips is comfortably under it. Tiles do **not** go here — they live in the Cache Storage API via the service worker (much larger device quota).

> **Honest verdict on 2b/2c:** the PWA app-shell cache (2a) is high-value and trivial — do it. The "download for offline" tile story is the weak link: bulk OSM prefetch is prohibited, viewed-tile caching is partial, and a third-party tile key is real setup. **For guaranteed maps in a Durmitor dead zone, §3 (Organic Maps) beats trying to make this app's raster tiles fully offline.** Say it plainly to the group.

---

## 3. Fallback export — KML/GPX → Organic Maps + Google My Maps  ⭐ highest value/effort

**This is the recommendation for true dead-zone coverage**, and it's a self-contained client-side function — no hosting/PWA dependency. **[Organic Maps](https://organicmaps.app/)** is a free, no-account, fully-offline maps + **turn-by-turn car/walk/bike nav** app using the same OSM data. You download Croatia / Bosnia & Herzegovina / Montenegro regions once on wifi (a few hundred MB each, proper vector maps — far better than cached raster), then **import our places + routes** and navigate with zero signal. Verified: Organic Maps imports **KML, KMZ, KMB, GPX, GeoJSON** as bookmarks *and* tracks ([import FAQ](https://organicmaps.app/faq/bookmarks/how-to-import/), [GPX support](https://organicmaps.app/news/2023-06-07/gpx-import-is-now-supported-in-organic-maps/)).

**Google My Maps** is the lighter alternative (shareable link, works in a browser, online): imports **KML/KMZ (≤5 MB unzipped), CSV (WKT), GPX**; cap **2,000 features/layer, 10 layers/map** ([import help](https://support.google.com/mymaps/answer/3024836)). We have <200 places → fine on features, but **13 day-folders exceed the 10-layer cap and silently truncate** — see the grouping note below.

### Recommend **KML** as the primary format

One KML carries everything we have: styled points (per-category colour), rich descriptions, **and** the route LineStrings — and it imports into *both* targets. GPX is offered as a secondary, nav-focused export (waypoints + tracks, no styling/descriptions).

### Precise mapping against [`src/types.ts`](../src/types.ts)

**`Place` → KML `<Placemark>` (a point):**

- `<name>` ← `place.name`
- `<description>` ← CDATA HTML built from `category`, `COUNTRY_NAMES[country]`, `status`, `rating` (★), `cost`, `timeNeeded`, `bestTime`, `facilities`, `description`, `communityNotes`, `tags`, and `sources` as `<a href>` links. (Organic Maps renders this in the bookmark; My Maps shows it in the pin card.)
- `<Point><coordinates>lng,lat,0</coordinates></Point>` — **KML is `lng,lat,alt` order** (longitude first). Use `place.lng, place.lat`.
- `<styleUrl>#cat-{category}</styleUrl>` → a `<Style>` per category whose `<IconStyle><color>` is the [`CATEGORY_COLORS`](../src/constants.ts#L11) hex converted to KML **`aabbggrr`** (alpha-first, **B-G-R reversed**). e.g. `town #9b59b6` → `ffb6599b`.

**Day route (`DayRoutes[day].coordinates`, OSRM `[lng,lat][]`, [store.ts:57](../src/store.ts#L57)) → KML `<Placemark><LineString>`:**

- OSRM geometry is already `[lng,lat]` → KML `lng,lat,0` directly, **no flip** (unlike the app, which flips to `[lat,lng]` for Leaflet in `toLatLngs`, [App.tsx:54](../src/App.tsx#L54)).
- Wrap in a per-day `<Folder>` with a coloured `<LineStyle>` (reuse [`dayColor(day)`](../src/trip.ts#L34)).

**Grouping into `<Folder>`s:**
- **For Organic Maps:** one `<Folder>` per trip day (`Day 1 · Tue Jun 16` via [`dayLabel`](../src/trip.ts#L23)) holding that day's pins + its route LineString, plus one "Shortlist (unassigned)" folder. Folders → bookmark categories you can toggle. 13 folders is fine here.
- **For Google My Maps:** **cap at ≤10 layers.** 13 day-folders → days 11–13 silently dropped. Offer a `groupBy: 'country'` variant (3 folders: Croatia/Bosnia/Montenegro) for the My Maps export, or a single flat folder. Pick country grouping as the My Maps default.

### Paste-ready builder (dev session adds; reads `places` + `routes` already in [App.tsx](../src/App.tsx) scope)

```ts
// --- KML export ---------------------------------------------------------
const hex2kml = (hex: string) => {                  // "#9b59b6" -> "ffb6599b" (aabbggrr)
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
  const src = (p.sources ?? []).map((u) => `<a href="${xml(u)}">${xml(u)}</a>`).join('<br/>');
  return `<![CDATA[${L.map(xml).join('<br/>')}${src ? '<br/>' + src : ''}]]>`;
}

function buildKml(places: PlaceWithOverride[], routes: DayRoutes, groupBy: 'day' | 'country'): string {
  // category icon styles
  const styles = (Object.keys(CATEGORY_COLORS) as Category[])
    .map((c) => `<Style id="cat-${c}"><IconStyle><color>${hex2kml(CATEGORY_COLORS[c])}</color>` +
      `<scale>1.1</scale></IconStyle></Style>`).join('');

  const placemark = (p: PlaceWithOverride) =>
    `<Placemark><name>${xml(p.name)}</name><description>${placeDesc(p)}</description>` +
    `<styleUrl>#cat-${p.category}</styleUrl>` +
    `<Point><coordinates>${p.lng},${p.lat},0</coordinates></Point></Placemark>`;

  const lineString = (day: number, coords: [number, number][]) =>
    `<Placemark><name>Day ${day} route</name>` +
    `<Style><LineStyle><color>${hex2kml(dayColor(day))}</color><width>4</width></LineStyle></Style>` +
    `<LineString><tessellate>1</tessellate><coordinates>` +
    coords.map(([lng, lat]) => `${lng},${lat},0`).join(' ') +
    `</coordinates></LineString></Placemark>`;

  let folders = '';
  if (groupBy === 'day') {
    for (let d = 1; d <= 13; d++) {
      const ps = places.filter((p) => p.day === d);
      const r = routes[d];
      if (!ps.length && !r) continue;
      folders += `<Folder><name>${xml(dayLabel(d))}</name>` +
        ps.map(placemark).join('') + (r ? lineString(d, r.coordinates) : '') + `</Folder>`;
    }
    const loose = places.filter((p) => !p.day);
    if (loose.length) folders += `<Folder><name>Unassigned</name>${loose.map(placemark).join('')}</Folder>`;
  } else { // country (≤3 folders → safe for Google My Maps' 10-layer cap)
    for (const c of COUNTRIES) {
      const ps = places.filter((p) => p.country === c);
      if (ps.length) folders += `<Folder><name>${COUNTRY_NAMES[c]}</name>${ps.map(placemark).join('')}</Folder>`;
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<kml xmlns="http://www.opengis.net/kml/2.2"><Document>` +
    `<name>Balkans Trip — Jun 16–28</name>${styles}${folders}</Document></kml>`;
}

// --- GPX export (waypoints + per-day tracks; for pure nav) --------------
function buildGpx(places: PlaceWithOverride[], routes: DayRoutes): string {
  const wpts = places.map((p) =>
    `<wpt lat="${p.lat}" lon="${p.lng}"><name>${xml(p.name)}</name>` +
    `<desc>${xml(p.description ?? '')}</desc></wpt>`).join('');
  const trks = Object.entries(routes).map(([d, r]) =>
    `<trk><name>Day ${d}</name><trkseg>` +
    r.coordinates.map(([lng, lat]) => `<trkpt lat="${lat}" lon="${lng}"></trkpt>`).join('') +
    `</trkseg></trk>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx version="1.1" creator="balkans-trip" xmlns="http://www.topografix.com/GPX/1/1">` +
    `${wpts}${trks}</gpx>`;
}

function downloadText(text: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
// Buttons (next to Export JSON):
//   Organic Maps (KML): downloadText(buildKml(places, routes, 'day'),    'balkans-trip.kml', 'application/vnd.google-earth.kml+xml')
//   Google My Maps (KML): downloadText(buildKml(places, routes, 'country'),'balkans-mymaps.kml','application/vnd.google-earth.kml+xml')
//   GPX (nav):           downloadText(buildGpx(places, routes),          'balkans-trip.gpx', 'application/gpx+xml')
```

**Phone import recipe (give this to the group):**
- *Organic Maps:* install → Download maps: **Croatia, Bosnia and Herzegovina, Montenegro** (on wifi) → AirDrop/email the `.kml` to the phone → tap it → "Open/Import with Organic Maps". Pins + day routes appear; tap a pin → "Route to" for offline turn-by-turn.
- *Google My Maps:* mymaps.google.com → Create map → Import → upload `balkans-mymaps.kml` per layer. Shareable link; viewable in the Google Maps app (online).

---

## 4. Phone GPS — "center on me"

`navigator.geolocation` / Leaflet `map.locate()` require a **secure context (HTTPS)** — satisfied automatically by Netlify/Vercel/GH Pages (and by `localhost` in dev). No extra hosting config beyond §1. GPS itself is a local sensor, so **the blue dot keeps working in dead zones** as long as the app shell is cached (§2a) — that's the main reason to ship the PWA.

Spec (dev session — a control inside `<MapContainer>`, [App.tsx:618](../src/App.tsx#L618)):

```tsx
function LocateButton() {
  const map = useMap();
  return (
    <button
      className="locate-fab"
      onClick={() =>
        map.locate({ setView: true, maxZoom: 14, enableHighAccuracy: true })
      }
      title="Center on me"
    >📍</button>
  );
}
// + map.on('locationfound', e => marker at e.latlng) / map.on('locationerror', …show toast)
```

iOS Safari prompts for location permission on first tap; if denied, the app must show a hint (`locationerror`) rather than silently doing nothing. No API key, no network needed once the shell is cached.

---

## Minimal-effort path to "still works in a dead zone in Durmitor" — prioritized

Do them in order; each is independently shippable. **1–3 are the 80/20 and take an afternoon.**

1. **Deploy on Netlify** (§1). `npm i -g netlify-cli`, `npm run build`, `netlify deploy --dir=dist --prod`. Add the `deploy` npm script. → public HTTPS URL on all 4 phones; GPS unlocked. *(~15 min)*
2. **Add `vite-plugin-pwa` with the §2a config**, generate two icons, redeploy. → app + all baked place data + already-built routes **open offline**; "Add to Home Screen" on every phone. *(~30 min)*
3. **Ship the KML/GPX export (§3) + the "Prep offline" routes button (§2c).** Before leaving wifi each morning: tap "Prep offline" (caches the day's routes), and export once to **Organic Maps** with the 3 country maps downloaded. → **this is the real dead-zone guarantee**: full offline vector maps + turn-by-turn nav, independent of our raster tiles. *(~1–2 h; highest value/effort ratio of anything here)*
4. **(Optional) Viewed-tile caching is already covered** by the §2a `CacheFirst` rule — just pan/zoom the planned areas on wifi and those exact map views replay offline. No extra work; partial coverage only.
5. **(Skip unless 1–4 prove insufficient) Third-party tile key** (MapTiler/Stadia) + a policy-compliant **corridor-ribbon prefetch at z8–13 (~33 MB)** for true offline *in-app* raster maps. Real setup (key, URL swap, prefetch UI); Organic Maps already covers the need, so this is last.

**Do not:** bulk-prefetch `tile.openstreetmap.org` — it violates the OSM tile policy and risks getting the phones/deploy blocked mid-trip, and at z14 it's 0.6–1 GB anyway.
