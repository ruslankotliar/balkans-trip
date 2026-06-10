# Hikes — research notes (ranked, conditions, gear)

Researched for **4 fit-but-not-alpinist young adults, full camping gear, June 16–28 2026**, one member **dislikes exposure** (flagged per hike). Sources = AllTrails/Komoot/Wikiloc/SummitPost/Outdooractive reviews + GPX, r/hiking & country subreddits, hiker blogs (The Sandy Feet, budgetbucketlist, etc.), park sites for fees/conditions. Coordinates cross-checked on OSM/Nominatim + a second source.

**16 NEW pins written to `src/data/hikes.json`.** Several headline hikes (Maglić, Trnovačko, Perućica, Bobotov Kuk, Prutaš, Ćurevac, Sedlo, Ice Cave, Ladder of Kotor, Anića kuk, Velika Paklenica) **already exist as pins from parallel sessions** — I did NOT duplicate them; the deep hiking detail for those is in the "Overlaps with existing pins" section below, cross-referenced by id.

---

## TL;DR ranking for THIS group

### 🥇 Top 3 must-do (the hiking heart of the trip)
1. **Durmitor double-day from Žabljak** — the scramblers do **Veliki Međed** (`me-veliki-medjed`, the group's own planned route) *or* **Bobotov Kuk** (`me-durmitor-bobotov-kuk`, if late-June snow has cleared — ask the Sedlo warden); the **exposure-averse member does Planinica** (`me-planinica`, best view in the park, zero scrambling) — all from the same Black Lake start, reconvene at the lake. One trailhead keeps everyone happy.
2. **Trnovačko jezero** (`ba-trnovacko-jezero`, existing pin) — the heart-shaped glacial lake in Sutjeska, easy-moderate, **no exposure, swim + wild-camp**, with a quirky on-foot border into Montenegro. The one big-nature hike the *whole* group (incl. heights-averse member) can do together, and it's also Maglić's built-in bail-out.
3. **Maglić** (`ba-maglic`, existing pin) for the three who'll scramble — Bosnia's highest (2386m), cabled via-ferrata face; the fourth does Trnovačko the same morning from the **same Prijevor trailhead**. So #2 + #3 are really one Sutjeska day, split by appetite for exposure.

> Net: a **Sutjeska day** (Maglić/Trnovačko split) + a **Durmitor double-day** (Međed-or-Bobotov / Planinica split) are the two anchors. Everything else is optional seasoning.

### 🥈 Solid alternates (add per energy / route)
- **Biokovo — Vošac on foot** (`hr-biokovo-vosac`) — the "real" coast hike, half-day, iconic Riviera view; DRIVE Sveti Jure rather than slog the plateau. (Days 1–3.)
- **Škrčka jezera overnight** (`me-skrcka-jezera`) — lakeside camp + spring water; perfect if you give Durmitor a 3rd day.
- **Kom Vasojevićki** (`me-komovi-vasojevicki-kom`) — the group's backup wish; gorgeous but far-east + rough access road eats a day.
- **Vaganski vrh** (`hr-vaganski-vrh`) — Velebit's roof, big stamina day; only if you spend a Velebit day pre-pickup.
- **Savin Kuk** (`me-savin-kuk-hike`) — easiest high Durmitor summit, spring water; lift status uncertain (hike it).
- **Čvrsnica — Hajdučka vrata** (`ba-cvrsnica-hajducka-vrata`) — striking rock arch on the Mostar→Konjic corridor.
- **Sveti Ilija, Pelješac** (`hr-sveti-ilija-peljesac`) — island-panorama summit during the post-pickup Pelješac/Korčula block.
- **Štirovnik, Lovćen** (`me-lovcen-stirovnik-hike`) — easy half-day, broader view than the mausoleum, few people.

### ⏱️ Short & sweet (≤2–2.5h, for transit days)
- **Tulove grede** (`hr-tulove-grede-hike`) — 1.5–2.5h surreal scramble, an easy inland detour on a Zadar→Split mountain routing (heights-averse member can stop below the summit block).
- **Ćurevac viewpoint** (`me-durmitor-curevac`, existing) — 30–45 min Tara-canyon rim.
- **Perućica / Skakavac Vidikovac** (`ba-perucica`, existing) — ~20 min roadside stop *on the way* to Prijevor; free, no effort.
- **Ladder of Kotor + San Giovanni** (`me-kotor-fortress-free-ladder` / `me-kotor-fortress-paid`, existing) — 1.5–2.5h, **start ≤7:30am** (heat).
- **Premužić sample** (`hr-premuzic-trail`) — Zavižan→Rossi's shelter & back, 2–3h each way (only if going north for Plitvice).

### 🌧️ Bad-weather / rest-day / "we're tired" substitutes
- **Zelengora lakes** (`ba-zelengora-lakes`) — gentle meadow-and-lake walking (needs a dry day for the 4x4 road).
- **Black Lake loop** (`me-durmitor-black-lake`, existing) — flat 3.6km lake circuit, family-easy.
- **Trnovačko** still works in light weather (forgiving terrain), unlike the scrambles.
- **Any of the exposed summits → NO-GO in rain/wind**: Maglić, Veliki Međed, Bobotov Kuk, Prutaš, Prenj. Wet rock + cables + drop-offs = the real danger on this trip, more than snow.

### ⛔ Hard NOs for the exposure-averse member (give them the alternate)
Maglić direct face → do **Trnovačko**. Veliki Međed spine / Bobotov Kuk cabled summit / Prutaš ridge → do **Planinica** or **Black Lake/Škrka lakes**. Prenj summit pitch. **Anića kuk** (`hr-anica-kuk`) cabled scramble. Tulove grede *summit block only* (the approach is fine). Savin Kuk **Sljeme-loop** variant only (the normal out-and-back is fine).

---

## Master table (new pins + enriched existing)

| Hike | Country | Time RT | Gain | Difficulty + exposure | June status | In data as | ★ |
|---|---|---|---|---|---|---|---|
| Veliki Međed | ME | 6–7.5h | ~900–960m | Hard; UIAA-I scramble, cables, exposed spine — **NO for heights-averse** | Melts early; risk = wet/wind not snow | `me-veliki-medjed` (NEW) | 5 |
| Bobotov Kuk | ME | 5–6h (Sedlo) | ~850–940m | Hard; airy cabled summit ledge — **NO for heights-averse** | **Snow gate**: early-June ~60% snow; end-June usually OK, carry microspikes, ask warden | `me-durmitor-bobotov-kuk` (exists) | 5 |
| Planinica | ME | 7.5–8h | ~950m | Moderate, **non-technical, no exposure** — best for heights-averse | Melts early; no snow issue | `me-planinica` (NEW) | 5 |
| Maglić | BA | 4–6h (direct) | ~700m | Hard; via-ferrata cable crux, serious exposure — **NO for heights-averse** | Usually clear above 2300m by mid-June; fog risk | `ba-maglic` (exists) | 5 |
| Trnovačko jezero | BA | ~5h | ~500m | Easy–moderate, **no exposure**; on-foot border | Hikeable; swim cold-but-possible | `ba-trnovacko-jezero` (exists) | 5 |
| Premužić trail (sample) | HR | 4–6h | ~600m | Easy-moderate engineered, **no exposure** | Ideal; windy | `hr-premuzic-trail` (NEW) | 5 |
| Biokovo Vošac (foot) | HR | 5–6h (+SvJure 9–11h) | ~1150m | Hard; drop-off exposure, no scramble; **no water, heat** | Open; brutal heat — dawn start | `hr-biokovo-vosac` (NEW) | 4 |
| Škrčka jezera | ME | 6–7h | ~836m | Moderate, non-exposed to lakes; **camp + swim** | Lakes melt early; passes hold snow | `me-skrcka-jezera` (NEW) | 4 |
| Kom Vasojevićki | ME | ~5h (+4h drive) | ~765m | Moderate + **one short exposed move**; rough access road | Possible patches near 2400m early/mid-June | `me-komovi-vasojevicki-kom` (NEW) | 4 |
| Vaganski vrh | HR | 9–11h | ~1500m | Hard stamina; **no scramble exposure**; carry water | Cool shaded gorge; minor summit snow | `hr-vaganski-vrh` (NEW) | 3 |
| Savin Kuk | ME | 5.5–6.5h (foot) | ~900–1000m | Moderate (normal route, no exposure); windiest peak | Normal route snow-free in summer | `me-savin-kuk-hike` (NEW) | 4 |
| Tulove grede | HR | 1.5–2.5h | ~260m | Moderate hike + **scramble/cable summit block**; mines off-trail | Open; vipers | `hr-tulove-grede-hike` (NEW) | 4 |
| Čvrsnica/Hajdučka vrata | BA | 7–8h | ~700m | Medium; arch at 2000m | Jun–Sep; cool plateau | `ba-cvrsnica-hajducka-vrata` (NEW) | 4 |
| Sveti Ilija (Pelješac) | HR | 5–7h | 700–1080m | Moderate, non-technical; hot, low shade | Hot June rock — dawn/late | `hr-sveti-ilija-peljesac` (NEW) | 4 |
| Prutaš | ME | ~4h (peak) | ~719m | Hard; airy secured ridge — **NO for heights-averse** | Go dry only; snowdrift patches | `me-durmitor-prutas` (exists) | 4 |
| Zelengora lakes | BA | half–full day | low | Easy, no exposure; **4x4 access** | Lush, flowers; dry road needed | `ba-zelengora-lakes` (NEW) | 4 |
| Štirovnik (Lovćen) | ME | 3–4h | ~360–400m | Easy-moderate, no exposure | Snow-free; little shade | `me-lovcen-stirovnik-hike` (NEW) | 4 |
| Prenj — Zelena Glava | BA | full day | ~750m+ | Hard; via-ferrata, no water, fog/nav, guide — **NO for heights-averse** | Late-June clears | `ba-prenj-zelena-glava` (NEW) | 4 |
| Perućica/Skakavac (Vidikovac) | BA | 20 min / 2.5h forest | ~330m forest | Viewpoint trivial; forest guide-only (16/day) | Strong falls in June | `ba-perucica` (exists) | 4 |
| Ladder of Kotor / fortress | ME | 1.5–2.5h | ~260m | Moderate steps; some exposure on free Ladder | **Heat gate** — go ≤7:30am | `me-kotor-fortress-free-ladder` (exists) | 4 |
| Anića kuk | HR | half day | ~700m | **Cabled scramble, head-for-heights — NO for heights-averse** | Open; hot rock | `hr-anica-kuk` (exists) | 4 |
| Velika Paklenica gorge | HR | 4–5h | ~400m | Easy, family-friendly | Cool, shaded; crowded mid-AM | `hr-velika-paklenica-gorge` (exists) | 4 |
| Bjelašnica summit | BA | 3–4h | ~400m | Easy, no exposure, paved access | Fine | `ba-bjelasnica-summit-babindo` (NEW) | 3 |
| Rumija | ME | ~8h | ~1540m | Long, non-technical, hot; poorly marked (GPX) | **Sea-level heat** — dawn only | `me-rumija-summit` (NEW) | 3 |
| Durmitor Ice Cave | ME | ~6h | — | Approach moderate; **icy entrance ramp — crampons** | Trail melts late-June; ramp icy yr-round | `me-durmitor-ice-cave` (exists) | 3 |
| Ćurevac viewpoint | ME | 30–45 min | minimal | Easy rim walk (don't approach edge) | Open | `me-durmitor-curevac` (exists) | 4 |

---

## Overlaps with existing pins — deep hiking detail (researched, NOT duplicated)

These hikes already have map pins from other sessions; here's the serious hiker's detail to fold into trip decisions.

### Sutjeska NP (Bosnia) — `ba-maglic`, `ba-trnovacko-jezero`, `ba-perucica`, `ba-prijevor`
- **Maglić (2386m)** — trailhead **Prijevor saddle 43.2865, 18.7195** (triangulated OSM/outdooractive; summit 43.2811, 18.7329). Direct NW-face "Alpine Route": ~2–2.5km / ~700m / 1.5–3h up, but **a fixed-cable/via-ferrata scramble on loose, exposed rock.** Honest quotes: *"climbing with hand and feet, sliding past steep rocks along crackling cables… pretty hardcore"*; *"if you're not unfamiliar with vertigo or doubt your fitness, this is definitely a big no-go"*; a 2025 climber: *"slipping down would mean going down several hundred meters… rocks that looked like solid handles were breaking in our hands."* One guide warns the cable anchors *"have not been maintained for a very long time."* **Alternate for the heights-averse member: the gentler Lake Route via Trnovačko** ("more gradual and bearable") — classic combo is up the Alpine route, down the lake side. Summit straddles the BA/ME border (bring passport). June: usually clear above 2300m, but *Maglić = "misty"* — fog descends fast.
- **Trnovačko jezero (1517m)** — same Prijevor trailhead, **~5km/2–2.5h one way, moderate, NO exposure.** Border quirk **confirmed**: the lake is physically in Montenegro (Nominatim display name "Opština Plužine, Crna Gora") though accessed from Sutjeska; you walk across an unmanned line (*"a dead tree"… "without border control, without a passport"* — carry ID anyway). **Wild camping + swimming** normal on the meadows (June cold but "possible for the brave"); seasonal café/cottage. Gotcha: *"thousands of mosquitoes."* This is the group's best plan-B and the heights-averse member's Maglić-day hike.
- **Perućica + Skakavac (75m)** — **Vidikovac viewpoint at Dragoš sedlo 43.3147, 18.6741** is a ~100m stroll from a car park you pass *en route to Prijevor* — free, effortless, do it. Entering the primeval forest itself is **guide-only, 16 people/day** (book via park) — ~3.5km/2–2.5h. NOT the same as the Sarajevo Skakavac (`ba-skakavac-waterfall`, 43.9486, 18.4489).
- **Road to Prijevor reality:** ~20km dirt, 1–1.5h; *"barely manageable with a normal car if careful — dry = OK, wet = need 4x4."* Marginal for a standard rental; consider a 4x4 transfer from Tjentište in the wet. Park entry ~10 KM (~€5) pp + ~5 KM/car/day.

### Durmitor (Montenegro) — `me-durmitor-bobotov-kuk`, `me-durmitor-prutas`, `me-durmitor-curevac`, `me-durmitor-sedlo-pass`, `me-durmitor-ice-cave`, `me-durmitor-black-lake`
- **Bobotov Kuk (2523m)** — the **June snow gate**, dated reports: *"early June ~60% of the trail still snow"*; June 6 2018 *"so much snow… descent a horror movie… should be closed until July"*; a June-7 group *"only made it to a lake ~1km from the peak."* Consensus: **attempt end-June onward.** Your ~Jun 24–26 window is the sweet spot — **likely passable, carry microspikes as insurance, ask the Sedlo warden the morning of**; crampons/ice-axe only after a cold late spring. Start from **Sedlo (43.09852, 19.05054)** — melts first, avoids the long snowy Black-Lake side. Summit is genuinely airy: *"a very narrow ledge, at points barely a boot's width wide."* **Pick ONE big exposed day: Bobotov Kuk OR Veliki Međed.**
- **Prutaš (2393m)** — trailhead Dobri Do off P14; ~8km/719m/4h. *"Airy, rugged secured path… the sheer fall to the north drops all the way down the mountain… sections with ropes."* Hiked in June with only *"snowdrift patches near the summit, not impassable"* — **go dry only** (steep descent to Škrčko gets "impossibly slippery" wet). **NO for heights-averse.**
- **Ćurevac** — no real closure evidence; easy ~30–45 min rim walk. **DATA FIX: existing pin longitude is ~0.5km too far west — should be 43.20146, 19.09306 (currently 43.2009, 19.0837).**
- **Sedlo pass** — confirmed 43.09852, 19.05054; ~1907m, free car park, warden collects €5 NP fee; best Bobotov launch and access to Prutaš/Škrka (Dobri Do).
- **Ice Cave (Ledena Pećina)** — June approach trail melting, but the **cave-entrance ramp is firm snow/ice year-round** (*"~40m snow-ice ramp… highly recommended to use crampons"*) — bring microspikes + headlamp + gloves; heights-averse member should skip the icy descent into the chamber.
- **Black Lake (`me-durmitor-black-lake`)** — this pin is the **lake/trailhead hub** (flat 3.6km loop, family-easy), NOT the Veliki Međed summit. It's the start for Veliki Međed, Planinica and the on-foot Savin Kuk.

### Croatia — `hr-anica-kuk`, `hr-velika-paklenica-gorge`, `hr-sveti-jure`, `hr-tulove-grede`
- **Anića kuk (`hr-anica-kuk`)** — non-climbers reach the top by a steep marked route (Vlaški put up / Đuzin silaz down) **partly equipped with steel cables — "a via-ferrata-style wire cable dropping several metres down a nearly sheer wall."** *"You need a head for heights and probably some scrambling experience."* **Hard NO for the heights-averse member** (others can do it while that member walks the gorge floor).
- **Velika Paklenica gorge (`hr-velika-paklenica-gorge`)** — family-easy to the dom (~10km RT, 4–5h), shaded/cool. **Fee: existing pin says "~€10"; 2026 high-season adult reported €8 — treat as €8–10, verify on arrival.** Upper car park fills on summer mornings — go early.
- **Sveti Jure (`hr-sveti-jure`)** — this is the **summit viewpoint**; the on-foot ascent is covered by the new `hr-biokovo-vosac` entry. Verdict: **drive it** (toll road `hr-biokovo-tollroad`), hike Vošac.
- **Tulove grede (`hr-tulove-grede`)** — existing *viewpoint* pin sits at the rocks (44.26351, 15.65560); my new `hr-tulove-grede-hike` pin marks the **roadside trailhead/parking** on the Majstorska cesta (medium-confidence layby — multiple exist; the rocks coord is certain).

### Montenegro coast/east — `me-kotor-fortress-free-ladder`, `me-kotor-fortress-paid`, `me-orjen-subra`, `me-komovi`
- **Ladder of Kotor + San Giovanni (`me-kotor-fortress-free-ladder` / `me-kotor-fortress-paid`)** — ~1350 steps, ~260m, 1.5–2.5h. **June heat is the headline** (2025 quotes: *"35°… do not try it in the midday sun"*; *"+40°, bordering on fainting"*). **Start ~7–7:30am**: shade until ~8:15, no ticket-seller yet (free before the booth is staffed; official fee €15 pp high season), no crowds. The **free Ladder of Kotor** trailhead is more precisely **42.42721, 18.77336** on Tabačina road (existing pin ~42.42917, 18.7703). Bring ≥1.5L water.
- **Orjen — Subra (`me-orjen-subra`)** — Subra 1679m, "moderate II," ~2h20 ascent from the **Za Vratlom hut** (~1160m; the hut is the trailhead/base, open year-round ~€10–12 pp/night, dinner ~€14). Karst plateau is slow going; avoid in rain (sliding + thunderstorm exposure). The hut makes a full-moon-sunrise plan feasible (sleep there, pre-dawn ascent).
- **Komovi (`me-komovi`)** — existing pin (42.6622, 19.6433, status backup) is generic and **~6km off the real trailhead.** My new `me-komovi-vasojevicki-kom` uses the OSM-verified **Eko Katun Štavna trailhead 42.71229, 19.6829.** You may want to **reject/merge the old `me-komovi`** to avoid two Komovi pins.

---

## June conditions & snow summary
- **Real snow gates at our late-June dates: only the 2400m+ exposed peaks** — **Bobotov Kuk** (carry microspikes, ask the warden) and the **Ice Cave entrance ramp** (crampons). Possible lingering patches near **Kom Vasojevićki** (2400m) after a snowy winter.
- **Everything else is snow-fine by late June.** Veliki Međed/Planinica/Savin-Kuk-normal/Škrka lakes melt out earlier — their risk is **wet/wind on exposed terrain, not snow.**
- **Velebit (HR):** June is the recommended window; isolated patches only near the highest summits.
- **Heat, not snow, is the coast's enemy:** Biokovo, Sveti Ilija, Rumija, the Kotor Ladder — all south-facing/low — demand **dawn starts** in June; midday on bare rock is genuinely dangerous.
- **Wet rock = the trip's biggest hazard.** Maglić, Veliki Međed, Bobotov Kuk, Prutaš, Prenj all become no-go in rain/strong wind regardless of season.

## Gear implications
- **Microspikes** (cheap, light): pack a pair *each* for the late-June Bobotov Kuk attempt and the Ice Cave ramp. Skip full crampons/ice-axe unless the warden reports big firm fields.
- **Helmet** recommended on Maglić's loose cabled face (park signage says so); useful on Veliki Međed too.
- **Water capacity 2–3L pp** for the dry hikes — **Biokovo (none on route), Prenj (notoriously dry, 3–4L pp), Vaganski vrh above the dom, Rumija, Štirovnik ridge.** Good water on Savin Kuk (Savina Voda spring) and Škrka (hut spring).
- **GPX/offline maps** essential on **Rumija** (poorly marked), **Prenj** (fog "labyrinth"), and any Zelengora off-trail.
- **Windproof layer** even in summer for Velebit/Premužić (coldest, windiest in Croatia) and Savin Kuk (windiest in Durmitor).
- **Car reality:** several trailheads are rough — **4x4 advisable/required** for Zelengora, Prenj-Tisovica, Prijevor-when-wet; **slow-but-doable in a 2WD** for Komovi-Štavna and Tulove-grede gravel. Plan operator 4x4 transfers where noted.
- **Stay on marked trails** — UXO risk off-trail around Tulove grede/Mali Alan and remote Prenj.

## Per-hike "skip if" (quick reference)
- **Veliki Međed / Bobotov Kuk / Prutaš / Maglić / Prenj:** skip in rain or strong wind; skip for the heights-averse member (give them the alternate).
- **Bobotov Kuk:** also skip if the warden reports big snowfields and nobody has microspikes.
- **Biokovo Vošac / Sveti Ilija / Rumija / Kotor Ladder:** skip if nobody will start at dawn on a hot day.
- **Premužić:** skip unless Plitvice is also a "yes" (northern detour).
- **Vaganski vrh:** skip if you only have a half-day around Zadar or it's a hot clear forecast (10h waterless grind).
- **Kom Vasojevićki / Rumija:** skip if the schedule's tight — both are far off the loop and eat a full day.
- **Zelengora:** skip if the 4x4 road is wet and you've no off-road car.
- **Tulove grede summit block:** the heights-averse member skips the top (approach is fine).

---

## ⚠️ Data issues flagged for you (in OTHER sessions' files — I didn't edit them)
1. **`me-durmitor-curevac`** longitude is ~0.5km too far west → should be **43.20146, 19.09306** (currently 43.2009, 19.0837).
2. **`me-komovi`** (me-user-notes.json) pin is ~6km off the real Komovi trailhead — consider rejecting/merging it in favour of the new `me-komovi-vasojevicki-kom`.
3. **`me-lovcen-njegos-mausoleum`** cost "~€3pp" looks outdated — 2025 sources cite **~€8 pp** for the mausoleum/Jezerski deck.
4. **`hr-velika-paklenica-gorge`** fee "~€10" — 2026 high-season adult reported **€8**; treat as €8–10.
5. **`me-kotor-fortress-free-ladder`** trailhead more precisely **42.42721, 18.77336** (currently ~42.42917, 18.7703).
6. **Cross-session ID collision:** `me-debeli-brijeg-border` exists in BOTH `logistics-places.json` and `me-places.json` (first-loaded wins) — dedupe whichever is stale.

---

## Coordinate fixes applied (2026-06-10)

Lat/lng-only corrections applied to `src/data/*.json` per the flags above; each coordinate re-verified against OSM/Nominatim before editing. No other fields touched.

| id | file | old (lat, lng) | new (lat, lng) | source / verification |
|---|---|---|---|---|
| `me-durmitor-curevac` | `src/data/me-places.json` | 43.2009, 19.0837 | 43.20146, 19.09306 | Data-issue #1 above; Nominatim/OSM node 1730591485 "Ćurevac" peak at 43.2014603, 19.0930599 — exact match |
| `me-kotor-fortress-free-ladder` | `src/data/me-places.json` | 42.42917, 18.7703 | 42.42721, 18.77336 | Data-issue #5 above (verified trailhead preferred); Nominatim reverse = Tabačina, Dobrota; OSM footway 927149300 + Škurda bridge 927149301 start exactly there and join the serpentine mule track (way 207437135, sac_scale=hiking). Old point was ~290m NW on a residential street |

Flagged items checked but intentionally NOT changed (not lat/lng corrections, or already correct):
- `me-komovi` (me-user-notes.json, 42.6622, 19.6433) — flag #2 recommends reject/merge (a status decision, not a coordinate fix); the verified Štavna trailhead 42.71229, 19.6829 already exists as `me-komovi-vasojevicki-kom` in hikes.json, so moving the old pin would just duplicate it. Left as-is.
- `me-durmitor-sedlo-pass` (43.0985, 19.0503) — matches the confirmed 43.09852, 19.05054 within rounding (~20m); no change.
- `hr-tulove-grede` (44.26351, 15.6556) — matches the certain rocks coordinate exactly; no change.
- `ba-skakavac-waterfall` (43.94861, 18.44889) — matches the noted 43.9486, 18.4489; no change.
- Flags #3 (`me-lovcen-njegos-mausoleum` cost) and #4 (`hr-velika-paklenica-gorge` fee) are price fields, out of scope for coordinate-only edits.
- Ids `ba-maglic`, `ba-prijevor`, `ba-perucica`, `ba-trnovacko-jezero` referenced in this doc do not exist in `src/data/*.json` (Trnovačko exists as `me-trnovacko-jezero`, for which no correction was given) — nothing to correct.

Validation: `python3 -m json.tool src/data/me-places.json` clean; `npm run build` green.
