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
