#!/usr/bin/env python3
"""Surgically replace stale bestTime strings in src/data/*.json (raw-text, format-preserving).
Each entry: (relative file, OLD bestTime exact, NEW bestTime). Verifies OLD occurs exactly once."""
import sys, os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))

PATCHES = [
("src/data/food.json",
 "Day 2 (Jun 17) — quick ćevapi stop in Split en route Paklenica → Omiš. Off-peak (before 12:00 or after 14:00) to skip the worst of the queue.",
 "Day 1 (Jun 16) — quick ćevapi stop in Split en route Krka → Krvavica; open daily ~08:00–23:00. A ~16:00 stop is fine (off-peak = before 12:00 or after 14:00)."),

("src/data/hr-south.json",
 "BOOK Jun 18 morning slot now at shop.pp-biokovo.hr — capped at 20 cars/hour; sells out in June. Open 06:00–20:00.",
 "Day 2 (Jun 17) — BOOK the morning Skywalk slot at shop.pp-biokovo.hr ONLY if the weekday 07:00–15:00 road closure (in effect until Jun 19 2026) is lifted. Capped 20 cars/hour, sells out in June. Else skip — Cetina canyoning is the D2 anchor."),

("src/data/hr-user-saved.json",
 "Day 3 (Jun 18) early — leave Makarska 07:00, summit before 09:00 (the Skywalk slot is booked at shop.pp-biokovo.hr, 20-car/hour cap). Clear morning essential for the 360° Adriatic + island view.",
 "Day 2 (Jun 17) early IF the road is confirmed open — leave Makarska ~06:30, summit before 09:00 for the haze-free Adriatic+island panorama. But Wed Jun 17 sits inside the weekday closure (until Jun 19 2026), so likely skip and let Cetina carry D2."),

("src/data/logistics-places.json",
 "D3 (Thu Jun 18) EVENING — the trip's #1 fragility. Friend lands DBV 17:20; pickup, then ~1h45–2h drive DBV→Prapratno (via Dubrovnik+Ston) = arrive ~19:30–19:45 for the 20:30 LAST sailing. June 2026 Prapratno→Sobra (29 May–2 Jul block): 07:00, 10:15, 13:00, 17:00, 20:30 (verified Jun 2026). Cars first-come, no reservation, ~50/boat — be in the queue ≥45 min early. Pre-buy tickets online to skip the desk. Plan B if flight delayed past ~18:30: sleep mainland near Ston/Slano, take 07:00 or 10:15 ferry next morning.",
 "D3 (Thu Jun 18) EVENING — the trip's #1 fragility. Friend lands DBV 17:20; pickup, then ~1h15–1h30 drive DBV→Prapratno (60km via Ston) = arrive ~19:15 for the 20:30 LAST sailing. June 2026 Prapratno→Sobra (29 May–2 Jul block): 07:00, 10:15, 13:00, 17:00, 20:30 (verified Jun 2026). Cars first-come, no reservation, ~50/boat — be in the queue ≥45 min early. Pre-buy tickets online to skip the desk. Plan B if flight delayed past ~18:30: sleep mainland near Ston/Slano, take 07:00 or 10:15 ferry next morning."),

("src/data/seed.json",
 "Day 6 (Jun 21) — midday stop between Kravica and Mostar (12 km south of Mostar, directly on route). Arrive 10:00–11:30 or after 15:00 to miss tour buses. Park at lower lots; cover knees/shoulders (wraps at door). Time: 1.5h max.",
 "Day 5 (Jun 20) — Blagaj is 12 km south of Mostar (~15min), visited AFTER the cool-morning Mostar block. Arrive after 15:00 (or before 10:00) to dodge tour buses. 10 KM/EUR5 cash; cover knees/shoulders (wraps at door); 1.5h max."),

("src/data/seed.json",
 "Day 5 (Jun 20) — arrive late afternoon from Kravica falls. Evening and morning are the magic hours — Stari Most glows amber at sunset (~20:25).",
 "Day 5 (Jun 20) cool morning ~09:30-10:30 — Stari Most empty + the jumpers are out; midday = mobbed + 35C. (If you instead end the day here, the bridge glows amber at sunset ~20:31.)"),

("src/data/ba-itinerary-spots.json",
 "Day 6 (Jun 21) morning — morning for clearest views of Stari Most. Drive 5 km from town. Call +387 62 115 100 ahead to confirm open. Sequence: Kravica 07:00 → Počitelj 09:30 → Fortica 10:30 → Stari Most afternoon.",
 "Day 5 (Jun 20) late afternoon ~16:00-18:00 — exposed hilltop is heat-tolerant; zipline runs daily 09:00-21:00 (50 KM/pp), Skywalk free. Call +387 62 115 100 to confirm open. The day's slack/skip candidate."),

("src/data/gap-finds.json",
 "Day 6 (Jun 21) sunset — walk up from Baščaršija 30-40 min before sundown (~20:45). Free, bring drinks. Pairs with the Kovači war cemetery below.",
 "Day 6 (Jun 21) sunset — walk up from Baščaršija 30-40 min before sundown (~20:32). Free, bring drinks. Pairs with the Kovači war cemetery below."),

("src/data/ba-places.json",
 "Day 6 (Jun 21) — afternoon arrival + overnight. Baščaršija at dusk, Žuta Tabija sunset (20:45), nightlife on Ferhadija. Practical base for Day 7's 08:30 Tara rafting departure.",
 "Day 6 (Jun 21) — afternoon arrival + overnight. Baščaršija at dusk, Žuta Tabija sunset (~20:32), Jun-21 festivals (Garden of Dreams electronic / Hastahana). Sleep Pale (N6) — pre-positions for Day 7's early Foča/Šćepan Polje rafting drive."),

("src/data/me-user-notes.json",
 "Day 7 (Jun 22) — cross here after the Tara rafting take-out (~14:00). Depart Sarajevo 07:00 → Foča 09:00 → raft start 10:00 → border crossing ~14:00.",
 "Day 7 (Jun 22) — cross the 24/7 Šćepan Polje/Hum border after the Tara take-out. Depart Pale ~06:45 → Foča ~09:00 (allow for Foča→Hum roadworks) → raft (confirm start; agencies run ~11:30) → border early/mid afternoon."),

("src/data/me-places.json",
 "Night 7 (Jun 22) — base for the Durmitor hike day (next morning). Walk-in OK or email minakamp@gmail.com. 0.6km walk to Black Lake trailhead.",
 "Night 8 (Jun 23) — 2nd night of the 2-night Žabljak base (Durmitor hike day). Walk-in OK or email minakamp@gmail.com. 0.6km walk to the Black Lake trailhead."),

("src/data/gap-finds.json",
 "Day 8 (Jun 23) afternoon after the Veliki Međed hike — 15 km on the Šavnik road from Žabljak. Calm evening = best Durmitor reflection. Or morning of Day 9 (Jun 24) en route Žabljak → Ostrog.",
 "Day 8 (Jun 23) afternoon after the Prutaš hike — ~12 km SW of Žabljak via the M6/Šavnik road (~20 min). Calm evening = best Durmitor reflection. Or morning of Day 9 (Jun 24) en route Žabljak → Ostrog."),

("src/data/me-places.json",
 "Day 8 (Jun 23) — alternative Durmitor plateau walk if skipping Veliki Međed. Start by 07:00; no shelter on the open plateau if storms close in.",
 "Day 8 (Jun 23) — the conditions-dependent ★ Durmitor summit, NOT a casual stroll: start 06:00-06:30, off the high ground by noon (June PM storms, no shelter up top). Non-technical fallback = Planinica or the Black Lake loop; late-June snow can linger up high — check before committing."),

("src/data/me-user-notes.json",
 "Day 9 (Jun 24) — depart Žabljak 09:00, arrive ~11:00. Off-peak window is before 09:00 or after 16:00; by 11:00 it's busy but manageable. Closes 17:00 May–Sep.",
 "Day 9 (Jun 24) — depart Žabljak ~06:45-07:00, arrive Ostrog ~09:00 (cool, ahead of the pilgrim buses; off-peak = before 09:00). Real drive ~1h45-2h over a 95km mountain road. Closes 17:00 May–Sep, free."),

("src/data/me-places.json",
 "Day 9 (Jun 24) late afternoon — sunset ~20:22. Drive the wider approach road (not the forest track). Sequence: kayak morning → Virpazar fish lunch → Pavlova Strana golden hour.",
 "Day 9 (Jun 24) golden hour ~19:30-20:24 (sunset ~20:24); Rvaši bed is only ~15min away so stay for the light. Drive the WIDER approach road, not the forest track. Sequence: kayak morning → Konoba Stari Most lunch → Pavlova Strana golden hour."),

("src/data/food.json",
 "Day 9 (Jun 24) afternoon — book +382 68 509 541 or vinarijamasanovic@yahoo.com the day before. Bring cash. Sequence: kayak morning → fish lunch → winery → Pavlova Strana golden hour.",
 "Day 10 (Jun 25) late afternoon/sunset (~18:00) — book +382 68 509 541 / vinarijamasanovic@yahoo.com the day before. CASH ONLY. Sequence: Virpazar SUP/swim morning → midday warm swim → winery sunset → back to Rvaši."),

("src/data/me-user-notes.json",
 "Day 11 (Jun 26) — start the 1,200-step fortress climb at 07:30 (free before 08:00, cruise tourists arrive ~09:30). Combine with Perast + Lovćen mausoleum same day.",
 "Day 11 (Jun 26) ~17:00 — climb in the late afternoon for cooler temps + golden light; crest the first rampart by the 20:26 sunset. EUR15pp (fee ~08:00-20:00, but the trail is open 24h = no lock-in on an evening descent). Jun 26 has ZERO cruise ships, so the old town is unusually calm. Bring water + grippy shoes."),

("src/data/experiences.json",
 "Day 4 (Jun 19) — book same-day via X-Adventure Dubrovnik. Sunset tour starts ~19:00; wine + walls glowing at dusk. Book by 16:00.",
 "Day 13 (Jun 28) morning — book the X-Adventure half-day departure (08:45 or 10:45 slots, 3-4h, from EUR45pp). NOT the sunset tour (the day ends at the airport). Book same-day or by 16:00 the day before."),

("src/data/seed.json",
 "Day 12 (Jun 27 Saturday) — walls open 06:30 (€35pp); finish before cruise ships ~10:00. Car drop airport Jun 28 by 19:15 (Ref D013947246).",
 "Day 13 (Jun 28 Sunday) — go EARLY ~08:00, before the cruise crowds (Explorer of the Seas docks 10:00). City walls €40pp (incl. Lovrijenac, 2026). Protect the 18:00 Old-Town leave for the 20:40 flight; car drop airport by ~19:15 (Ref D013947246)."),

("src/data/hr-south.json",
 "\"bestTime\": \"afternoon/sunset\"",
 "\"bestTime\": \"Day 13 (Jun 28) early morning ~08:00-09:30, before the kayak. (Light is best at sunset, but D13 only has the morning window here.)\""),
]

def main():
    dry = '--dry' in sys.argv
    fail = 0
    for f, old, new in PATCHES:
        txt = open(f, encoding='utf-8').read()
        n = txt.count(old)
        if n != 1:
            print(f"  ✗ {f}: OLD string occurs {n}× (expected 1) — {old[:60]!r}")
            fail += 1
            continue
        if not dry:
            open(f, 'w', encoding='utf-8').write(txt.replace(old, new))
        print(f"  {'[DRY] ' if dry else '✓ '}{f}: {old[:48]!r} → {new[:48]!r}")
    if fail:
        print(f"\n{fail} patch(es) FAILED to match uniquely — aborting writes." if not dry else f"\n{fail} would fail.")
        sys.exit(1)
    print(f"\n{'Dry run OK' if dry else 'Applied'}: {len(PATCHES)} bestTime patches.")

if __name__ == '__main__':
    main()
