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
