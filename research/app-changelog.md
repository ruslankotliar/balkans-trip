# App changelog — planning features

What the app dev session added on top of the original map+sidebar+filters tool.
Everything is client-side; the only persistence is `localStorage` (plus "Export JSON").
`src/data/*.json` is **read-only** here — research sessions own those files, and the
app auto-loads any number of them (it's running ~190 places across several files now
with no code changes).

## How state is stored

`localStorage` keys:

- `balkans-trip-overrides` — per-place edits: `{ status?, day?, dayOrder?, note? }`
  (`src/store.ts`, `Override` type). Merged onto base places at load
  (`PlaceWithOverride`).
- `balkans-trip-osrm-cache` — driving routes keyed by exact coordinate sequence.
- `balkans-trip-osrm-trip-cache` — TSP/Trip solves keyed by `trip:<coord-seq>`.

"Export JSON" dumps the merged places, so day / dayOrder / note are included.

## Features

### 1. Day planner (Itinerary view)
- Trip = Jun 16 (Day 1) → Jun 28 (Day 13). Date helpers in `src/trip.ts`.
- Assign a place to a day from the **detail panel** (day dropdown) or the
  **Itinerary backlog** ("+ day"). Reorder within a day with ↑/↓ (renumbers
  `dayOrder` densely). ✕ removes from the day.
- Itinerary view: one block per day with its date + ordered stops, a driving
  summary per day, a trip total, and a **backlog** of shortlisted-but-unscheduled
  places.

### 2. Driving routes (per day)
- For each day with **2+ ordered stops**, fetches the driving route from the public
  OSRM (`/route/v1/driving`), draws it as a per-day colored polyline, and shows
  per-day + total time/km. Cached by coordinate sequence, debounced 600ms, fetched
  sequentially (kind to the free server). `src/osrm.ts`, `src/useDayRoutes.ts`.

### 3. Route builder (OSRM Trip / TSP)  — "Route builder" tab
- Tick stops (checkbox list) or "Select all shortlisted"; pick start/end
  (defaults: northernmost = start, southernmost = end — i.e. Zadar-side →
  Dubrovnik-side).
- "Build optimal route" calls `/trip/v1/driving?source=first&destination=last&roundtrip=false`,
  draws the optimized path with **numbered waypoints**, and lists the ordered stops
  with per-leg time/km + a total. Cached in localStorage.
- **"Apply order to days"** splits the optimized sequence into trip days using a
  max-driving-hours/day slider (default 3h) and writes day/dayOrder overrides
  (feeds the Itinerary + per-day routes). Live "splits into N days" preview; warns
  if it needs > 13 days.
- Graceful handling of OSRM failures and the ~100-waypoint cap.

### 4. Nearby finder (in the detail panel)
- "Find sleep nearby": campsites + accommodation within N km (haversine, slider
  5–30km) of the selected place. Matches are enlarged/highlighted, everything else
  dims. Matches render **even if the current filters/search would hide them**
  (rejected stays excluded).

### 5. Route corridor finder ("🛏 Find sleep along this route")
- From a built route — a day route (🛏 button in the Itinerary day header) or the
  optimized route (button in the Route builder) — finds campsite/accommodation
  pins within N km of the route **polyline** (point-to-segment distance, slider
  2–20km, default 10). `pointToPolylineKm` / `nearestLegIndex` in `src/trip.ts`.
- Results are grouped by the **leg** (stop→stop) they're nearest to and shown as
  scannable cards: name, ★rating, "X km off", 💶 cost, 🚿 facilities — for
  comparing value for money. Matches highlight; everything else dims; the route is
  drawn in purple.
- Works for **any** category as a route waypoint, and any `accommodation` pin
  (e.g. Airbnb pins the master session will add later) shows up here automatically.

### 6. Detail panel + polish
- The cramped Leaflet popup is now just **name + status buttons + "Details →"**.
  Full info, day assignment, note, sources, and the nearby finder live in a proper
  **side detail panel**.
- Tag filtering (collapsible), per-status **counts** on the status chips, "📝" and
  "D{n}" markers in the place list.
- **Mobile**: below 760px the sidebar collapses behind a ☰ toggle; detail panel
  reflows.
- Search now matches name **+ note + description + tags**.
- "Fit map" button (fits to filtered places) and a **URL hash** of the map view
  (`#lat/lng/zoom`) so a view can be bookmarked/shared.

## Files added
`src/constants.ts`, `src/trip.ts`, `src/osrm.ts`, `src/useDayRoutes.ts`,
`src/components/{DetailPanel,Itinerary,RouteBuilder,CorridorPanel}.tsx`.
`src/store.ts` and `src/App.tsx` extended; `src/types.ts` left untouched (overrides
carry the new fields). `npm run build` stays green.

## Known limitations / notes
- **Per-day driving total counts only intra-day legs.** A day with a single stop
  shows no driving even though you relocated to it — the relocation (overnight) leg
  isn't attributed to a day. The Route builder's own summary shows the true
  end-to-end total; the corridor view is the better tool for picking where to sleep
  between stops.
- OSRM is the **public demo server** — it can rate-limit or be briefly down;
  failures surface as an error message and you can retry (results cache once they
  succeed). "Apply order to days" needs a successful Trip solve first.
- The Trip cache key is order-dependent on purpose (the cached `order` indices must
  line up with the exact input sequence). Same selection + same start/end ⇒ cache
  hit.
- No marker declustering yet — at low zoom the ~190 pins overlap (esp. the
  Dubrovnik/Makarska clusters). "Fit map", category/status/tag filters, and search
  are the current ways to cut the clutter. A lightweight grid grouping was left out
  to avoid risk; it's the obvious next polish step.
- Tag list is large (research generated many tags); it lives in a collapsed
  `<details>` so it doesn't dominate the sidebar.

## 2026-06-10 — Session G2: route quality, trip mode, offline/deploy

Three stages, `npm run build` green after each (verified with headless Chrome
against the dev server and `vite preview`).

### 7. Route builder v2 — matrix + LOCAL solver (replaces the OSRM /trip heuristic)

- **Architecture:** one OSRM `/table` call fetches the full duration+distance
  matrix (`fetchTable` in `src/osrm.ts`); the visiting order is then solved
  **locally** in `src/solver.ts`:
  - **exact Held-Karp DP** for ≤12 free stops between fixed endpoints
    (≤14 waypoints) — provably optimal;
  - **nearest-neighbor + 8 seeded restarts, polished with 2-opt + or-opt**
    for larger sets.
  - Held-Karp was verified against brute-force on 30 random asymmetric
    matrices (standalone node test via esbuild).
- The result is labeled in the UI: green **"✓ exact optimum (Held-Karp)"** vs
  amber **"~ heuristic (NN + 2-opt/or-opt)"** (`.rb-method` chip).
- OSRM `/route` is now used **only to draw the final geometry** (and for true
  road leg times); if it fails, the solve still returns with matrix legs and a
  straight-line preview, clearly labeled.
- **Dev comparison:** in `npm run dev`, every fresh solve also calls `/trip`
  and `console.log`s whether the local solver matched/beat it (warns if /trip
  was ever better).
- **Anchored segments:** 📌 any selected stop in the Route builder list to pin
  it as an **ordered anchor** (reorder with ↑/↓ in the anchors box). Start →
  anchors (in user order) → end; each free stop is assigned to the segment
  with the smallest duration detour, then each segment is solved
  independently (small segments stay exact). Anchor positions are stored as
  `segStarts` on the cached result; per-segment totals are listed.
- **Ferry awareness:** every leg in the ordered result has a small "⛴ h"
  input — manual hours (wait + crossing) for legs OSRM can't time (Mljet,
  Korčula…). Stored in localStorage `balkans-trip-ferry-hours` keyed by the
  *place-id pair* (direction-independent), so it survives rebuilds and
  reorderings. Ferry hours are included in the route total, the per-leg
  times, the "splits into N days" preview, "Apply order to days", the
  Itinerary day totals (⛴ marker), and the Today view legs. Ferry legs are
  drawn as a **dashed blue overlay** (geometry sliced via the snapped
  waypoints OSRM returns; `sliceLegCoords` in App).
- **Sanity output:** per-leg minutes (already there) + per-segment totals +
  an explicit warning listing any day whose driving exceeds the max-h/day
  slider (happens when a single leg alone exceeds it).
- Cache key moved to `trip2:<coords>|a:<anchors>` — old `/trip` cache entries
  are simply ignored. `CachedRoute` gained optional `legs` + `snapped`
  (backward compatible); day-route cache entries without `legs` are refetched
  once to upgrade them.

### 8. Trip mode (UX review #1–#10, the phone-on-the-road UI)

- **Planning ⇄ Trip pill** in the header (persisted, `balkans-trip-mode`;
  auto-defaults to Trip when the real date is inside Jun 16–28;
  `?mode=trip|planning` URL override for sharing/testing).
- **Trip mode hides all research machinery**: filters, status chips, tags,
  search, view tabs, Route builder, Export/Fit buttons, the candidate
  haystack. The sidebar *is* the **Today view** (`src/components/Today.tsx`),
  open by default.
- **Today view:** day strip (◀ Day N · date ▶, "TODAY" badge only inside the
  trip window, tap label to jump back to today), big numbered stop rows with
  per-leg drive times (incl. ⛴), **done check** (✓ greys the stop and its
  numbered map pin), **skip** with a 6-second **Undo toast**, and a
  **"Next → stop · drive time · ~km from you"** banner with a Google-Maps
  Navigate deep-link.
- **🛏 Sleep tonight / 📍 Near me** one-tap finders: anchored to the GPS fix
  (else today's last stop), fixed radii (25/30 km), scannable cards (★, km,
  💶 cost, 🚿 facilities, Navigate ↗). Matches highlight on the map and
  everything else dims; finds work even though the candidate pins are hidden.
- **GPS:** a 52px 📍 FAB (bottom-right, both modes) — `getCurrentPosition` +
  `watchPosition`, blue you-are-here dot, last fix cached in localStorage so
  a cold start in a dead zone still shows an approximate dot. Permission
  denial shows a hint. Needs HTTPS on phones (see deploy).
- **Map in trip mode:** only today's stops (big, numbered in the day color),
  tomorrow + shortlist/backup as small soft pins, today's route line only,
  ferry legs dashed. Tapping a pin opens the **detail sheet directly** (no
  popup two-step); on phones the detail panel becomes a bottom sheet
  (≤45vh) so the map stays visible; status buttons hidden in trip mode.
- **Planning default narrowed:** status filter starts as shortlist+backup
  (the 150-candidate haystack is one tap away on the `candidate` chip).
- Bigger touch targets in trip mode via `body.trip-mode` CSS.
- New localStorage keys: `balkans-trip-mode`, `balkans-trip-done`,
  `balkans-trip-last-fix`, `balkans-trip-ferry-hours`.

### 9. Offline + deploy (minimal path from research/offline-deploy.md)

- **PWA via `vite-plugin-pwa`** (devDependency): precaches the app shell +
  bundle (places JSON is compiled in → available offline), manifest with
  generated icons (`public/pwa-192.png`, `public/pwa-512.png`),
  `registerType: autoUpdate`. Runtime caching: OSM tiles **CacheFirst**
  (3000 entries / 30 days — caches only what you actually view, per OSM tile
  policy; **no bulk prefetch**), OSRM **NetworkFirst**. Verified: build emits
  `sw.js` + `manifest.webmanifest` + `registerSW.js`, 9 precache entries.
- **"⬇ Prep offline" button** (planning sidebar, "Offline & phone export…"):
  sequentially builds every committed day route into the localStorage OSRM
  cache while on wifi, so routes replay in dead zones.
- **KML/GPX export** (`src/exports.ts`): "KML → Organic Maps" (folders per
  day + day-route LineStrings + Unassigned, per-category icon colors in KML
  aabbggrr), "KML → Google My Maps" (grouped by country — stays under the
  10-layer import cap), "GPX (waypoints + day tracks)". Coordinates verified
  lng,lat for KML, lat/lon attrs for GPX; XML well-formedness tested.
  Organic Maps (with HR/BA/ME maps downloaded) is the real dead-zone
  guarantee — full offline vector maps + turn-by-turn nav.
- **`npm run deploy`** script added (`netlify deploy --dir=dist --prod`).
  The actual Netlify site creation needs an account login — run
  `npm i -g netlify-cli && netlify deploy --dir=dist` once, then
  `npm run deploy` after any data change. Until then the PWA/exports work
  from any static host or `vite preview`.

### Files (this session)
Added: `src/solver.ts`, `src/exports.ts`, `src/components/Today.tsx`,
`public/pwa-192.png`, `public/pwa-512.png`.
Extended: `src/osrm.ts` (fetchTable, legs+snapped on routes), `src/store.ts`
(TripResult.exact/method/segStarts, ferry/mode/done/fix stores),
`src/trip.ts` (currentTripDay, isDuringTrip, splitIntoDays dayTotals),
`src/useDayRoutes.ts`, `src/App.tsx`, `src/components/{RouteBuilder,
Itinerary,DetailPanel}.tsx`, `src/styles.css`, `vite.config.ts`,
`package.json`. `src/data/` and the `Place` schema untouched.

### Notes / limitations
- With anchors, the free-stop→segment assignment is a greedy min-detour
  heuristic (segments themselves are solved exactly when small) — the label
  says "anchored · exact per segment" rather than claiming a global optimum.
- The public OSRM demo server still rate-limits; /table failures surface as
  a retryable error message.
- "Done" state is intentionally *not* part of overrides/Export JSON — it's
  trip ephemera (`balkans-trip-done`).
- Trip-mode "Sleep tonight"/"Near me" use straight-line km (haversine), not
  road distance — fine for a 25–30 km radius shortlist.

## 2026-06-10 — Session G3: booking & source link UX

Places now lead with their MOST USEFUL link instead of anonymous `[1][2]`
footnotes + a dominant Google Maps link. Works in both planning and trip
modes; `npm run build` green; verified with headless Chrome (CDP-driven
clicks against `vite preview`: detail panel, popup, trip-mode sheet,
Sleep-tonight cards, presets).

### 10. Domain-labeled source links (`src/links.ts`)

- Every URL in `sources` is classified by hostname:
  - `airbnb.*` → **"Open on Airbnb"**, `booking.com` → "Open on Booking.com"
    (kind `booking`);
  - park4night / campercontact / camping.info / pitchup → **"Campsite
    reviews"** (kind `campsite`);
  - outdooractive / alltrails / komoot / wikiloc / summitpost → **"Trail
    guide / GPX"**;
  - reddit / tripadvisor / *forum* → **"Traveler reports"**;
  - anything else → the site's hostname (e.g. `np-paklenica.hr`).
- Links are deduped, sorted booking → campsite → trail → reports → other,
  and repeated labels are numbered ("Traveler reports 2").
- **Primary booking button:** the first booking-type link (Airbnb/campsite)
  renders as a big colored "🔖 Open on Airbnb ↗" / "⛺ Campsite reviews ↗"
  button at the **top** of the detail panel (and of the trip-mode bottom
  sheet — `title="Book / View listing"`). Airbnb red / campsite blue.
- Remaining links render as colored **label chips** in the panel footer.
- **Google Maps demoted** everywhere to a small grey "Navigate ↗ (Google
  Maps)" link — still one tap in the car, never the main affordance.

### Booking one tap away in lists/finders

- **Corridor finder** ("sleep along this route") and trip-mode **Sleep
  tonight / Near me** cards: each card now has a `card-links` row —
  "Open on Airbnb ↗"/"Campsite reviews ↗" + small "Navigate ↗"
  (`stopPropagation`, so the card tap still opens the detail panel).
- **Place list rows** (planning sidebar): places with a booking-type source
  get a small round ↗ badge (red = Airbnb/Booking, blue = campsite portal)
  that opens the listing directly — booking is one tap from any list.
- **Map popup** (planning): compact link chips (first 3, booking first) +
  small Navigate link above the status buttons.

### Filtering convenience: one-tap presets

Audit: shortlist-only was 1 tap (toggle backup off), but campsites-only
meant un-tapping ~10 category chips → failed the ≤2-taps rule. Added a
`preset-row` of one-tap quick filters above the country chips (planning,
Places + Route builder views):

- **🛏 Sleep spots** — campsite+accommodation categories, all non-rejected
  statuses (you want to see every option when picking where to sleep);
- **⭐ Shortlist** — status shortlist only, all categories;
- **🥾 Do & see** — hike/activity/beach/nature/viewpoint/sight, non-rejected
  ("activities near me" = this + the map is already where you are);
- **↺ All** — back to the default view (all categories, shortlist+backup).

Presets also clear the tag filter; the matching preset highlights when
active. Flows now: campsites+stays 1 tap; pure campsites 2 taps (preset +
toggle accommodation off); shortlist-only 1 tap; activities 1 tap. Trip
mode already had one-tap finders (🛏 Sleep tonight / 📍 Near me) — its
cards just gained the booking links.

### Files (this session)

Added: `src/links.ts` (classifier + `deriveLinks`/`bookingFor`/`navUrl`).
Extended: `src/components/{DetailPanel,CorridorPanel,Today}.tsx`,
`src/App.tsx` (presets, popup links, list badges, `bookingById` memo),
`src/styles.css` (`.book-btn`, `.link-chip`, `.nav-link`, `.card-links`,
`.book-mini`, `.popup-links`, `.chip.preset`; trip-mode sizes bumped).
`src/data/` and the `Place` schema untouched.

### Notes

- The primary booking link is excluded from the footer chip list (no
  duplication); multi-source places keep all other chips.
- `bookingById` is memoized over the base places — `sources` never change
  at runtime, so list rows pay nothing.
- Verified live: "Open on Airbnb" primary button (planning panel + trip
  sheet), "Campsite reviews" (campercontact/pitchup), "Trail guide / GPX"
  (alltrails), "Traveler reports" (tripadvisor), hostname fallback, popup
  chips, Sleep-tonight card links near Žabljak, preset row (57 sleep spots
  in one tap, active-state highlight).

## 2026-06-10 — Quota bugfix: localStorage QuotaExceededError in the route builder

**Bug (user-reported):** building a route died with an uncaught
`QuotaExceededError: Setting the value of 'balkans-trip-osrm-trip-cache'
exceeded the quota.` The route/trip caches stored **full OSRM geometries**
(thousands of `[lng,lat]` points, hundreds of KB per route) in localStorage
(~5 MB, shared with overrides + all other keys). `saveTripCache()` threw
inside `buildRoute()`'s async chain with no handler → the promise rejected
unhandled, `setRbTrip` never ran, and the UI stayed stuck on "Solving…" even
though OSRM had answered fine.

**Fix (`src/store.ts`, `src/App.tsx`):**

- **`safeSetItem()`** — single quota-safe wrapper now used by *every*
  localStorage write (overrides, route/trip caches, ferry hours, mode, done,
  GPS fix). On `QuotaExceededError` it evicts the oldest half of each route/
  trip cache (object key order = insertion order = LRU) and retries once; if
  the write still fails it `console.warn`s and skips persisting — caching
  failure can never break functionality again. Returns `boolean` so callers
  can report honestly.
- **Slim caches.** Geometry no longer goes to localStorage at full
  resolution — the service worker (workbox `NetworkFirst` on
  `router.project-osrm.org`) already keeps raw OSRM responses for offline.
  `persistCache()` writes a slimmed snapshot: Douglas–Peucker-simplified
  polyline (50 m tolerance, coords rounded to 5 decimals ≈ 1 m), per-entry
  cap 30 K chars (tolerance auto-coarsens until it fits), per-cache caps of
  **100 entries / ~1 MB**, oldest-first eviction. The in-memory cache keeps
  the full-resolution geometry for the current session; `simplifyLine()` is
  exported from `src/store.ts`. Legacy fat caches self-heal: the next save
  re-persists them slimmed (verified: 60 entries / 4.5 MB → 640 KB).
- **`buildRoute()`** wrapped in try/catch/finally: any unexpected throw
  surfaces as an `rbError` instead of a stuck "Solving…", and the built route
  always renders from memory even when nothing can be persisted.
- **Prep offline** now reports per-day honestly: saved / built-but-NOT-saved
  (storage full — still served by the SW's OSRM cache this session) / fetch
  failed, instead of counting a fetch as "offline-ready" when the write was
  lost.

**Verified** end-to-end with headless Chrome + CDP (`vite preview` + a node
`ws` driver; OSRM stubbed deterministically with a 22 k-point geometry):

- *Repro on the old build:* storage pre-filled to ~5.1 M chars → Build route
  → uncaught `QuotaExceededError`, 0 stops rendered, button stuck "Solving…".
- *Fixed build, same prefill:* 3 stops render, no uncaught errors, slimmed
  trip entry (399 chars) even persists in the leftover space.
- *Legacy fat cache (60 × ~75 KB entries):* route renders, cache re-persisted
  at 640 K chars / 61 entries, new key present.
- *Zero free space:* route still renders; one `console.warn` ("quota exceeded
  — … kept in memory"), nothing uncaught.
- *Prep offline under near-full storage:* completes, alert reports
  "1 day route(s) saved (1 newly built)" and the entry verifiably persisted.

`npm run build` green. `src/data/` untouched.

## Simplification + deploy pass (2026-06-11)

Goal: make the app SIMPLER, mobile-first (phone, one-handed, on the road),
decluttered, and deployed free to GitHub Pages. `src/data/*.json` untouched;
`npm run build` green after every change; verified in headless Chrome (CDP) at
both 1440×900 (desktop) and 390×844 (phone) against the production build served
under the deploy base path (`vite preview`).

### Bug fix — double-open (PRIORITY 1)
- **Root cause:** a CircleMarker carried both a `click → selectPlace` handler
  (opens the right-side detail panel) AND a Leaflet `<Popup>`, which Leaflet
  auto-opens on the same click. One pin tap surfaced TWO panels with duplicate
  status buttons.
- **Fix:** removed the `<Popup>` from the marker entirely (and the `Popup`
  import). A pin click now opens ONLY the detail panel, in **both** planning and
  trip modes. Nothing useful was lost — the popup's links/Navigate/status all
  already live in the detail panel.
- **Verified:** clicking a pin yields `.leaflet-popup` count **0** and the
  detail panel open — on desktop planning, phone trip (numbered pin), and phone
  planning. (CDP assertions `*_after_click_popups: 0`, `*_after_click_detail: true`.)

### Removed (PRIORITY 2 — declutter)
- **Export JSON** — deleted the button and the `exportJson()` function. (User:
  no use for a JSON dump on a phone trip.)
- **Leaflet map popup** — deleted along with its orphaned CSS (`.popup*`,
  `.popup-details`, `.popup-links`) and the now-unused `deriveLinks`/`navUrl`
  imports in `App.tsx`. (The detail panel is the single place surface.)
- **Netlify `deploy` script** in `package.json` — replaced by the GitHub Pages
  Action (below), so the dead `netlify deploy` script was removed.

### Simplified (progressive disclosure)
- **Planning filters collapsed behind one toggle.** The always-visible row is
  now just **search + the 4 one-tap presets** (🛏 Sleep spots / ⭐ Shortlist /
  🥾 Do & see / ↺ All). The full filter wall (country chips, status chips,
  category chips, tag list) moved inside a single `<details className="filters-disclosure">`
  ("More filters · N active", where N counts the active advanced facets). Most
  trips never need to open it; the power is one tap away when they do.
- **Fit map** demoted from a top-level button into the "Offline & phone export…"
  details (it's a planning/dev convenience, not a per-tap action).
- Powerful tools kept and still discoverable: route builder, itinerary, sleep
  finder (nearby + corridor), offline prep, KML/GPX export, booking links.

### Mobile fixes (PRIORITY 3)
- **Detail panel is now a bottom sheet on phones in BOTH modes** (was a side
  overlay covering the map/pin in planning; only trip mode had the sheet). At
  ≤760px it anchors to the viewport bottom (`bottom:0`, rounded top corners,
  grab-handle affordance), so the tapped pin and the route stay visible above
  it. Trip mode keeps a shorter 45vh sheet to show more of today's route.
- **Bigger one-handed touch targets at ≤760px** (both modes): search input
  padded + 16px font (kills iOS focus-zoom), chips/list rows/view-tabs/mode-pill
  enlarged, the place-list booking badge bumped to 28px.
- Trip mode is already the natural phone default — it auto-selects when the real
  date is inside the trip window (Jun 16–28), opens on the Today view with the
  sidebar open, big Sleep tonight / Near me buttons, and the locate FAB.
- **Verified on phone (390×844):** Today view renders, sidebar toggles
  open/closed, locate FAB + Sleep-tonight present, and the detail panel computes
  to `bottom:0` (true bottom sheet) in trip AND planning.

### Deploy config (PRIORITY 4 — GitHub Pages, free)
- **`vite.config.ts`:** `base: '/balkans-trip/'`. VitePWA given `scope`/`base`
  `/balkans-trip/`, manifest `id: '/balkans-trip/'`, `scope: '/balkans-trip/'`,
  `start_url: '.'` (resolves to the subpath), and workbox
  `navigateFallback: '/balkans-trip/index.html'`. OSM tile + OSRM URLs are
  absolute `https://`, so they're unaffected by the base.
- **Verified the production build resolves entirely under the subpath:**
  `dist/index.html` assets → `/balkans-trip/assets/…`; manifest `scope`/`id`
  `/balkans-trip/`; `registerSW.js` registers `/balkans-trip/sw.js` with scope
  `/balkans-trip/`; precache + navigateFallback under the subpath. `vite preview`
  serves at `http://localhost:4173/balkans-trip/` and the whole CDP suite passes
  there (no console errors).
- **`.github/workflows/deploy.yml`:** on push to `main` (and manual dispatch),
  Node 20 + `npm ci` + `npm run build`, then `actions/configure-pages@v5`,
  `actions/upload-pages-artifact@v3` (path `dist`), `actions/deploy-pages@v4`.
  Permissions `pages: write` + `id-token: write`, `contents: read`; `concurrency`
  group `pages`. No hardcoded CNAME. **Not pushed** — the master session creates
  the repo and pushes; once Pages is enabled (Settings → Pages → Source: GitHub
  Actions), every push deploys to `https://ruslankotliar.github.io/balkans-trip/`.

`src/data/` and the `Place` schema untouched. `npm run build` green.

## Add-place + Share + Essentials (2026-06-11)

Three MUST features from `feature-ideas.md` (Part A, B1, B5). `src/data/*.json`
untouched (feature content the app generates lives in the NEW `src/essentials.ts`).
`npm run build` green after each feature; verified in headless Chrome (CDP) at
**desktop 1440×900 AND phone 390×844**, against the **production build served
under the deploy base path** (`vite preview` at
`http://localhost:4173/balkans-trip/`). The GitHub Pages base path + PWA keep
working: prod `index.html` assets resolve under `/balkans-trip/`, manifest
`scope` `/balkans-trip/`, and the SW precaches 9 entries (the bundled
`essentials.ts` content rides in the JS bundle → precached → fully offline).

### Feature A — Add a place (tap-map default + paste coords + paste GMaps URL)
- **Data model:** added optional `userAdded?: boolean` + `source?: 'user'` to the
  `Place` type (`src/types.ts`). New localStorage key `balkans-trip-user-places`
  with `loadUserPlaces`/`saveUserPlaces` in `store.ts` (mirrors the existing
  `safeSetItem` + try/catch pattern; `isUserPlace` narrows bad imports).
- **Merge for free:** `App.tsx` holds `userPlaces` in state and
  `basePlaces = [...loadPlaces(), ...userPlaces]` (user places AFTER baked, so the
  existing "first id wins" de-dupe protects against collisions). They appear on
  the map, in filters, the route builder, the day planner, the finders, and the
  KML/GPX exports with **zero** downstream changes. Ids are `user-<timestamp>`;
  new places default `status:'shortlist'`, `country` inferred by a cheap
  bounding-box check (HR/BA/ME).
- **Three inputs** (`src/components/AddPlace.tsx`), tap-map as the primary/default:
  1. **Tap the map** — a `MapTapCapture` (`useMapEvents`) drops a draggable pin;
     a "use my location" shortcut fills lat/lng from the GPS fix. Works offline.
  2. **Paste `lat, lng`** — `parseLatLng` tolerates `,` / `, ` / ` ` separators,
     validates ranges, warns (not blocks) outside the trip bounding box.
  3. **Paste an expanded Google Maps URL** — `parseMapsUrl` regexes `!3d!4d`
     (preferred) then `@lat,lng`, and lifts the name from `/place/<Name>/`. For
     `goo.gl` / `maps.app.goo.gl` **short links** it detects them
     (`isShortMapsLink`) and shows the friendly "open it first to expand, then
     paste the long link" message — **no backend / proxy**.
- **Form:** name (required), category chips (the Category union), optional
  assign-to-day, optional note. Status/day/note flow through the **existing
  overrides layer** (one code path); only the immutable identity lives in
  `userPlaces`.
- **Edit / delete:** the DetailPanel shows "✎ Edit / move / delete" only when
  `place.userAdded`. Editing re-drops the pin (map tap moves it live), renames,
  recategorises; Delete (confirm) removes from `userPlaces` AND cleans its
  override + done keys.
- **Entry points:** "＋ Add place" in the Today action row (trip mode) and above
  the place list (planning mode).
- **Survives a redeploy:** `userPlaces` is its own localStorage key — a redeploy
  (which can change `src/data/*.json`) never touches it.
- **Verified (CDP, desktop + phone):** tap-the-map is the default mode and
  captured coords on a synthetic map click; coords-paste parsed `43.155, 19.106`
  and saved; URL parse preferred `!3d!4d` (`43.14220, 19.09510`) and prefilled
  "Black Lake"; short link `maps.app.goo.gl/...` showed the expand instruction;
  the user place appeared in the planning list; Edit→rename persisted;
  Delete→0 places; persists across a full reload.

### Feature B1 — Share plan (replaces the removed Export JSON)
- Added the **`lz-string`** dependency (ships its own types).
- `encodePlan`/`decodePlan` in `store.ts` serialize `{overrides, userPlaces}`,
  compress with `LZString.compressToEncodedURIComponent`, and put the payload in
  the **URL hash** (`#plan=…`). 100% static — no server.
- **"🔗 Share plan (copy link)"** button (`src/components/SharePlan.tsx`,
  `ShareButton`) sits where Export JSON used to be (the planning sidebar action
  row) — copies to clipboard and shows the link in a selectable textarea.
- **On load**, an effect decodes a `#plan=` hash (robust try/catch — a malformed
  payload shows a friendly alert, never crashes), then **always clears the hash**
  (`history.replaceState`) so a refresh doesn't re-prompt. A modal (`ImportPrompt`)
  offers **Merge / Replace / Cancel**: Merge applies incoming overrides/userPlaces
  on top of mine (last-writer-per-place; the importer chooses for the whole
  import); Replace swaps wholesale.
- **Verified (CDP, desktop + phone):** the Share button produced a `#plan=…` link
  (~313 chars for a 1-place plan); navigating to it showed the import modal;
  **Replace** populated localStorage and cleared the hash; **Merge** kept the
  local "Plan-B pin" and added the incoming "Plan-A pin" (both present);
  `#plan=THIS_IS_NOT_VALID@@@` produced no modal and no crash (graceful alert).

### Feature B5 — Offline Essentials
- New **`src/essentials.ts`** (authored from `contingency.md` + `trip-ops.md`,
  reading—not writing—`contingency-places.json` for the hospital pin ids): a
  universal **112** card + per-country police/ambulance/fire/roadside/
  mountain-rescue numbers (HR/BA/ME), fill-in prompts for the rental + insurer
  lines, an "if X happens → do Y → call Z" list (breakdown / accident / police /
  medical / lost in mountains / lost passport / towed), condensed border/car/
  police/fuel/theft tips, a per-overnight-zone **nearest hospital + pharmacy**
  table (each linked by `pinId` to a `contingency-places.json` pin), a packing
  checklist, and a **survival-phrases** set for Croatian / Bosnian-Serbian /
  Montenegrin (hello/thanks/please/yes-no/help/hospital/police/water/how-much/
  where-is/numbers 1–10/"table for 4"/"fill up the tank", with pronunciation and
  the HR vs BA/ME variants noted).
- **`src/components/Essentials.tsx`:** a static accordion (Emergency open by
  default), big touch targets, `tel:` links so a tap dials, and "map ↗" buttons
  that fly the map to a hospital pin (`focusPin` in App). Because the content is
  bundled JS, the PWA precaches it → works **fully offline**.
- **Entry points:** "🆘 Essentials" in the Today action row (trip mode) and the
  planning action row.
- **Verified (CDP, desktop + phone):** the panel opened, rendered the big 112
  link, 37 phrase rows, and "Upomoć"; on phone it computes to `bottom: 0` and
  full width (390px) — a true bottom sheet. Zero console errors throughout.

`src/data/` and the baked schema untouched (only the optional `userAdded`/
`source` fields were ADDED to the `Place` type). `npm run build` green; PWA emits
`sw.js` + `manifest.webmanifest` with 9 precache entries under `/balkans-trip/`.

## Mobile detail-sheet fix (2026-06-11)

**Bug (user-reported, the trip's primary device is a phone):** on a phone, in
PLANNING mode, tapping a place in the list opened the detail bottom-sheet
*behind/under* the full-screen list sidebar — only a thin sliver with the ✕ on
the right edge was visible, and the sheet was unusable.

**What was covering what (root cause — pure z-index stacking):** at ≤760px the
sidebar becomes a full-height drawer with `z-index: 1050`, and it is *open*
whenever you can tap a list row (always open in trip mode; open to show the
list in planning). The detail panel's mobile bottom-sheet rule had **no**
`z-index`, so it inherited the base `.detail-panel { z-index: 1000 }` — **below
1050**. So the open sidebar painted on top of the sheet. (AddPlace `1200` and
Essentials `1300` were already above 1050, so those were fine; the route
builder / corridor / sleep finders live *inside* the sidebar, never behind it.)

**Fix (two complementary changes, `src/App.tsx` + `src/styles.css`):**

1. **Auto-collapse the list on select (the focused-surface interaction).**
   `selectPlace()` now, on a phone (`window.matchMedia('(max-width:760px)')`),
   slides the sidebar closed so the detail sheet clearly *owns* the screen, and
   remembers it was open (`reopenSidebarOnClose` ref). The new `closeDetail()`
   (wired to the sheet's ✕) reopens the list, so ✕ returns you exactly where you
   were — in BOTH planning and trip modes. Manually toggling the ☰ fab cancels
   the pending auto-restore (no surprise double-toggle). Desktop is untouched
   (the media query gates everything; the side panel still shows alongside).
2. **Belt-and-braces z-index.** The mobile `.detail-panel` rule now sets
   `z-index: 1150` (above the sidebar 1050 *and* the ☰/locate FABs 1100), so even
   if the sidebar is open the sheet and its ✕ are never trapped behind the list.

**Headless-Chrome verification (CDP, 390×844, `vite preview` under
`/balkans-trip/`):** drove planning + trip with a `ws` CDP driver
(`Emulation.setDeviceMetricsOverride` mobile 390×844), tapped a list item / map
pin, and hit-tested the sheet.

- *Before (the inherited rule):* mobile `.detail-panel` computes `z-index:1000`
  vs `.sidebar` `1050` while open → the sheet is painted under the list (the
  reported sliver).
- *After — planning:* tap list row → detail sheet `z-index:1150`,
  `bottom:0px`, `display:block`, `visibility:visible`, full-width
  (rect 0→390 × 380→844); sidebar auto-collapsed
  (`open:false`, `transform:translateX(-343px)`); `elementFromPoint` at the ✕
  center returns the `detail-close` button and the sheet body
  (`closeIsTop:true`, `bodyIsDetail:true`) — **visible and on top, not
  covered**. ✕ → detail gone, **sidebar reopened (list restored)**.
- *After — trip:* identical — sheet `z-index:1150`, `bottom:0`, sidebar
  collapsed off-screen, ✕ topmost, close returns to the Today view.
- *Other surfaces:* Essentials (`z:1300`) and AddPlace (`z:1200`) both compute
  `bottom:0` and are the topmost element at their center (above sidebar 1050) —
  no covering bug.
- **Zero JS console errors and zero network failures on a clean load** (the lone
  transient `404` seen mid-session was a `/favicon.ico` probe, not an app
  asset). The double-open fix is intact (markers still have no Leaflet popup —
  one tap = detail panel only).

`src/data/*.json` untouched; `npm run build` + `tsc --noEmit` green; GitHub Pages
base path (`/balkans-trip/`) unchanged.

## Review mode (2026-06-11)

Card-by-card triage for quickly triaging 415 places before the trip. `src/data/*.json`
untouched; `npm run build` green.

### 11. Review mode — full-screen card-by-card triage

**Why:** 415 places in the list is hard to audit quickly. The Review mode surfaces
one place at a time and lets 4 people batch-decide in minutes.

**Entry point:** a "📋 Review" button added to the view-tabs row (planning sidebar,
orange accent to distinguish it from the three main tabs). Clicking it opens a
full-screen overlay (`z-index: 2500`).

**Filter row (top of overlay):**
- Country: All / 🇭🇷 Croatia / 🇧🇦 Bosnia / 🇲🇪 Montenegro
- Status queue: Candidates / Backup / All non-rejected
Changing either filter resets the card index to 0.

**Card layout (centered panel, max 560px, full-width on phone):**
- Country flag emoji + place name + category badge (colored dot)
- Star rating (★★★☆☆)
- Cost + timeNeeded if present
- Description
- communityNotes as a styled blockquote
- 3 big action buttons: ✓ Shortlist (green) / Skip (grey) / ✗ Reject (red)

**Navigation:**
- "← Back" button appears after the first card to revisit the previous one
- Progress counter "N / M candidates"
- Shortlist and Reject use `setStatus` (existing function) — status changes persist
  to localStorage immediately via the existing overrides layer
- Skip just advances the index without changing status
- When the queue is exhausted, a "done" message is shown

**Implementation:**
- New `src/components/Review.tsx` (self-contained, no new state outside the component)
- `'review'` added to the `View` type in `App.tsx`
- Review overlay rendered as a sibling of the sidebar + map (not inside either) so
  it can cover the full viewport
- `onExit` returns to the `'places'` view
- CSS: `.review-overlay`, `.review-card`, `.review-actions`, `.review-btn` etc.
  appended to `src/styles.css`; phone breakpoint enlarges tap targets (min-height 58px)

**Files changed:** `src/App.tsx` (import, View type, tab button, overlay render),
`src/components/Review.tsx` (new), `src/styles.css` (new section appended).

## Mobile UX improvements (2026-06-11)

Three targeted fixes for the phone-on-the-road scenario. `src/data/*.json` untouched;
`npm run build` green.

### 1. Detail panel: description + Navigate first, votes visible, comments collapsible

**Problem:** On a 45vh bottom sheet (trip mode) or 55vh sheet (planning) the most
useful content — description, community notes, Navigate button — was buried below
the comment input textarea. Opening the panel on a hike required scrolling past a
60px textarea before seeing what the place actually is.

**Changes (`src/components/DetailPanel.tsx`, `src/styles.css`):**
- Moved description + communityNotes + bestTime/facilities/tags to the **top**, right
  after the title and meta line — the first thing you read when you open a place.
- Added a **"🗺 Navigate" button** as a persistent row immediately below the meta, paired
  with the booking button when present. Both sit side-by-side in `.detail-top-actions`.
  One tap to maps, always visible above the fold — critical when you're in a car.
- The old standalone booking button and the duplicate Navigate link in the footer are
  now replaced by this inline row (the footer still has a secondary nav link for
  discoverability).
- Day assignment label now shows the colored Day-N pill inline when a day is set,
  eliminating the redundant separate pill that appeared below the dropdown.

**Mobile sheet content above the fold (45vh ≈ 300px on a 667px phone):**
  title (30px) + meta (20px) + top-actions row (44px) + description (≈60px) = ~154px,
  leaving room for communityNotes before the votes come into view on first scroll.
  On the old layout: title + meta + booking button + vote buttons + voter names +
  comment textarea = ~260px before description ever appeared.

### 2. CollabBlock: vote buttons always visible, comment thread collapsed

**Problem:** The comment textarea (60px) + "Post" button was always open, pushing
the vote buttons and voter names higher but also consuming precious sheet height even
when there are no comments. Users had to scroll past a large empty textarea to reach
other controls.

**Changes (`src/components/CollabBlock.tsx`, `src/styles.css`):**
- Added `commentsOpen` state (default `false`). The comment thread + textarea is now
  hidden behind a **"💬 N comments ▼ / 💬 Add a comment ▼"** toggle button.
- Vote buttons (👍/👎) and voter names remain always visible — the collaborative
  decision-making signal is front-and-center.
- When opened, the comment thread appears immediately below the toggle with a subtle
  border treatment that makes the relationship clear (`.collab-comments-toggle.open`
  removes bottom border-radius and color connects to the thread below).
- The toggle text is informative: shows "N comments" when there are existing ones, or
  "Add a comment" when empty — so you know what's there without opening it.

### 3. Place list: suppress redundant status badge when single-status filter is active

**Problem:** When using the "⭐ Shortlist" or "🛏 Sleep spots" preset (which set
`statusFilter` to a single value), every row showed the same colored badge — e.g.
62 green "shortlist" badges on 62 rows. This is visual noise that crowds the row and
makes the day-tag, vote tally, and booking badge harder to read.

**Change (`src/App.tsx`):**
- Computed `showBadge = statusFilter.size !== 1`. When the filter is narrowed to
  exactly one status (as both the ⭐ Shortlist preset and the manual single-status
  toggle do), the badge is hidden — the filter header communicates the status
  already. When multiple statuses are visible (the default shortlist+backup view,
  or the ↺ All view), the badge remains so you can distinguish them at a glance.
