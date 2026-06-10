# UX Simplicity Audit — operating the app on the road

**Audience:** session G (app dev). This is a spec, not a code change — I edited nothing but this file.
**Method:** ran the live app (localhost:5173), screenshotted at 390×844 (phone) and 1440×900 (desktop), read every component and the full state model in `App.tsx`, and walked the 5 core journeys against the code.

## The one-sentence verdict

The app is an excellent **planning** tool and a poor **trip** tool. Everything on screen — 12 category filters, 4 status chips, "candidate/shortlist", a route-builder, Export JSON — serves the person building the plan at a desk. None of it serves four tired people in a moving car asking "where do we sleep tonight and what's the next turn." The single highest-value change is to split the app into **Planning mode** and **Trip mode**, and make Trip mode a today-centric, GPS-aware, near-zero-filter screen.

## What I measured (grounds the claims below)

- **168 places**, of which **149 are `candidate`**, 18 `shortlist`, 1 `backup`. The default status filter shows candidates → the map and list are dominated by 149 un-triaged pins.
- **0 places carry a `day` in the seed data.** The Itinerary view is therefore **empty on first load**; every day in the trip must be populated by hand (Route Builder → "Apply to days", or per-place dropdowns) before "what's today" can answer anything.
- **No geolocation anywhere** in `src/` (grepped). No "you are here", no recenter-on-me, no distance-from-me. The "nearby" finder is anchored to a *selected place*, not the user.
- **No "today" concept.** `trip.ts` knows `TRIP_START` and can label day N, but nothing maps the real date → "today is Day 4", and nothing focuses the UI on it.
- **Mobile default load** (see `/tmp/ux-phone.png`): full-screen map, sidebar hidden off-canvas, ~168 pins overlapping along a thin coastal strip at zoom 7. Zero of the 5 core journeys are answerable without first tapping ☰ and doing setup.

## The 5 journeys, walked as a user on a phone

| Journey | Current taps / reality | Verdict |
|---|---|---|
| 1. Where do we sleep tonight? | ☰ → Places → no "sleep" entry point; either hunt the right pin among 168 → popup → "Details →" → scroll → "Find sleep nearby" → toggle → slider; **or** Itinerary → today's 🛏 (needs days assigned first). | **Broken / 6+ taps**, needs prior planning |
| 2. What's next today + how far? | ☰ → Itinerary → scroll to find today (not highlighted) → read day total. Per-leg "next stop is X, 45 min" is only in Route Builder, not the daily view. | **Buried, no "today" focus** |
| 3. Tired — drop a stop, rebuild road | ☰ → Itinerary → tiny ✕ (22px) on the stop. This *does* re-route the day automatically (good!) but the target is tiny, no undo, and it's three screens deep. | **Works but fiddly** |
| 4. Promote to shortlist | Tap pin → popup → 4 tiny status buttons (~11px text). Works. But "shortlist vs candidate" is planning vocabulary nobody on the road cares about. | **OK, wrong context** |
| 5. What's worth seeing near me? | **Unsupported.** "Nearby" is sleep-only and anchored to a selected place, not GPS. You eyeball 168 pins. | **Missing** |

---

# Top 10 simplifications (prioritized for the tired-phone operator)

### 1. Split into Planning mode ⇄ Trip mode; default Trip mode to a "Today" screen — **L** (stage it)
**Problem:** Every control is planning machinery. On the road you don't filter by category or set statuses — you ask today/next/sleep/near-me. Forcing trip users through the planning UI is the root cause of journeys 1, 2, 5 failing.
**Proposal:** One persisted toggle (localStorage), surfaced as a prominent pill in the header. **Trip mode** hides filters, status chips, country chips, tags, Route Builder, and Export, and opens on a **Today** view (see #3–#5 for its contents). **Planning mode** is today's app, unchanged. Auto-suggest Trip mode when the real date is within the trip window (Jun 16–28). This is the spine — items 2–10 are its ribs and can land incrementally behind it.
**Build order:** ship the toggle + conditional hiding first (instant decluttering), then fill the Today view.

### 2. Add GPS "locate me" + you-are-here + recenter-on-me — **M**
**Problem:** The app has no idea where the user physically is. "Near me", "how far is the next stop", and "recenter" are all impossible. This is the biggest single capability gap for on-road use.
**Proposal:** A big round FAB on the map (bottom-right, ≥48px) using `navigator.geolocation.watchPosition`. Drop a distinct "you are here" marker, and on tap recenter/zoom to it. Cache last fix so a cold start with patchy data still shows an approximate dot. Feed this position into #4 (sleep near me) and #10 (sights near me) and into the ETA in #5. Degrade gracefully when permission is denied (fall back to "near today's last stop").

### 3. "Today" view: map + list focused on today's day, auto-selected by real date — **M**
**Problem:** Itinerary shows all 13 days flat, empty by default, today not highlighted; the map shows all 168 pins. Tired users can't find "today."
**Proposal:** Add `currentTripDay()` to `trip.ts` (real date → clamped 1–13). Trip mode opens on that day: map shows **only today's stops** (+ optionally tomorrow's, dimmed) with big numbered pins and the day's route line; everything else hidden. A compact day-strip (◀ Day 4 · Thu Jun 19 ▶) lets you peek other days. This alone fixes the "168 overlapping pins" clutter (`/tmp/ux-phone.png`) because trip mode stops drawing the candidate haystack.

### 4. One-tap "Sleep tonight" — **M**
**Problem:** Journey 1 is 6+ taps and has no obvious entry point. Yet it's the most-asked question on a road trip.
**Proposal:** A persistent button in the Today view: **🛏 Sleep tonight**. It runs the existing corridor/nearby logic automatically against *today's last stop* (or GPS position from #2) and lists the 13 sleep places by distance, each card already showing 💶 cost and 🚿 facilities (CorridorPanel already renders these well — reuse it). Zero filter touches, 1 tap. Add an "open in Google Maps" deep-link per card for navigation handoff.

### 5. Surface "next stop + drive time/ETA" in the Today view — **S/M**
**Problem:** Per-leg drive times exist only in Route Builder. The daily view shows a day *total*, not "next: Kotor, 45 min." A driver wants the next leg, not a sum.
**Proposal:** At the top of Today, a big line: **Next → {stop} · {drive time}** (from GPS if available via #2, else from the previous stop). Use the existing `routes`/`legs` data and `formatDuration`. Make the current/next stop visually dominant in the day list; gray out completed stops.

### 6. Bigger touch targets in everything used on the road — **S**
**Problem:** Status buttons are ~11px text; itinerary ↑/↓/✕ are 22px; filter chips have 3px padding. All are mis-taps waiting to happen one-handed in a moving car.
**Proposal:** In Trip mode (and ideally everywhere), bump interactive targets to ≥44px height, status/action buttons to full-width or large pills, and the day-strip arrows to thumb-sized. This is mostly CSS behind a `body.trip-mode` class.

### 7. Drop-a-stop: make it big and undoable, surface it in Today — **S/M**
**Problem:** CLAUDE.md calls this a first-class journey ("we're tired → drop a stop → rebuild the road"). It works (the ✕ re-routes the day), but it's a 22px target three screens deep with no undo — risky when one bad tap deletes a stop.
**Proposal:** In the Today view, give each stop a clear **Skip** action (swipe or a large button), auto re-route (already happens), and show a 5-second **Undo** toast. Keep the destructive bit reversible — these are tired users.

### 8. Hide the planning vocabulary in Trip mode; smarter Planning defaults — **S**
**Problem:** `candidate/shortlist/backup/rejected`, 12 category filters, 3 country chips and tags are meaningless on the road and dominate the sidebar. Even in Planning, the default status filter includes all 149 candidates, burying the 18 shortlisted picks.
**Proposal:** Trip mode: hide status/category/country/tag filters entirely (show only shortlisted + today's places). Planning mode: default the status filter to **shortlist + backup only**, with a one-tap "show 149 candidates" reveal — so the plan you actually care about isn't drowned by research noise.

### 9. Collapse the popup → "Details →" two-step; bottom-sheet that doesn't bury the map — **S**
**Problem:** Tapping a pin opens a Leaflet popup with redundant status buttons, then "Details →" opens a second panel (60vh overlay on mobile that covers the map and the pin). Two steps, duplicated controls.
**Proposal:** In Trip mode, tap a pin → open the detail sheet directly (skip the popup). Make it a proper bottom sheet (~45vh, draggable to dismiss) so the pin and route stay visible above it. Drop the status buttons from the in-trip detail view (planning-only).

### 10. "Near me" for sights, not just sleep; consolidate the mode zoo — **S/M**
**Problem:** Journey 5 is unsupported — the only proximity tool is sleep-only and place-anchored. Separately, the app exposes 5 overlapping concepts (Places / Itinerary / Route Builder / Corridor / Nearby) plus Fit-map and Export — far too many for a tired user.
**Proposal:** Add a **Near me** button in Today that reuses the nearby logic against the GPS point (#2) but across *sightseeing* categories (sight/viewpoint/beach/hike/activity/nature), sorted by distance. And in Trip mode collapse the surface to two things: **Today** and **Map** — Route Builder and Export JSON are planning-only and should not appear on the road.

---

## What to DELETE or HIDE on the road (not add)

- **Export JSON, Fit map** — planning/dev controls. Hide in Trip mode.
- **Route Builder tab** — a multi-step desktop tool (tick stops → pick endpoints → solve → apply). Do this once during planning; hide it on the road.
- **Status chips + category/country/tag filters** — research triage vocabulary. Hide in Trip mode.
- **The 149 candidate pins** — the haystack. Trip mode shows only shortlisted + today's stops; Planning mode hides candidates by default.
- **Redundant status buttons in the map popup** — duplicated in the detail view; collapse the two-step (#9).

## Does the popup/panel/sidebar hierarchy survive 390px? Mostly no.

- **Sidebar** off-canvas + FAB is the right pattern, but it's 88% width and stuffed with the full filter wall — overwhelming. Trip mode should make the sidebar a short Today list, not a filter console.
- **Detail panel** at `left:12 right:12, max-height 60vh` covers the lower half of the map *and the pin you tapped* — you lose spatial context. Convert to a draggable bottom sheet (#9).
- **Leaflet popup** (260px) on a 390px screen + then a second panel = two overlapping surfaces for one place. Collapse to one.
- **168 pins at zoom 7** on a 390px-wide coastal strip are physically un-tappable (heavy overlap). Trip mode's today-only filter is the fix; if Planning mode needs relief too, marker clustering is the heavier (**L**) option.

## Sensible-defaults checklist (so core journeys need 0 filter touches)

- Open in **Trip mode** automatically when the date is in-window.
- Open on **Today**, map focused on today's stops.
- **Sleep tonight** and **Near me** are one tap, pre-wired to GPS / today's last stop — no category filtering required.
- **Next stop + ETA** visible without scrolling.
- Planning mode defaults to **shortlist+backup**, candidates one tap away.

## Suggested build order for session G

1. Trip/Planning toggle + hide planning machinery in Trip mode (#1, #8) — instant decluttering, low risk.
2. `currentTripDay()` + Today view skeleton focused on today's stops (#3).
3. GPS locate-me FAB + you-are-here + recenter (#2).
4. Wire Today view content: next-stop/ETA (#5), Sleep tonight (#4), Near me (#10).
5. Polish: big touch targets (#6), drop-with-undo (#7), bottom-sheet detail (#9).

Items 1–2 deliver ~70% of the on-road value and are mostly conditional rendering + one date helper.
