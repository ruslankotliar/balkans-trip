# Balkans Trip Planner

Trip-planning app + research workspace for a 13-day road trip. **This is a throwaway planning tool, not production software — keep everything simple.**

## Trip facts

- **Dates:** Jun 16 (arrive Zadar, morning) → Jun 28, 2026 (depart Dubrovnik → Vienna). 12 nights.
- **Hard constraint:** Jun 18 **evening** — pick up the 4th person at **Dubrovnik airport**. So days 1–3 = Zadar → Dubrovnik down the coast; everything after is a loop starting and ending in Dubrovnik.
- **People:** 4 adults (3 from day 1, 4th joins Jun 18 in Dubrovnik), young, adventurous, up for anything (hikes, rafting, cliff jumping, islands, parties, meditation on a mountain — no limits).
- **Transport:** rental car, pick up Zadar, drop off Dubrovnik (one-way already arranged, cross-border OK).
- **Countries:** Croatia (HR) → Bosnia & Herzegovina (BA) → Montenegro (ME) → back to Dubrovnik (HR).
- **Sleeping:** mix of camping (full gear, tents) and Airbnb/apartments. Budget-conscious: ~€50/night apartments for 4 are the benchmark; a cool cheap villa is a win. Campsites judged on price + view + facilities (showers!) + beach/mountain location.
- **Open options:** car ferries to islands (Dugi Otok, Hvar/Brač, Mljet) if worthwhile.

## Confirmed group wishes (already in data, status=shortlist)

- Montenegro route from a group member: enter via Šćepan Polje → Piva canyon → Plužine → Žabljak (Durmitor hike: Black Lake → Veliki Međed) → Ostrog Monastery → Skadar Lake (kayak/winery) or Sveti Stefan → Budva → Kotor (fortress climb) → Dubrovnik. Optional: Komovi mountains.
- User-saved Google Maps places: Makarska Riviera cluster (Punta Rata, Sveti Jure, Šćirovac, Camping Krvavica), Montokuc on Mljet, Veliki Prštavac at Plitvice.

## Route shape (user's sketch — a loop, no road driven twice, scope deliberately broad)

The user drew a route sketch (described in `research/route-sketch-notes.md`); drive-time estimates and variant math live in `research/drive-times.md`. Fixed direction:

1. **Jun 16–18:** Zadar (± Velebit mountains loop) → Split/Omiš/Makarska → Dubrovnik by Jun 18 evening (airport pickup). Big northern islands (Hvar/Brač/Vis) likely don't fit.
2. **After pickup:** island block near Dubrovnik — Mljet and/or Korčula via Pelješac, Lokrum/Elaphiti as boat options.
3. **Northeast into Bosnia:** Kravica/Mostar, then deeper inland (Konjic, possibly Sarajevo — only +13min driving vs direct, see drive-times) → Sutjeska NP.
4. **Cross into Montenegro inland** at Šćepan Polje → Piva canyon → Žabljak/Durmitor.
5. **South through Montenegro:** Ostrog → Skadar Lake (± deep south: Bar/Ulcinj/Ada Bojana, +~2h) → Budva → Kotor → Dubrovnik for Jun 28.

**OPEN variants — research collects options for ALL of them; the group decides later with time estimates:** Plitvice yes/no (+4:21 driving), mountains-vs-coast Zadar→Split, Korčula vs Mljet vs both, Sarajevo overnight yes/no, deep-south extension yes/no. Don't prune these unilaterally; give verdicts + evidence.

**Time-weighting principles (from the user):**
- Croatia pre-pickup is a hard 2.5 days (Jun 16, 17, 18-until-evening). Backtracking along the Croatian coast after the pickup is probably poor value — the user leans towards spending the freed-up time in Bosnia and Montenegro instead.
- Be ambitious but balanced: the plan must not be a stress machine. Every day should survive dropping an item ("we're tired" → exclude a stop → the app rebuilds the road). Prefer plans with built-in slack and obvious skip candidates over wall-to-wall schedules.
- Accommodation is value-for-money driven: price + conditions (showers!) + view/location. Campsites and Airbnbs/apartments compete on equal footing per night.

Draft day-by-day skeleton: `research/route-skeleton.md` (a working draft — research findings may reshuffle it).

## App

Vite + React + TypeScript + react-leaflet (OpenStreetMap tiles, no API key).

```bash
npm install   # once
npm run dev   # http://localhost:5173
npm run build # type-check + build
```

- Map with colored pins per category, sidebar with filters (country/category/status) and search.
- Status changes made in the UI are stored in localStorage; "Export JSON" downloads the merged data.

## Data conventions (IMPORTANT for research sessions)

All places live in `src/data/*.json` — each file is a JSON **array** of `Place` objects (schema: `src/types.ts`). The app auto-loads every JSON file in that folder. **Each research session writes ONLY its own assigned file and must not touch other files.**

Rules:

- `id`: kebab-case, prefixed by country: `hr-`, `ba-`, `me-` (e.g. `ba-kravica`). Must be unique — check existing files for collisions (first occurrence wins on duplicate ids).
- `lat`/`lng`: decimal degrees, **real verified coordinates** (cross-check with OpenStreetMap/Google Maps). Never guess — a wrong pin is worse than no pin.
- `status`: new research entries are `"candidate"` (the user promotes to `shortlist`/`backup` in the UI). Don't set `shortlist` yourself.
- `description`: 1–3 sentences — what it is, why it's worth it.
- `communityNotes`: what real people say (Reddit, forums, park4night reviews), short quotes welcome. This is the core value — see research rules.
- `sources`: URLs of the actual threads/reviews.
- `rating`: 1–5 = strength/consistency of community feedback (5 = repeatedly praised across independent sources).
- Campsites: fill `cost` (for 4 people + tent(s) + car) and `facilities`.
- Valid JSON only: double quotes, no trailing commas, no comments. Validate with `python3 -m json.tool src/data/<file>.json`.

Long-form findings (route logic, comparisons, things that don't fit the schema) go in `research/<topic>-notes.md`.

## Research rules

- **Source from real travelers, not travel guides or SEO listicles**: Reddit (r/croatia, r/montenegro, r/CampingEurope, r/solotravel, r/travel…), TripAdvisor/Fodor's forums, park4night & Campercontact reviews, hiking forums, personal trip reports. Google Maps review counts are NOT a quality signal.
- **Be creative — attack each topic from multiple angles, don't stop at the first search that works.** Ideas that pay off: `site:reddit.com` queries with specific phrasings ("hidden gem", "worth it?", "vs"); **local-language searches** (Croatian/Bosnian/Serbian terms — locals' forums and blogs surface places English content never mentions; translate what you find); activity platforms with real user data (AllTrails/Komoot/Outdooractive/Wikiloc for hikes, park4night/iOverlander for sleeping spots); mining Google Maps *review texts* for specifics (prices, "gets crowded after 10", "rangers fine wild campers") even though counts/stars are not a signal; YouTube/blog trip reports for ground truth on road and trail conditions; official park/operator sites for prices and opening hours only. Triangulate: a place is strong when independent source types agree.
- Niche/low-tourist gems are explicitly wanted; collect generously (the user prunes manually). Backup options are valuable.
- Note crowding/timing advice (June = high season starting) and real prices people reported.
