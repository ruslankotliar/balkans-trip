# Zadar Region + Northern Dalmatia — research notes (Session A)

Scope: Zadar city, Nin, Paklenica/Velebit, Zrmanja canyon, Knin, Krka, Šibenik, Vransko jezero, Dugi Otok/Kornati, campsites, Zadar nightlife/food. Data file: `src/data/hr-north.json` (27 candidates). All coordinates verified against OSM (Photon geocoder) / Wikipedia in June 2026 except where flagged below.

## The hard timing reality for this leg

We land **Zadar morning Jun 16** and must be at **Dubrovnik airport evening Jun 18** (4th-person pickup). That's ~400 km / 5–6h+ of southbound driving plus Split/Omiš/Makarska stops on the back end. Realistically this leg = **Jun 16 (afternoon) + Jun 17 (full) + Jun 18 morning**, and Jun 18 has to be a driving push south. So we have **~1.5 usable days** in the north. Everything below is filtered through "what survives 1.5 days," with generous backups for a future trip.

**This means hard choices.** You cannot do Plitvice AND Paklenica AND Krka AND an island AND Šibenik AND Zadar nightlife in 1.5 days. Pick a lane (see the two plans at the bottom).

---

## VERDICT 1 — Plitvice vs Krka (the +4:21 question)

**Recommendation: SKIP Plitvice this trip. Do Krka (or skip both for a Velebit day).**

- Drive math (from `drive-times.md`): coastal Zadar→Krka→Split = **2:12**. Adding Plitvice = **6:33**, i.e. **+4:21 of pure driving** in a 1.5-day window, plus a 4–6h visit. Plitvice is also **1.5h the WRONG way (north)** before you turn south.
- Plitvice's own entry is ~€40 in summer and it's notoriously crowded/regimented (timed boardwalks, no swimming). For an adventurous group that wants hikes, cliff-jumping and canyons, it's the wrong vibe for the cost in time.
- **Krka** is right on the southbound line, has the same turquoise-waterfall payoff, and — unlike Plitvice — has **legal swimming** at Roški slap / Stinice / Pisak (Jun 1–Sep 30). The main Skradinski buk (already pinned as `hr-krka`) is the showpiece; **swimming there has been banned since 1 Jan 2021**.
- **Krka crowd tip:** be first at opening or arrive after 16:00 (≈25% cheaper too) — day-trippers swamp Skradinski buk mid-morning. Base in **Skradin** (or Camp Skradin) to be first in via the included NP boat. Car-based and time-pressed? Use the **Lozovac** upper entrance (free parking, walk/shuttle straight to the top of the falls); **Skradin** (lower) is the nicer experience + base but uses the boat.
- **Honest caveat on Krka itself:** opinions split on the €40 ticket for a fairly short boardwalk. If the group would rather spend the day moving (kayaking Zrmanja, hiking Paklenica), it's defensible to **skip both NPs** and just do a Velebit day → coast.

**Plitvice stays as `candidate` in seed.json — flag it "only if we sacrifice the Velebit day and accept the +4:21 detour." My vote: no.**

---

## VERDICT 2 — Inland (Knin/Zrmanja) vs coastal (Krka) to Split

It's a real trade-off and **for this group the inland detour can be worth it — but only if you "spend" it on the stops, not just the drive.**

- Coastal via Krka = ~2:12; inland via Knin = **+~1:28** (≈3:40 total).
- Travelers describe the inland route as feeling "like a different country — lush green rolling hills," a quiet antidote to the packed coast. But **the road alone is not a must-see** — the payoff is the cluster it unlocks in one line:
  **Tulove grede → Pariževačka glavica (Zrmanja viewpoint) → (Cerovac caves) → Knin fortress.** Knin in particular is repeatedly called a "highlight" and "a real shame to miss."
- **Decision rule:** if you do Zrmanja kayaking and/or Tulove grede as your active day, route Zadar→Split **inland** and pick up Knin fortress + the Zrmanja viewpoint en route — excellent, avoids motorway monotony. If you're skipping those stops, take the **coast via Krka** — the inland road by itself isn't worth +1.5h.
- Note: the deep-Velebit highlights (**Premužić trail, Vaganski vrh/Sveto brdo**) do NOT fit this trip — see "tabled" below.

---

## VERDICT 3 — Can an island day (Dugi Otok / Kornati) fit? NO. Keep as labeled backup.

I pulled the **official Jadrolinija line-434 timetable**; the trip's window (Jun 16 Tue / Jun 17 Wed) is in the 30.05–26.06 schedule.

### Zadar → Brbinj CAR ferry (the only way to bring the rental car)
- **Departs Zadar (Gaženica port, ~3–4 km SE of old town): 06:00, 12:00, 17:00** (Tue/Wed).
- **Returns from Brbinj: 10:00, 14:00, 20:30** (Tue/Wed).
- **Crossing: 1h40.** Price: car ≤5m **€25.86** + adult **€5.84** → 1 car + 4 adults ≈ **€49 each way (~€98–100 round trip)**.
- On-island: **Brbinj → Sakarun ≈ 15 km / ~15–20 min**; Brbinj → Telašćica (Sali end) ~25–30 km.
- The Zadar→Sali/Zaglav and Zadar→Božava catamarans are **foot-passenger only** (no car; island taxis €35–45 each way).

**Why it doesn't fit:** to bring the car you'd take the 06:00 out and 14:00 back = a committed **~10h day** for one beach. They arrive *morning of the 16th* (can't make the 06:00 that day), and the 17th is the single buffer day before the southbound push. Burning it on a Dugi Otok return run kills Velebit + Krka.

### Kornati NP — definitively does not fit
- **No car access.** It's an **8–10h organized boat excursion** (from Zadar/Murter/Biograd/Sali), ~08:00–18:00, **~€60–90pp** + ~€16pp park fee (often not included). Eats a whole day they don't have, and doesn't align with arrival on the 16th.

**Recommendation:** mark Dugi Otok (Sakarun, Veli Rat) and Kornati as **backup — "island day only if we sacrifice the mountains."** Save turquoise-island cravings for the **post-pickup Mljet/Korčula block** near Dubrovnik (already in the plan). If someone is desperate for Sakarun, the only way is a dawn raid off the 06:00 ferry on Jun 17 — and only if they accept losing Velebit/Krka that day.

> Dugi Otok backups not pinned (in case the group flips the plan): **Veli Rat lighthouse** (44.15203, 14.82024, tallest on the Adriatic, quiet sandy coves nearby) and **Camp Mandarino** near Soline (modern, watersports hire) as an island base.

---

## Campsite comparison (Zadar region) — full table

Pinned 4 in the JSON; the rest are here. Prices = rough mid-June for 4 adults + tent(s) + car/night; "verify" = coordinate or price not pinned to a source.

| Camp | Area | Est. price (4+tent+car) | Showers/facilities | View / vibe | Source / note |
|---|---|---|---|---|---|
| **Camping Pinus** ★pinned | Starigrad / Paklenica | ~€45–50 | hot showers, WiFi, laundry, pine shade, private beach | sea + mountain; small, tents | park4night 4.52/5 — **flagged "temp. closed," verify open Jun 2026** |
| **Camp "NP" Paklenica** ★pinned | Starigrad / Paklenica | ~€50+ | hot showers, power, water, WiFi, direct beach | right on the sea; hiking base | park4night 4.12/5 |
| **Camping Šimuni** ★pinned | Pag island (~1h) | ~€40–55 | 6 sanitary blocks, family bathrooms, laundry, shop/rest. | 4km sandy/pebble beach; big & lively | park4night |
| **Camp Skradin** ★pinned | Skradin / Krka | ~€35–40 | hot showers, power, WiFi, vine shade | farm, quiet; Krka base | park4night 10789 |
| Camping Paklenica (Bluesun) | Starigrad seafront | from ~€26 (≈€24/night reported for a tent) | 2 shower blocks, pool, seafront | bigger resort camp; "best value of the 3 we tried" | TripAdvisor — coord ~44.296, 15.452 *verify* |
| Autocamp Marko | Starigrad (toward NP) | budget ("very reasonable") | clean toilets/showers, guest kitchen, ~200m to beach | small family-run, cheap | TripAdvisor — coord ~44.296, 15.440 *verify* |
| Camp Skradinske Delicije | Skradin/Lozovac | ~€40 | new hot showers, power, kitchen, laundry, whirlpool | closest to Krka Skradin boat entrance | park4night 23403 — coord ~43.820, 15.923 *verify* |
| Falkensteiner Camp Borik | Zadar city (3km N) | ~€55–65 (tent pitch alone up to €41) | hot showers, 3 pools, spa/gym, beach | convenient for city; **hard/gravel ground for pegs** | TripAdvisor — coord ~44.128, 15.215 *verify* |
| Zaton Holiday Resort | Zaton/Nin | €50+ (premium) | 9 pools + waterpark, restaurants/bars, beach | huge, family, NOT quiet; late-night noise | pincamp — coord ~44.227, 15.165 *verify* |
| Camp Mandarino | Dugi Otok (Soline) | mid (limited reviews) | modern blocks, private bathrooms, watersports hire | island; near NW beaches | only if islands happen — coord ~44.138, 14.843 *verify* |

**Best fits for this group:** **Camp NP Paklenica or Camping Pinus** for a mountain+sea Velebit night (Pinus needs an open-status check); **Camp Skradin** if basing for an early Krka morning; **Šimuni** if they want a sandy-beach lively night on Pag.

---

## Paklenica / Velebit — what's in vs tabled

**Pinned (fit the trip):** Velika Paklenica gorge hike, Anića kuk summit scramble, Modrič adventure cave, Zrmanja kayaking, Tulove grede, Zrmanja viewpoint, Knin fortress. Paklenica is only **~54min from Zadar** = an easy half/full day; gorge walk + Anića kuk (or Modrič cave) is a perfect adventurous day from a Zadar/Starigrad base.

**Tabled (great, but don't fit the 1.5 days / wrong geography):**
- **Vaganski vrh (1757m) & Sveto brdo (1751m)** — highest Velebit. "A long and difficult one-day task even for long summer days"; sane version needs a night at the Struge shelter. Anića kuk delivers ~80% of the views for a fraction of the effort. *Save for a dedicated Velebit trip.*
- **Premužić trail (Premužićeva staza)** — legendary 57km drystone ridge trail, but in **Northern Velebit ~2h+ north of Zadar** (wrong direction); it's a 3–4 day hut-to-hut trek. Does NOT fit.
- **Mala Paklenica** — the wild twin canyon. "For experienced hikers only! It's not only steep, it's technical, too." A full hard day with less classic scenery than Velika; only if the group specifically wants solitude over the famous gorge.
- **Manita peć** (Paklenica show cave) — only open **Mon/Wed/Sat 10:00–13:00** in June, cash only, +~3h on a gorge hike. Awkward to time; do Modrič instead (better adventure, fewer date constraints). Coord 44.3143, 15.4750.
- **Cerovac caves** (44.2748, 15.8827) — Croatia's longest show-cave complex, ~25km off the A1 near Gračac; great if doing the inland route with time, ~€11–15 for both caves, open Apr–Sep. A natural inland add-on between Tulove grede and the motorway.

---

## Krka / Šibenik / Vransko — tabled extras (not pinned)

- **Visovac** (43.86111, 15.97333) — Franciscan monastery island, only reachable on the extra-cost Krka boat (~€15–20pp on top of entry). Lovely but the stop is rushed ("30 minutes is impossible and frustrating"). Take the earliest boat or skip.
- **St Michael's Fortress, Šibenik** (43.7377, 15.8896) — hilltop fort turned **1,077-seat open-air concert amphitheatre**. If a June concert is on, that's the standout evening; otherwise Barone has the better view. Combo ticket covers both.
- **St Nicholas Fortress, Šibenik** (43.7215, 15.8547, UNESCO sea-fort) — **skippable**: ~€22 boat tour for a semi-ruin; view it free from the St Anthony's Channel walking/bike path instead.
- **Banj beach, Šibenik** (~43.7355, 15.9015 *verify*) — city pebble beach with the postcard old-town view; fine for a quick swim. Clearer water at Solaris/Zlarin/Krapanj (Krapanj singled out for snorkeling).
- **Lake Vrana itself** (43.89389, 15.57583) — Croatia's largest lake, but a **birding + cycling** flatland, not a scenic swim in June (shallow, reedy, buggy). **Keep the Kamenjak viewpoint, drop the lake.**
- **Lake Prokljan** (~43.78, 15.88 *verify the Bilice/Raslina shore*) — the locals' answer to "where do I actually swim near Krka": brackish lake between Skradin and Šibenik, uncrowded, base in Bilice/Raslina. Good off-beat swim if staying around Krka.
- **Bribirska glavica** (~43.88, 15.80 *verify*) — "Croatian Troy," 300m hilltop archaeology with a 360° view, "visited by maybe 100 people a year." Atmospheric but minimal signage/often-closed museum; for the view/solitude only.

---

## Zadar city — tabled food/nightlife/sights (not pinned)

- **Svarog Bar** (44.11237, 15.22849, Five Wells Sq) — the most "club" central option, dances late, Thu Latin nights. Young crowd but mixed reviews ("mostly very young guys... zero manners," pricey cocktails). 3rd nightlife option if the group wants to actually dance.
- **Solana Nin** (44.2398, 15.19147) — 1,500-yr-old working salt pans + "Salt House" museum and flower-of-salt shop; a cheap, shaded ~45-min stop on the Nin loop. Tours mornings Mon–Fri. Nice add-on to the Nin cluster if there's time.
- **Kolovare beach** (44.10774, 15.23111) — Zadar's walkable city pebble beach; convenient ("after dinner swim"), not a destination ("Very rocky," "no sand," crowded in peak).
- **Maraschino (Maraska)** — Zadar's signature cherry liqueur (made here since 1759); buy a bottle in any old-town shop (~€10–15). A "buy, don't detour" souvenir/nightcap, not a sight.

**Festival check:** the famous **Garden festivals are at Tisno** (~40min SE), NOT Zadar city. For 2026, **Suncebeat moved to Portugal (Jun 18–22)** and **Love International runs Jul 8–14** — **nothing overlaps the Jun 16–18 window.** So Zadar nightlife = the in-town bars (Garden Lounge, Ledana, Svarog).

---

## Two concrete 1.5-day plans for the group to pick from

**Plan M — "Mountains & adventure" (matches the user's sketch's northern loop):**
- *Jun 16 PM:* land Zadar, grab the car. Drive to Starigrad (~54min), camp at **Camp NP Paklenica**. Evening swim + dinner. (Optional: quick Zadar Sea Organ sunset before driving up.)
- *Jun 17:* morning **Velika Paklenica gorge + Anića kuk** (or **Modrič cave**), OR a full-day **Zrmanja kayaking** out of Obrovac. Then route **inland**: **Tulove grede → Zrmanja viewpoint → Knin fortress** → toward Split. Night Split/Omiš.
- *Jun 18:* Omiš/Makarska (Punta Rata swim) → Dubrovnik → **airport pickup**.
- *Trades away:* Krka, islands, much of Zadar city.

**Plan C — "Coast & classics":**
- *Jun 16 PM:* Zadar old town (Sea Organ sunset), dinner at **Pet Bunara** / **Bruschetta**, drinks at **The Garden Lounge** or **Ledana**. Camp near Zadar/Nin or a Krka base.
- *Jun 17:* **Krka NP** at opening from Skradin (swim at Roški slap), → **Šibenik** (St James cathedral + **Barone Fortress** sunset). Night Split/Omiš.
- *Jun 18:* Split (Diocletian's) → Omiš → Makarska → Dubrovnik → **airport pickup**.
- *Trades away:* Velebit/Paklenica, Zrmanja, Knin.

**Hybrid is possible** (Paklenica half-day on the 16th PM, Krka morning on the 17th, then push south) but it's a fast 1.5 days — accept that something gets cut. Zadar nightlife realistically only happens if you sleep near Zadar on the 16th.

---

## Coordinate confidence

- **High (OSM/Wikipedia/park4night-pinned):** all Zadar venues, Nin/Kraljičina/Sabunike/Punta Bajlo, Paklenica entrance & Anića kuk, Modrič, Tulove grede, Zrmanja viewpoint, Knin fortress, Roški slap, Skradin, St James cathedral, Barone, Sakarun, Camps Šimuni / NP Paklenica / Skradin.
- **Medium (sensible centroid / single source — sanity-check before booking):** Zrmanja kayaking pin = **Obrovac town** (the outfitter base; actual put-in Kaštel Žegarski / take-out Muškovci — confirm meeting point with the operator); **Kamenjak viewpoint** (43.8942, 15.6105 — two GPS sources agreed but Photon couldn't confirm; the Vrana NP Kamenjak point near Radašinovci); **Camping Pinus** (44.3225, 15.392 — and confirm it's open); **Šibenik old town** (square centroid).
