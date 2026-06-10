# Prompts for parallel sessions

Open a new Claude Code session **in this project directory** for each prompt below and paste the prompt as-is.

## Fleet protocol (so nobody gets lost)

1. **Name each chat with its letter** when you start it: "A — Zadar", "G — App dev", "M — Hikes"… The letter is the key; the master session refers to sessions by letter. (Rename via the chat's title/tab.)
2. **Completion is auto-detected** — you do NOT report it. Newer prompts end with a final act (`echo done > .fleet/done/<LETTER>`); for sessions already running, the master session's background watcher detects their deliverable files becoming stable. Either way, intake runs automatically in the master session.
3. **If a session stalls or dies:** open a fresh chat, paste the same prompt again. Prompts are idempotent — each owns its files and overwrites only them.
4. One chat = one letter. Don't paste two prompts into the same chat (file ownership breaks).
5. `.fleet/` is master-session bookkeeping — no session should touch it except the final `done` marker.

**File ownership (why parallel is safe):** sessions A–F and J each write ONLY their own `src/data/<file>.json` + `research/<file>.md`; session G edits ONLY app code (`src/*.ts*`, `src/styles.css`, never `src/data/`); sessions H, I, K, L write ONLY their own `research/<file>.md` (H and I produce specs that G implements later — they must not touch code). Nobody else touches those files. All 12 can run simultaneously.

Suggested order if you don't run all at once: A, D, G first; then B, C, E, F; then H–L anytime.

---

## Session A — Croatia: Zadar region & national parks

```
Read CLAUDE.md first and follow the data conventions and research rules exactly.

You are researching the ZADAR REGION + NORTHERN DALMATIA leg. TIMING IS TIGHT: we land Jun 16 morning and must be in Dubrovnik by Jun 18 evening (airport pickup), so this leg is realistically Jun 16 + part of Jun 17 (see research/route-skeleton.md). Scope: Zadar city, Nin, Paklenica NP / Velebit, Plitvice Lakes (honest verdict: per research/drive-times.md the detour costs +4:21 driving vs going straight to Krka — is it worth it inside this window?), Krka NP, Šibenik area, and beaches/swim spots/sunset spots around Zadar. The user's route sketch has a MOUNTAINS LOOP north of Zadar before heading south — so also cover the Velebit options properly: Paklenica hikes (only 0:54 from Zadar), Zrmanja canyon (kayaking, Tulove Grede, viewpoints), Knin fortress, and the inland-vs-coast routing question to Split (inland via Knin +1:28 vs coastal via Krka). Dugi Otok/Kornati: assess honestly whether a ferry day can fit at all — if not, say so and keep it as a clearly-labeled backup.

Find 15–25 places: sights, hikes, beaches, activities, viewpoints, AND campsites (campsites are first-class targets — check park4night-style reviews for prices, showers, sea/mountain views). Also find 2–4 nightlife/food options in Zadar worth it per locals.

Research via Reddit, TripAdvisor forums, hiking forums and personal trip reports — NOT travel guides or listicles. Capture real quotes in communityNotes and links in sources. Verify all coordinates.

Write:
1. src/data/hr-north.json (JSON array of Place objects; ids prefixed hr-; status "candidate"; do not reuse ids already in src/data/*.json)
2. research/hr-north-notes.md — route logic, ferry details (Zadar→Dugi Otok car ferry price/schedule), Plitvice-vs-Krka recommendation, campsite comparison table, anything that doesn't fit the schema.

Validate the JSON with python3 -m json.tool before finishing, then run npm run build to confirm the app still compiles.
```

---

## Session B — Croatia: Split, Makarska Riviera & islands

```
Read CLAUDE.md first and follow the data conventions and research rules exactly.

You are researching the CENTRAL/SOUTH DALMATIA drive corridor + DUBROVNIK-AREA ISLANDS. Context (see research/route-skeleton.md): we drive Zadar→Dubrovnik over Jun 17–18 with an evening airport pickup on Jun 18, then loop back to Dubrovnik at the trip end — so Hvar/Brač/Vis with a car almost certainly DON'T fit (state this verdict explicitly with ferry-time evidence, keep best option as backup). Scope: (1) the corridor — Split, Trogir, Omiš (Cetina canyon — zipline/rafting/canyoning, which operator real people recommend, prices), Makarska Riviera (we already shortlisted Punta Rata, Sveti Jure, Camping Krvavica — verify those, find what else is worth a stop, Biokovo toll-road logistics), best Dubrovnik approach on a late afternoon (Neum corridor vs Ploče–Trpanj ferry + Pelješac bridge); (2) the Dubrovnik island play — the user's sketch loops over Pelješac towards KORČULA (Vela Luka), so compare three options with evidence: Mljet NP (car ferry Prapratno↔Sobra — schedule, price for car+4, camp on island vs day trip), Korčula (Orebić↔Dominče ferry; is Vela Luka's west end worth the extra hour or is Korčula town + Pupnatska Luka the play?), or BOTH as a 2-day Pelješac swing (Orebić→Prapratno is only 1:24; also Pelješac itself: Ston walls/oysters, wineries). Plus zero-driving options: Lokrum, Elaphiti. And Dubrovnik itself (walls, Srđ, swim spots, nightlife, how to dodge cruise crowds).

Find 15–25 places incl. campsites with real reviewed prices/facilities, beaches, cliff-jumping spots, nightlife (Split and Hvar party scene — what's actually good per recent Reddit threads, not 2015 reputation).

Research via Reddit, forums, park4night reviews, trip reports — NOT travel guides. Real quotes in communityNotes, links in sources. Verify all coordinates.

Write:
1. src/data/hr-south.json (Place array; ids hr-; status "candidate"; no id collisions with existing src/data/*.json)
2. research/hr-south-notes.md — ferry comparison table (route, duration, car price, book-ahead?), island verdict, Omiš activity operators & prices, campsite comparison.

Validate JSON with python3 -m json.tool, then npm run build.
```

---

## Session C — Bosnia & Herzegovina

```
Read CLAUDE.md first and follow the data conventions and research rules exactly.

You are researching the BOSNIA & HERZEGOVINA leg (likely 2–3 days, ~Jun 21–23, see research/route-skeleton.md). We enter from the Dubrovnik/coast side, go INLAND into the mountains (explicit user wish — not just a coastal hop), and exit EAST into Montenegro at Šćepan Polje. Scope: Mostar (incl. where to actually stay/eat per locals, bridge-jumping watching), Blagaj, Počitelj, Kravica falls, the Neretva valley, Konjic & rafting (Neretva canyon rafting — operators real people recommend, prices), Boračko jezero, SARAJEVO — the user's sketch includes it, and per research/drive-times.md going via Sarajevo adds only ~13min of driving vs the direct Konjic→Tjentište mountain road (verify that road's real condition — if it's awful, Sarajevo wins by default): assess Sarajevo as an overnight (old town/Baščaršija, where to stay/park cheaply, food, nightlife, the 1984 Olympics bobsled track), Lukomir highland village, SUTJESKA NP (it's on our exit route to Šćepan Polje — Maglić views, Tjentište, Perućica, short hikes that fit a transit day), Trebinje (incl. as cheap base near Dubrovnik), and hidden gems Redditors rave about (e.g. Vjetrenica cave; Una NP is probably too far — say so if true).

Find 15–25 places incl. campsites/cheap stays with real reviewed prices (Bosnia is cheap — find the gems), swim spots, viewpoints, food (ćevapi/burek spots locals name).

Also cover practicalities in the notes file: border crossings from Croatia (which crossing, wait times in June), the Neum corridor passport situation, currency (KM vs EUR acceptance), road conditions/drive times between our stops, green card/insurance gotchas people report with rental cars.

Research via Reddit, forums, trip reports — NOT travel guides. Real quotes in communityNotes, links in sources. Verify all coordinates.

Write:
1. src/data/ba-places.json (Place array; ids ba-; status "candidate"; no collisions with existing src/data/*.json — note ba-mostar, ba-blagaj, ba-kravica, ba-pocitelj, ba-trebinje already exist in seed.json, enrich different ids or pick new spots)
2. research/ba-notes.md — route + border logistics, Sarajevo verdict, rafting operators/prices, campsite/stay comparison.

Validate JSON with python3 -m json.tool, then npm run build.
```

---

## Session D — Montenegro

```
Read CLAUDE.md first and follow the data conventions and research rules exactly.

You are researching the MONTENEGRO leg (~3–4 days). A group member already fixed the skeleton route (see CLAUDE.md "Confirmed group wishes" and src/data/me-user-notes.json): Šćepan Polje → Piva canyon → Plužine → Žabljak/Durmitor → Ostrog → Skadar Lake → Budva → Kotor → Dubrovnik. Your job is to ENRICH this route, not replace it:

- Durmitor: verify the Black Lake → Veliki Međed hike (difficulty, time, conditions in late June), find 2–3 alternative hikes (Bobotov Kuk feasibility, Ćurevac viewpoint, Sedlo pass drive), Tara canyon rafting (Đurđevića bridge area + zipline — operators/prices real people recommend), campsites around Žabljak with reviewed prices/facilities.
- Piva canyon: viewpoints/stops worth pulling over for, Piva lake swimming/kayak.
- Ostrog: practical visit info (parking, dress code, time).
- Skadar Lake: kayak rental in Virpazar (operators/prices), the winery option (which one), Rijeka Crnojevića viewpoint, boat trips — what do real people say is the best way to do the lake in half a day.
- Coast: Kotor (fortress climb ladder-of-kotor free route vs paid entrance), Perast + Our Lady of the Rocks, Lovćen mausoleum + serpentine road, Budva/coast nightlife in late June (what's actually good), beaches (Jaz, Mogren, Lučice…), Lustica peninsula / Blue Cave.
- DEEP SOUTH question (user's sketch goes all the way down): Stari Bar ruins, Ulcinj old town, Velika Plaža + Ada Bojana (kitesurfing!). Costs ~+2h driving vs cutting straight to Budva (research/drive-times.md) — honest verdict: does it earn its day?
- Campsites everywhere (Durmitor area especially) + cheap apartments — Montenegro coast in late June: what do 4-person apartments actually cost; is camping or apartment smarter per region.
- Border crossings: Šćepan Polje road conditions (people report it's rough — verify current state 2025/2026), Montenegro→Croatia at Debeli Brijeg in late June (queue horror stories? best time of day).

Find 15–25 NEW places (don't duplicate me-user-notes.json ids; enrich the route around them).

Research via Reddit, forums, park4night, trip reports — NOT travel guides. Real quotes in communityNotes, links in sources. Verify all coordinates.

Write:
1. src/data/me-places.json (Place array; ids me-; status "candidate")
2. research/me-notes.md — hike verdicts, rafting operators/prices, campsite vs apartment per region, border conditions.

Validate JSON with python3 -m json.tool, then npm run build.
```

---

## Session E — Logistics: ferries, borders, camping rules, costs, events

```
Read CLAUDE.md first and follow the data conventions and research rules exactly.

You are the LOGISTICS researcher for this trip. No map pins required unless you find a concrete place (then add it to src/data/logistics-places.json, ids by country prefix, status "candidate"). Your main output is research/logistics-notes.md covering, with sources from forums/Reddit/official operator sites:

1. Car ferries June 2026, PRIORITY ORDER: (a) Prapratno↔Sobra (Mljet) — our main island candidate; (b) Ploče↔Trpanj — possible Dubrovnik approach on Jun 18 vs the Neum corridor (compare total time late-afternoon incl. Pelješac bridge route); (c) Orebić↔Dominče (Korčula) — sketch includes Korčula; (d) Zadar↔Dugi Otok, Split↔Hvar/Brač, Drvenik↔Sućuraj as backups. For each: operator (Jadrolinija etc.), June frequency, price for car + 4 adults, whether booking ahead is needed in late June, boarding chaos reports. Also: timing math for reaching Dubrovnik airport by ~18:00–20:00 on Jun 18 from Makarska.
2. Border crossings & rental car: HR↔BA crossings on our route, BA↔ME via Šćepan Polje (current road state!), ME↔HR Debeli Brijeg queues in June, Neum corridor rules, green card / cross-border docs people get burned by.
3. Camping rules: is wild camping tolerated/banned/fined in HR / BA / ME (real recent reports, fines people actually got), park4night etiquette, June availability — do coastal campsites fill up, can you arrive unannounced.
4. Money: tolls in HR (A1 costs Zadar→Ploče), fuel prices, vignettes (none in HR/BA/ME? verify), currencies (EUR in HR & ME, KM in BA), card acceptance, typical costs (campsite for 4+tent+car per country, meal, beer) per recent traveler reports.
5. Events Jun 16–28, 2026 in our corridor: festivals, parties, concerts, local events (Zadar, Split, Hvar, Mostar, Sarajevo, Budva, Kotor, Dubrovnik) — anything happening those exact dates.
6. Connectivity: EU roaming applies HR; BA and ME do NOT have EU roaming — eSIM/SIM advice from recent travelers.

Be concrete with numbers, dates and sources. Where 2026 schedules aren't published yet, give the 2025 numbers and say so.

Write research/logistics-notes.md (+ optional src/data/logistics-places.json). If you added places: validate JSON with python3 -m json.tool, then npm run build.
```

---

## Session F — Adventure, adrenaline & unique experiences (all 3 countries)

```
Read CLAUDE.md first and follow the data conventions and research rules exactly.

You are the ADVENTURE & EXPERIENCES researcher, cross-country. The group is 4 young adults, full camping gear, zero limits: "crazy activities, parties, meditation on a mountaintop — whatever." Other sessions cover places region-by-region; you hunt EXPERIENCES along the whole corridor (Zadar→Dubrovnik→Bosnia inland→Durmitor→Montenegro coast, Jun 16–28 — see research/route-skeleton.md and research/route-sketch-notes.md):

- Adrenaline: canyoning (Cetina @ Omiš; NEVIDIO canyon near Durmitor — difficulty/operators/price/is-June-OK water levels), rafting comparison (Cetina vs Neretva vs Tara — which ONE is the must-do per real reviews, prices ~€40-60?), ziplines (Omiš, Tara bridge), paragliding (Makarska? Budva? Sarajevo?), via ferrata, cliff-jumping spots people actually name coordinates for, kitesurfing intro at Ada Bojana/Velika Plaža, diving (wrecks? Blue Cave?), bungee, karst cave tours worth it.
- Unique/weird: 1984 Sarajevo Olympics bobsled track, abandoned places people legally visit, Lukomir village, sunrise hikes worth the alarm, stargazing/dark-sky camping spots, meditation/peace spots locals name, hot springs if any.
- Party: where 20-somethings actually go in late June — Split, Hvar(?), Dubrovnik, Mostar student scene, Sarajevo, Budva (Top Hill? beach clubs?), Kotor. Recent Reddit threads only (2023+), not old reputations. Any festivals/events Jun 16–28 2026.
- Water fun: best swim/snorkel coves along our exact route, river swimming (Kravica got covered — what else? Buna? Tara pools?), SUP/kayak rentals worth it.

Find 20–30 concrete entries with operator names, prices, and what real people said. Quality bar: somebody who DID it describing it, not marketing copy.

Write:
1. src/data/experiences.json (Place array; ids by country prefix hr-/ba-/me-; status "candidate"; check src/data/*.json for id collisions first; category "activity"/"nightlife"/etc.)
2. research/experiences-notes.md — operator/price comparison tables (rafting, canyoning, paragliding), party-scene verdict per city for our dates, ranked top-10 "don't miss" list.

Validate JSON with python3 -m json.tool, then npm run build.
```

---

## Session G — App development (code only, no data files)

```
Read CLAUDE.md first. You are the APP DEVELOPER session for this trip-planning tool (Vite + React + TS + react-leaflet, see src/). HARD RULES: client-side only (no backend/DB — localStorage is the persistence layer); NEVER edit files in src/data/ (6 other parallel sessions write those) — only read them; the Place schema in src/types.ts may be extended additively but existing fields must keep working; npm run build must stay green after every feature.

Build these features, in this priority order, verifying each works before moving on:

1. DAY PLANNER: extend the localStorage overrides (src/store.ts) to {status?, day?, dayOrder?, note?}. In the UI: assign a place to a day (trip = Jun 16–28, days 1–13) from the popup/panel; add a collapsible "Itinerary" view in the sidebar listing each day with its date and ordered stops (reorder with up/down buttons); unassigned shortlist places shown as a backlog. Include day assignments + notes in the Export JSON.

2. DRIVING ROUTES: for each day with 2+ ordered stops, fetch the driving route from the OSRM public API (https://router.project-osrm.org/route/v1/driving/{lng},{lat};...?overview=full&geometries=geojson) and draw it as a colored polyline on the map (one color per day); show per-day driving time + km in the itinerary view and a trip total. Cache OSRM responses in localStorage keyed by the coordinate sequence (be kind to the free API); debounce refetches.

3. PERSONAL NOTES: small textarea per place (popup or detail panel), stored in overrides, searchable, included in export.

4. NEARBY FINDER: from a selected place, "show campsites/accommodation within N km" (haversine, slider 5–30km) — highlights matches on the map, dims everything else. This is how we'll pick where to sleep near activities.

5. DETAIL PANEL + POLISH: replace the cramped Leaflet popup with a proper side detail panel (popup keeps just name + status buttons); add tag filtering; show place counts per status chip; make the layout usable on a phone (we'll use this on the road — sidebar collapses to a bottom sheet or toggle); general visual polish, but keep it lightweight (no UI framework).

6. OPTIONAL if time: marker decluttering at low zoom (e.g. simple grid-based grouping — avoid heavy plugins), a "fit map to filtered places" button, URL hash for the current view.

Dev notes: dev server may already be running on :5173 (HMR will pick up your edits — don't be surprised). Test with a real browser if available (headless Chrome works: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --dump-dom http://localhost:5173/). New JSON data files may appear in src/data/ while you work — that's normal and they must load without code changes.

When done, write a short research/app-changelog.md describing what you built and any known limitations.
```

### Session G follow-up — "Build the road" (paste into the SAME app session once it finishes the list above)

```
ROUTE BUILDER (user priority): add a "Build route" mode. The user multi-selects places (checkboxes in the sidebar list, plus a "select all shortlisted" shortcut), picks start and end stops (sensible defaults: northernmost/Zadar-side as start, Dubrovnik-side as end), and the app calls the OSRM Trip API — https://router.project-osrm.org/trip/v1/driving/{lng},{lat};{lng},{lat};...?source=first&destination=last&roundtrip=false&overview=full&geometries=geojson — which returns the OPTIMAL visiting order (traveling salesman). Draw the optimized route on the map with numbered waypoints, show the ordered stop list with leg times and total driving time/km, and add "apply this order to days": split the sequence into days using a max-driving-hours-per-day slider (default 3h), writing the day/dayOrder overrides from feature 1. Cache OSRM responses in localStorage like the other route fetches. The public OSRM server caps waypoints (~100) — fine for our scale; handle its error response gracefully.
```

### Session G follow-up 3 — route QUALITY: actually-optimal ordering (paste after follow-up 1)

```
ROUTE OPTIMALITY (user priority — "the route builder must find the most effective routes"): the OSRM /trip endpoint is a HEURISTIC (farthest-insertion + local opt) — fine usually, but not guaranteed optimal, and it can't handle our constraints. Upgrade the route builder:

1. MATRIX + LOCAL SOLVER architecture: fetch the full duration matrix for the selected waypoints from OSRM /table (https://router.project-osrm.org/table/v1/driving/{coords}?annotations=duration,distance — one cheap call), then solve ordering LOCALLY: exact Held-Karp DP for ≤13 waypoints (8192·13² ops — trivial), nearest-neighbor + 2-opt + or-opt restarts for larger sets. Show "exact optimum" vs "heuristic" label so we know what we got. Keep /route only for drawing the final geometry. Compare against /trip's answer in dev and log if /trip was worse.

2. ANCHORED SEGMENTS: some stops are time-locked (Dubrovnik airport on Jun 18 evening; Zadar start Jun 16; Dubrovnik end Jun 28). Let the user pin stops as ordered anchors; optimize each segment between consecutive anchors independently (anchor → free stops → next anchor). This both respects reality and keeps each TSP small enough for the exact solver.

3. FERRY AWARENESS: OSRM road durations don't include ferry waits/schedules (Mljet, Korčula). Let a leg be marked "ferry: +Xh manual" and include it in totals; visually dash those route segments.

4. SANITY OUTPUT: per-leg minutes in the ordered list (compare with research/drive-times.md numbers), total per segment, and a warning when any single day exceeds the max-hours slider.
```

### Session G follow-up 2 — sleep spots along the route (paste after the route builder works)

```
ROUTE CORRIDOR FINDER: once a route is built (day route or optimized route), add "find sleep spots along this route": show all places with category "campsite" or "accommodation" within N km of the route polyline (slider 2–20km, default 10; point-to-segment distance is fine, no need for road distance). Matches get highlighted + listed grouped by which leg of the route they're nearest to, showing their cost/facilities fields so we can compare value for money. Everything else dims. This is how the group picks where to sleep each night, so make the comparison list scannable (name, cost, facilities, rating, distance from route). Note: Airbnb candidates will later be added as category "accommodation" pins by the master session — they must work in this finder and in route building like any other pin (any category can be a route waypoint).
```

---

## Session H — UX simplicity audit (no code edits — produces a spec)

```
Read CLAUDE.md first. You are the UX SIMPLICITY AUDITOR for the trip app. DO NOT EDIT ANY FILES except writing research/ux-review.md — session G owns the app code and is actively changing it; your output is a spec G will implement.

Context: this app will be operated during the actual road trip by 4 tired people, mostly on PHONES, in a moving car, often one-handed, with patchy data, including non-engineers. Features are being added fast (filters, itinerary, route builder, nearby finder, detail panel) — you are the opposite force: make it dead simple to OPERATE.

Method: run it for real. Dev server is likely already on http://localhost:5173 (else npm run dev). Screenshot at desktop AND phone size with headless Chrome:
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --screenshot=/tmp/ux-phone.png --window-size=390,844 --virtual-time-budget=6000 http://localhost:5173/
Read src/App.tsx + src/components/* to understand every flow. Walk the core journeys as a user: (1) "where are we sleeping tonight?" (2) "what's next today and how far is it?" (3) "we're tired — drop a stop, rebuild the road" (4) "promote this place to shortlist" (5) "what's worth seeing near where we are right now?"

Deliver research/ux-review.md: a prioritized top-10 of simplifications, each as problem → concrete proposal → effort guess (S/M/L). Think hard about: PLANNING MODE vs TRIP MODE (on the road, hide research machinery — filters/statuses/candidates — and default to a today-centric view); sensible defaults so core journeys need zero filter touches and ≤3 taps; big touch targets; a GPS "locate me" button; what to DELETE or hide rather than add; whether the popup/panel/sidebar hierarchy survives a 390px screen. Be opinionated and concrete — this goes straight to the dev session.

FINAL ACT when everything above is written: mkdir -p .fleet/done && echo done > .fleet/done/H
```

---

## Session I — Offline survival & deployment (no code edits — produces a spec)

```
Read CLAUDE.md first. You are the OFFLINE & DEPLOYMENT strategist. DO NOT EDIT app code (session G owns it). Write research/offline-deploy.md as an implementation-ready spec; research real options and verify claims against docs.

The problem: during the trip (Jun 16–28), 4 phones in the Balkans. Croatia has EU roaming; Bosnia and Montenegro DO NOT — data may be expensive or absent, and mountain zones (Durmitor, Sutjeska) plus border areas have dead spots. The app currently needs network for THREE things: OSM raster tiles, OSRM routing calls, and serving the bundle itself.

Cover, with one concrete recommendation each:
1. HOSTING so all 4 phones can open it: simplest free static deploy for this Vite app (GitHub Pages vs Netlify vs Vercel) — pick one, give exact steps for THIS repo (base-path gotchas, HTTPS for geolocation). Data is baked into the bundle at build time — note the redeploy-on-data-change implication and make redeploy one command.
2. PWA/OFFLINE: service worker (vite-plugin-pwa?) caching app shell + data; tile-caching strategy with an honest storage estimate (MB for our corridor at zooms 8–14 — viable? alternatives: narrower zoom range, route-corridor-only tiles, or accept online-only tiles); "download for offline" button spec that pre-fetches all shortlist/day routes into the existing localStorage OSRM cache + tiles along them while on wifi.
3. FALLBACK if full offline is too heavy: one-click export of shortlist+itinerary to (a) GPX/KML for Organic Maps (fully offline nav app) and (b) Google My Maps import — spec the export precisely against src/types.ts. This may honestly be the highest value/effort ratio — say so if you conclude that.
4. Phone GPS: what "center on me" needs on the chosen hosting.
End with: the minimal-effort path to "still works in a dead zone in Durmitor", as a prioritized implementation list for the dev session.

FINAL ACT when everything above is written: mkdir -p .fleet/done && echo done > .fleet/done/I
```

---

## Session J — Food & drink along the route

```
Read CLAUDE.md first and follow the data conventions and research rules exactly.

You are the FOOD & DRINK researcher for the whole route (Zadar → Split/Omiš/Makarska → Dubrovnik → Mljet/Pelješac → Mostar/Sarajevo-side → Žabljak → Skadar/Budva/Kotor — see research/route-skeleton.md). 4 young adults, value-for-money hunters: legendary cheap local food beats fancy restaurants every time.

Find 20–30 entries: konobas/taverns locals actually name; the ćevapi and burek institutions (Mostar, Sarajevo — specific named places); peka/seafood worth pre-ordering on the coast; Buna trout at Blagaj; wineries (Trebinje, Skadar Lake — which winery should the group's planned winery stop be? — Pelješac plavac mali); Ston oysters (real prices); mountain-hut food in Durmitor; best coffee/ice-cream stops; AND the practical layer: markets/supermarkets for camping food near our overnight zones, which chains are cheapest per country (Lidl/Konzum/Bingo/Voli...), where to refill water for free.

Source from locals/travelers on Reddit, forums, and food blogs by people who actually ate there — NOT TripAdvisor rankings. Real quotes in communityNotes, prices people reported, links in sources. Verify all coordinates.

Write:
1. src/data/food.json (Place array, category "food", ids by country prefix, status "candidate"; check src/data/*.json for id collisions first)
2. research/food-notes.md — per-overnight-zone cheat sheet (the 2–3 must-eats), camping-supplies strategy, typical meal/beer prices per country.

Validate with python3 -m json.tool, then npm run build.

FINAL ACT when everything above is written: mkdir -p .fleet/done && echo done > .fleet/done/J
```

---

## Session K — Trip ops: weather, daylight, crowds, packing (notes only)

```
Read CLAUDE.md first. You are the TRIP OPS researcher. No map pins — write research/trip-ops.md only. Trip: Jun 16–28, route in research/route-skeleton.md (Adriatic coast, Bosnia inland, Durmitor at ~1500m+, Montenegro coast).

Research with real sources (climate normals, mountain forums, recent trip reports):
1. WEATHER per leg in late June: coast air/sea temps (swimmable everywhere?), Mostar heat (often 35°C+ — what does that do to our midday plans?), Durmitor at altitude — NIGHT TEMPS IN A TENT (do we need warm sleeping bags?), afternoon thunderstorm patterns (= start hikes when?), rain odds, bura/jugo winds and their ferry-cancellation risk.
2. DAYLIGHT for our dates/latitude: sunrise/sunset times, golden hour, and which existing pins make the best sunrise/sunset spots per overnight zone.
3. CROWD TIMING: which of our hotspots (Plitvice/Krka if chosen, Dubrovnik walls, Kotor, Mostar bridge) demand before-9am or after-17h visits in late June; cruise-ship schedule effects in Dubrovnik/Kotor (is there a port calendar?); do regional school holidays starting ~Jun 20 flip the crowd level?
4. PACKING list for THIS exact trip: camping at altitude + beach + serious hikes + 3 borders. Mosquito reality at Skadar Lake, sea urchins (water shoes?), sun, powerbank/12V inverter strategy for 13 days of phones-as-navigation, documents (green card! passports for Neum corridor), what people report forgetting on r/CampingEurope. Mark rent-vs-buy-vs-bring for anything we might lack.
5. Date-specifics: moon phase for our nights (stargazing in Durmitor dark skies?), any known late-June-2026 events affecting roads/ferries. Say clearly when long-range data doesn't exist.
Output: research/trip-ops.md — per-zone weather table, packing checklist, and a short list of timing rules of thumb.

FINAL ACT when everything above is written: mkdir -p .fleet/done && echo done > .fleet/done/K
```

---

## Session L — Safety, car & contingency playbook (notes only)

```
Read CLAUDE.md first. You are the SAFETY & CONTINGENCY researcher. Main output: research/contingency.md (pins only if truly location-bound → src/data/contingency-places.json, sparingly). Route + dates: research/route-skeleton.md. Rental car picked up in Zadar, dropped in Dubrovnik, crossing HR/BA/ME borders.

Research via real traveler reports (Reddit, forums, rental-review threads — not generic safety listicles):
1. CAR: what actually goes wrong with rentals on this loop — cross-border paperwork checks (green card), deposit/damage disputes (photo-everything-at-pickup advice), breakdown: does Croatian rental roadside assistance cover BA/ME, who do you actually call; gravel-road reality (Lukomir, Durmitor side roads — is the rental even allowed there per typical contracts?); fuel-station gaps on inland legs; toll-payment mechanics.
2. POLICE & DRIVING CULTURE: speed traps and on-the-spot fines in ME/BA (recent reports, typical amounts, cash or card), mandatory daytime lights?, overtaking culture, night mountain driving advisability, parking enforcement/towing in Dubrovnik, Kotor, Mostar (where do tourists actually get towed?).
3. THEFT: car break-ins at trailhead/beach/viewpoint parking along OUR pins (known hotspot lots per forums?), valuables strategy for a camping car (tent gear visible = target?), campsite security reality.
4. HEALTH: hospital/ER + pharmacy nearest each overnight zone (compact list), tap-water potability per region, EHIC validity (BA/ME are NON-EU — what does that mean for us, is extra insurance smart?), tick/TBE situation in Durmitor & Sutjeska forests, and CRITICALLY: do standard travel insurance policies cover rafting/canyoning/via-ferrata (activity exclusions people got burned by)?
5. EMERGENCY: numbers per country (112 coverage?), key local phrases, what to keep as offline copies.
Output: research/contingency.md — a printable "if X happens → do Y → call Z" playbook plus the per-zone hospital/pharmacy list.

FINAL ACT when everything above is written: mkdir -p .fleet/done && echo done > .fleet/done/L
```

---

## Session M — Hiking deep-dive (all 3 countries)

```
Read CLAUDE.md first and follow the data conventions and research rules exactly.

You are the HIKING SPECIALIST. The group wants amazing hikes researched SERIOUSLY — this is a priority topic. 4 fit-but-not-alpinist young adults, full camping gear, trip Jun 16–28 (route: research/route-skeleton.md). Use the platforms where hike data actually lives: AllTrails/Komoot/Outdooractive/Wikiloc reviews and GPX tracks, SummitPost, hiking forums, r/hiking + r/Mountaineering + country subreddits, hut/park websites for current conditions.

Scope along our corridor: Paklenica/Velebit (Croatia — Anića Kuk viewpoints, Velika Paklenica, maybe Tulove Grede), Biokovo (Sveti Jure on foot vs road — already pinned), Bosnia: Lukomir/Bjelašnica rim walks, Prenj if realistically accessible, SUTJESKA: Maglić summit + Trnovačko Lake (the heart-shaped lake — feasibility for us, border quirk of the lake being in ME!), Montenegro: Durmitor properly — the planned Black Lake → Veliki Međed route (verify difficulty/time/scramble grade), Bobotov Kuk (the big one — June snowfields at 2400m? crampons or fine?), Prutaš, Ćurevac, Sedlo pass starts; Lovćen, Komovi (group backup wish), Ladder of Kotor.

For EACH hike: trailhead coordinates (that's the pin), distance/elevation gain/realistic time, honest difficulty (incl. exposure/scrambling — one of us may hate exposure, note it), water sources, June conditions (snow at altitude? verified recent reports), park fees, parking-at-trailhead reality, GPX/track link, and what real hikers said (quotes + links in sources).

Deliver a ranking: top-3 must-do for THIS group, solid alternates, short-and-sweet options (≤2h, for transit days), and bad-weather substitutes. 15–25 entries total.

Write:
1. src/data/hikes.json (Place array, category "hike", trailhead coords, ids by country prefix; CHECK src/data/*.json for existing ids first — Durmitor/Paklenica hikes may already exist from sessions A/D/M overlap; pick new ids and note overlaps in your notes file instead of duplicating)
2. research/hikes-notes.md — ranked list, table (hike / time / gain / difficulty / June status), gear implications, and per-hike "skip if" criteria.

Validate JSON with python3 -m json.tool, then npm run build.

FINAL ACT when everything above is written: mkdir -p .fleet/done && echo done > .fleet/done/M
```

---

## Session N — Airbnb wishlist enrichment (user's hand-picked listings → map pins)

```
Read CLAUDE.md first and follow the data conventions. You are enriching the user's own Airbnb wishlists into map pins. These listing IDs were extracted from the user's saved wishlists ("Bosnia" and "Montenegro"):

BOSNIA (19): 643252285251222758, 1033869502806589797, 903316557303665264, 1539679493194102806, 1194869300122871016, 1279909870154785931, 1167547936354611317, 1143857451883062133, 623912791608300458, 791411829333036306, 43843555, 1055692570458046534, 28297858, 1440352206705357999, 1685540403895069749, 1377504503811908987, 1038480265358959903, 26289644, 1294839146223116793
(observed names include: Cottage in Poplat "Kostela Stone House", Villa in Pale "Panoramic Mountain Chalet", Home/Cabin in Šipovo ×2, Cabin in Tihovići "HaDaNa", Home in Borovnica "Šehić Weekend House"…)

MONTENEGRO (5): 14313188, 1194377822001153349, 13219159, 625139070441679511, 49077678
(observed: Home in Rvaši "Family house Rvasi", Cabin in Duži "Mountain Lodge", Home in Godinje "Ivan's holiday home", Cottage in Opština Bar "Holiday Home Darja", Hut in Bijelo Polje "Mountain view chalet")

For EACH listing, fetch https://www.airbnb.com/rooms/<id> with curl (use a desktop browser User-Agent; pages are public — the embedded JSON in <script id="data-deferred-state-0"> or DOM contains coordinates, title, capacity, rating). Extract: exact name, lat/lng, capacity (flag if <4 people!), rating + review count, and nightly price — query price with dates via the URL params (?check_in=2026-06-21&check_out=2026-06-23&adults=4 for Bosnia ids; ?check_in=2026-06-24&check_out=2026-06-26&adults=4 for Montenegro ids). If a fetch is blocked, retry once with delay; if still blocked, record what you got and move on — partial data beats none. Be polite: ~2s between requests.

IMPORTANT FRAMING from the user: the wishlist is NOT a final list — it's a taste sample from casual browsing ("those I more or less liked"). Any dates baked into the wishlist are random; the sample dates above are route-skeleton estimates, fine for price sampling but final dates depend on the itinerary. Your job is the BEST solution, not validating the wishlist: some wishlist items may be poor value or off-route (say so), and you should find better alternatives.

Write src/data/accommodation-wishlist.json: Place array, category "accommodation", status "shortlist" for wishlist items (user-picked taste signal — they can demote in the UI), tags ["airbnb-wishlist"], sources [listing URL], cost = the sampled June nightly price for 4 (note in description that dates are estimates), description = capacity/rating + one-liner. Country prefix ba-/me- by actual location.

THEN go beyond the wishlist: for each overnight zone in research/route-skeleton.md (Mostar, Konjic/Sarajevo, Trebinje/Konavle, Žabljak, Skadar, Budva/Kotor — plus Croatian zones if time permits), search Airbnb the same way (map-bounded search URLs, parse embedded results) for 2–3 BETTER-VALUE alternatives: 4 people, ~€50/night benchmark (stretch to ~€80 if clearly worth it), well-rated. Add them to the same JSON with tags ["airbnb-alternative"], status "candidate".

THEN the decision layer in research/airbnb-wishlist-notes.md:
- Per listing: distance to our route corridor (e.g. Šipovo and Bijelo Polje look FAR off-route — say how far and what the detour costs), which overnight zone/night it could serve, value verdict, capacity check (flag <4!).
- Ranked recommendation per zone: wishlist item vs your found alternatives.
- BOOK-NOW vs WAIT split (key deliverable): for each top pick, check the cancellation policy — listings with free cancellation well past mid-June are SAFE to book immediately even with uncertain dates (book refundable, adjust later); flag rare-gem listings (unique + few alternatives in zone + filling calendar) where booking now is smart, vs commodity zones (many similar options) where waiting costs nothing.

Validate JSON with python3 -m json.tool, then npm run build.

FINAL ACT: mkdir -p .fleet/done && echo done > .fleet/done/N
```

---

## After sessions finish (for the master session)

Tell the master session which files landed; it will review `src/data/*.json` + `research/*.md`, dedupe, sanity-check coordinates on the map, and then move to phase 2: itinerary/route building and Airbnb shortlisting per overnight stop.
