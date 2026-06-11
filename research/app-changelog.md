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
