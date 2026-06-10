# Master-session integration checklist

What the boss session verifies as each parallel session reports done. Restored 2026-06-10 after collateral deletion (original written same day).

## Per-session intake (all of A–F, J, M)

- [ ] JSON file valid, loads in app, `npm run build` green
- [ ] No id collisions/shadowing across `src/data/*.json` (first occurrence wins — check dupes deliberately)
- [ ] Coordinates sanity-check on the map (no pins in the sea / wrong country)
- [ ] `sources` present and actually forum/Reddit/review links, not listicles
- [ ] Campsites have `cost` + `facilities` filled where findable

## Specific audits (user-raised concerns)

- [ ] **Bosnia depth (Session C):** verify real INLAND coverage (Konjic/Boračko, Sarajevo, Lukomir, Sutjeska). If thin → launch a C2 follow-up session. Keep scope broad — the user filters, we don't pre-trim.
- [ ] **Campsite coverage per overnight zone:** ≥2 sleep options with price+conditions per zone (Zadar, Omiš/Makarska, Dubrovnik/Konavle/Trebinje, Mljet/Pelješac, Mostar, Konjic/Sarajevo, Žabljak, Skadar/Podgorica, Budva/Jaz, Kotor). Gaps → targeted follow-up.
- [ ] **Variant verdicts delivered:** Plitvice (A), inland-vs-coast (A), Korčula/Mljet/both (B+E consistent?), Sarajevo (C), Šćepan Polje road state (D), deep south (D). Cross-check B vs E on ferries — flag contradictions.
- [ ] **Jun 18 timing math (E):** Makarska→airport-by-evening plan exists and is realistic.

## Incident log

- 2026-06-10: a second Montenegro session consolidated 4 regional files (59 places) into me-places.json (33 curated) and deleted the originals + collaterally E's logistics files + this checklist. E's files restored from transcript; dropped ME places preserved as documented backups in research/me-notes.md. Git initialized as protection. Lesson encoded in fleet protocol: sessions own ONLY their spec'd files; never delete others' files.

## Phase 2 (after intake)

1. Group decides open variants → lock overnight zones per night (1–12).
2. Airbnb pass: shortlist real listings per overnight zone (~€50/night benchmark for 4), add as `accommodation` pins (`src/data/accommodation.json`, boss-owned) → they join route building + corridor finder.
3. Build day-by-day route in the app (G's planner + route builder), verify daily driving ≤ ~3h average, designate skip-candidates per day (the "we're tired" valve).
4. Final outputs: locked itinerary in route-skeleton.md v2, booking to-do list (ferries to reserve, campsites to call, Airbnbs to book).
