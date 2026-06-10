# Bosnia & Herzegovina leg — research notes

Working notes for the inland Bosnia leg (~Jun 21–23): we enter from the Dubrovnik/coast side, go **inland into the mountains** (explicit group wish), and exit **east into Montenegro at Šćepan Polje**. Sourced from real travelers (Reddit was largely un-fetchable this session, so quotes are from TripAdvisor forums/reviews, park4night/Campercontact, camping.info, SummitPost, Spomenik Database, Rick Steves forum, and personal trip-report blogs — flagged where relevant). Coordinates verified against OSM/Wikipedia.

> **Where the pins live.** My file is `src/data/ba-places.json` (19 places). To avoid duplicate pins, several in-scope places that parallel sessions already pinned are NOT re-pinned here:
> - **`src/data/experiences.json`** (activities/nightlife): **Neretva rafting** (`ba-neretva-rafting-konjic`), **Tito's bunker / ARK D-0** (`ba-ark-bunker-konjic`), **1984 bobsled track** (`ba-bobsled-track`), **Lukomir** (`ba-lukomir`), **Umoljani→Lukomir hike** (`ba-umoljani-rakitnica-hike`), **Boračko Lake camp** (`ba-boracko-lake`), **Blagaj Buna swim** (`ba-buna-blagaj-swim`), **Mostar paragliding** (`ba-paragliding-mostar`), **Sarajevo nightlife** (`ba-silver-smoke`), **Vrelo Bosne**, **Terme Ilidža**, **Sarajevo Skakavac waterfall**.
> - **`src/data/ba-hikes.json`** (Sutjeska/mountain hikes — owns the hiking pins): **Maglić + Prijevor** (`ba-maglic-prijevor`), **Trnovačko Lake** (`ba-trnovacko-jezero-hike`), **Perućica + Skakavac + Vidikovac viewpoint** (`ba-perucica-skakavac-vidikovac`), **Zelengora lakes** (`ba-zelengora-lakes`), **Prenj / Zelena Glava** (`ba-prenj-zelena-glava`), **Bjelašnica summit** (`ba-bjelasnica-summit-babindo`).
> - **`src/data/logistics-places.json`**: Croatia↔BiH ferries and the ME↔HR border.
>
> What this file (`ba-places.json`) uniquely pins: Mostar food/jumpers/nightlife, Blagaj restaurant, Koćuša falls, Kravica campsite, Sarajevo town/war-tunnel/ćevapi, the Tjentište brutalist monument (a *sight*, not a hike) and the Sutjeska park-base accommodation, plus Trebinje town/wineries/viewpoint and Vjetrenica cave. The notes below add the analysis the brief asked for (operators, prices, verdicts) without duplicating any pins.

---

## 1. Route shape & realistic drive times (inland loop)

Direction is fixed by the geography: come up from Dubrovnik/Trebinje → Herzegovina lowlands (Kravica/Mostar) → central mountains (Konjic, optional Sarajevo) → east to Sutjeska → Šćepan Polje border.

| Leg | Distance / time | Notes |
|---|---|---|
| Dubrovnik/Trebinje → Mostar | Trebinje→Mostar ~95 km / **1h45–2h** | via Stolac & Ljubinje (Republika Srpska — signs go Cyrillic). **Police patrols reported in Stolac/Ljubinje.** |
| Coast → Kravica | Dubrovnik→Kravica ~2h19 (OSRM); from the Metković area ~40 min | pairs Kravica + Počitelj on the Neretva-valley axis |
| Kravica → Mostar | ~45 km / **~55 min** | via Počitelj/Čapljina |
| Mostar → Konjic | ~70 km / **~1h** on the M17 | well-maintained, winding in the mountain sections |
| Konjic → Sarajevo | ~60 km / **~1h** on the M17 | scenic Jablanica/Jablaničko-lake variant adds 30–45 min |
| Sarajevo → Tjentište (Sutjeska) | ~100 km / **~2h** (M18→M20) | paved, **slow & winding** along river canyons — not highway speed |
| Konjic → Tjentište direct (via Kalinovik) | ~160 km mapped | remote high-plateau back route — **see road verdict below** |
| Tjentište → Foča → Šćepan Polje (ME border) | Foča→border ~25 km / **~42 min** | the notorious rough stretch — narrow, partly single-lane; **daylight only** |

**Don't drive the unlit mountain roads at night.** Fuel up in towns (Mostar, Konjic, Sarajevo, Foča) — stations thin out in the mountains and at Tjentište.

---

## 2. Sarajevo overnight — VERDICT: YES (1 night), and it's essentially free in driving terms

**Do it.** It's the only real city on an otherwise nature-heavy trip and delivers a distinct experience — Ottoman bazaar + Habsburg boulevard + raw siege history + a graffiti-covered Olympic ruin you can walk — in a small, cheap, walkable footprint with genuine nightlife. For four young travelers the bobsled track alone is a highlight.

**Half-day priority plan:**
1. Walk **Baščaršija** (Sebilj, coppersmiths' alley, Gazi Husrev-beg Mosque, the "Meeting of Cultures" line). Eat ćevapi at **Željo** or **Petica** — pick one; both are the genuine locals' picks (the third locals name is **Mrkva**). Try burek too.
2. **Trebević cable car** up (~20 KM / €7.5 one-way, ~15 BAM, cash, from Bistrik ~10 min walk uphill) → Vidikovac viewpoint → walk the **abandoned 1984 bobsled track** (free, ~1.3 km of graffiti and bullet holes). This is the must-do combo. *(Both pinned in `experiences.json`.)*
3. If time: **Tunnel of Hope** war museum out by the airport (~€8–10.50) — powerful, consistently top-rated; slot it on arrival/departure since you drive that side anyway.
4. **Evening:** ćevapi/drinks, then nightlife around Ferhadija — **Silver & Smoke** (electronic), **Sloga** (legendary live-music club), **Pink Houdini** (jazz), **Kino Bosna** (Mondays, live sevdah + cheap drinks), craft beer at **Vučko/Boardroom**. Beer ~3.5–6 BAM. Sarajevo beats Mostar decisively for a real night out.

**Where to stay (cheap, 4 people):** Baščaršija/Bistrik. Apartments for 4 at the ~€50 benchmark are realistic (Sarajevo is one of the cheaper capitals). Named hostels with private quads: **Franz Ferdinand**, **Pigeon Square** (on the bazaar), **Hostel Kucha** (9.5 Booking), **Guest House Bistrik** (quieter, near the cable car). *(€50/4 is "very achievable," not a confirmed listing — book a 2-bed apartment in Bistrik/Baščaršija.)*

**Where to park (old town is tight — don't drive into Baščaršija):** the **BBI Centar garage** (Centar, ~5 min walk) is the most-named central covered garage; **Skenderija** riverside lot is large/cheap. Confirm rates on arrival; both are the standard "park here and walk" answers.

---

## 3. ROAD VERDICT — Konjic → **Sarajevo** → Tjentište vs the direct Konjic → Tjentište shortcut

**Take the Sarajevo route.** The "direct" Konjic→Kalinovik→Foča shortcut looks shorter on a map but saves no real time and crosses remote, rough, sparsely-served high-plateau terrain; the **Sarajevo→Foča→Tjentište road (M18/M20) is fully paved, scenic, and the route everyone actually drives.** So going via Sarajevo costs essentially nothing and buys you the city — exactly what the drive-time estimate (~+13 min) implied, because the genuinely fast corridor *is* the one through Sarajevo.

Evidence:
- **M18/M20 (Sarajevo→Foča→Tjentište) is paved and normal — just slow/winding.** Destination expert: "Both routes have paved roads… use the M18/M20." Another: "I used the M18 from Sarajevo to Foča… quite spectacular landscapes." Widely cited at **~2h / ~100 km** because it follows river canyons one-lane-each-way ("narrow and slow, although very scenic," "the ride can be bumpy").
- **The Kalinovik shortcut is genuine remote mountain terrain.** Kalinovik is "high mountain landscape covering over 80% of the area"; alternate back-routes into the park "start with nice scenery but turn into forest paths… rough with rocks, mud, and steep inclines," some "not suitable for ordinary cars." A real trip report on a mountain diversion in this region took "between four and five hours" vs a planned "under two hours" on "winding mountain roads."
- **Net:** Sarajevo wins by default. Drive Konjic → Sarajevo (overnight) → M18 via Trnovo → Foča → M20 to Tjentište.

**Forward flag (the actually-bad bit):** **Foča → Šćepan Polje** (the ME border approach) is the rough one — "narrow and sometimes dirt road," "terrible condition," "the last ~10 km a one-lane asphalt squeeze" along the canyon; a 5 km section has been under reconstruction since 2022. Recent comments say it's now mostly paved but still narrow. **Passable in a normal car — drive it slow, in daylight, and avoid in heavy rain** (landslide history). This is the leg that fed the OSRM oddity in `drive-times.md` (it wouldn't route the short border road) — expect ~2.5–3h Tjentište→Žabljak via Piva canyon, not highway speed.

---

## 4. Sutjeska NP on a transit day — what's realistic

We pass Tjentište on the M20 heading to the border. How much you see scales hard with time:
- **30–60 min (drive-through):** the **Battle of Sutjeska monument** (off the M20, 200+ steps, otherworldly brutalist wings). Best low-effort taste, almost no detour.
- **2–4 hours (proper transit stop):** monument + **Dragoš sedlo viewpoint** (free, ~100 m walk, look down on Perućica forest + the 75 m Skakavac falls) **OR** the rough drive up to **Prijevor** for the Maglić panorama. You can't do both well in 4h — Prijevor is ~1–1.5h each way on gravel.
- **Full day (NOT a transit day):** **Maglić summit** (half-day hard scramble, exposed chains) or **Trnovačko Lake** (~1.25–2h each way from Prijevor; the regional highlight, swimmable, heart-shaped). The combo loop is ~6.5–7h. **These require an overnight at Tjentište** — do not stack them on a day you also clear the border.

**Verdict:** if the group wants Trnovačko/Maglić, **sleep one night at Tjentište** (Hotel Mladost or Kamp Sutjeska; wild-camp at Prijevor for the best value+view) and hike the next morning, then cross. If it's purely transit, do **Monument + Dragoš sedlo** (~1.5–2h) and keep moving.

**Perućica access:** strict reserve, **ranger-guided only**, unmarked trails, no phone signal, **~16 people/day quota** — book ahead through the park. Guide is a flat per-group fee (splits well across 4). The Dragoš sedlo viewpoint gives the forest + waterfall view for free if you don't want the guided commitment.

**Prijevor road (4x4?):** ~20 km gravel, deteriorating mid-section. **Dry = a normal rental can do it driven very slowly** (people report Yaris/Micra-class cars at the lot, at tire-damage risk). **Wet = 4x4 strongly recommended.** Mid–late June is likely dry but check the weather that morning. Viewpoint tower is a 15-min walk from the lot.

**Landmine caution:** mines remain in *parts* of the wider park (Spomenik DB + forum posters). The monument, marked trails, Prijevor road, and the Trnovačko/Maglić routes are fine — **don't bushwhack off-trail.**

**Trnovačko Lake is in Montenegro** but accessed on foot from Prijevor on the Bosnian side — **carry passports** (you walk across the unmarked border on the trail). The Sutjeska hikes (Maglić/Prijevor, Trnovačko, Perućica/Skakavac) are pinned in `ba-hikes.json`.

---

## 5. Neretva rafting (Konjic) — operators & prices

Pinned as `ba-neretva-rafting-konjic` in `experiences.json`. The two operators travelers actually praise:
- **Raft Kor** (neretvarafting.com) — most-reviewed and most decorated; TripAdvisor "top 10% worldwide every year since 2017." Named skippers: Sanel/Vedad/Renato/Adisa. "Knew every hole and trick on this river."
- **Raft Bosnia by Eco Vision** (raftbosnia.com) — 20+ years, "new equipment," meeting point Zuke Džumhura 100, Konjic.

**Price:** reports range **~€31 pp** (standard 20 km, 6–8h; +~€11 lunch) up to **~€45 pp all-in** (Eco Vision package incl. wetsuit+jacket+helmet, transfer, riverside BBQ). Short 7 km variant ~€21 pp. **Avoid the cheapest no-name operators** — one drew a safety complaint ("3 of us fell in… stuck under the boat"). **Pick Raft Kor or Eco Vision.**

**The trip:** ~22 km, put-in near Glavatičevo where the canyon opens (~300 m limestone walls), calm turquoise stretches + 4 rapids (grade II–IV), a waterfall shower, swim/bridge-jump break, ending toward Boračko/Konjic. ~4h on water, ~6h day. Min age 8; beginner-friendly yet fun.

**June timing = prime.** The Neretva peaks **mid-May to early July** on snowmelt → highest water / strongest rapids of the year. (July–Sept it drops and tames.) Book a day or two ahead.

**Pair it with:** **Boračko Lake** (`ba-boracko-lake`, ~16–20 km up a hairpin road from Konjic) for a warm-enough swim + overnight, and **Tito's nuclear bunker ARK D-0** (`ba-ark-bunker-konjic`, ~€20 pp, **pre-book a slot**, names/passport numbers required — military site, slots ~09:00/12:00/15:00).

---

## 6. Campsite / cheap-stay comparison (Bosnia is cheap — these are the gems)

| Stay | Where | Price (4 + tent + car) | Facilities / notes |
|---|---|---|---|
| **Auto Camp Ante** (`ba-kravica-autocamp-ante`) | ~700 m from Kravica falls | ~€15–20/night (confirm 4-pax) | "Immaculate" hot showers, WiFi, BBQ, friendly EN/DE hosts. **Dawn-entry trick:** falls are free + empty outside the 07:00–19:00 ticket window. |
| **Eko Selo Boračko Jezero** (`ba-boracko-lake`, in experiences.json) | Boračko Lake, ~16 km from Konjic | ~€20–25; one report 100 KM (~€50) for camper+4+power, **cash** | Lakeside beach, clean-ish showers (some "no hot water / basic" complaints), restaurant, beach bar, kayak/pedalo. Busy weekends. |
| **Hotel Mladost & Kamp Sutjeska** (`ba-tjentiste-mladost`) | Tjentište, in the park | Budget 2-star hotel; small per-tent camp fee | The de-facto Sutjeska base; big pool; only 2 restaurants + 1 shop in town — **bring food**. Camp sanitary block quality variable. |
| **Wild camping** | Prijevor saddle; Trnovačko Lake | Free | Prijevor = best value+view in the park, puts you at the Maglić/Trnovačko trailhead at dawn. Spring water at Prijevor. |
| **Apartments** | Mostar (Kriva Ćuprija/old town), Trebinje, Sarajevo (Bistrik) | ~€45–70/4 | All comfortably near the €50 benchmark; Trebinje and Sarajevo are notably cheaper than the coast. **June books early.** |

**Mostar where-to-stay:** the **Crooked Bridge / Kriva Ćuprija** pocket (5-min walk from Stari Most) is the sweet spot — old-town atmosphere without the worst daytime crowd noise. Apartments for 4 with kitchen/AC/parking hit €45–75 a short walk out. Hostels (Taso, Miran, Nina) are cheap and social.

---

## 7. Mostar specifics (food, jumpers, parking, Kravica)

- **Eat:** **Urban Grill** is the one most flagged as a *local* ćevapi/grill pick (default). **Tima-Irma** is the famous one — good but mixed (queues, theatrical service, some rate Sarajevo's ćevapi higher). **Hindin Han** = best sit-down dinner on the river. (Šadrvan is the costumed-traditional show option if you want it; coords 43.337113, 17.814197.)
- **Watch the jumpers:** from the **west (right) bank just before the bridge deck** — the Halebija tower's café + two riverside observation decks are the unanimous front-row spot. Jumpers only go once enough tips pool, so build in waiting time; midday–afternoon = most activity.
- **Park:** old town is pedestrian — park on the edge and walk in. Travelers name **Parking Stari Grad** and the lot behind the former **Razvitak** department store; cheap (a few KM/hr). Arrive before the late-morning tour wave.
- **Kravica (2026):** entry **€10 / 20 KM per adult, Apr–Oct** (booth only 07:00–19:00 → free outside that window — hence the dawn move), parking ~3 KM/hr. **Swimming allowed** in the pool below (cold, 16–20°C). Worst crowds midday 12:00–15:00. **Pair with Koćuša** (`ba-kocusa-falls`, 20 km away): free, far quieter, swimmable, photogenic watermill.
- **Počitelj** (existing seed pin `ba-pocitelj`): a 20-min cliff-village climb to a fortress tower, best **before 11:00 or after 14:00** (brutal midday heat, scarce shade), ~45–90 min total. Sits right on the Mostar↔coast/Kravica axis.

---

## 8. Lukomir & the Bjelašnica highlands — feasible in late June? YES (with care)

Pinned `ba-lukomir` + the `ba-umoljani-rakitnica-hike` in `experiences.json`. The road is snow-locked ~Nov–Apr/May; it opens ~May and since a 2004 upgrade "ordinary vehicles" reach it ~May–Nov, so **late June is comfortably in season** (snow gone, summer families back, "21 of 50 homes inhabited in summer"). BUT the final **~11–14 km is unpaved rocky gravel** — opinions split: "Umoljani is as far as advisable with a small car" vs "perfectly doable in a normal car in summer, just slow (~10–20 km/h)." **Verdict: a normal rental WILL make it in dry weather — drive slowly, ~30–40 min gravel each way; SUV/high-clearance makes it relaxing. Don't attempt in rain.** Reward: dry-stone houses on the Rakitnica canyon rim + lunch with locals (homemade burek/pita "best in the country"). A real **half-day detour** off the Konjic corridor. **Umoljani** (stone village + 7 watermills, easier access) is the natural fallback/combo and the trailhead for the classic ~6–7h Umoljani→Lukomir loop. Also a superb sunrise / "meditation on a mountain" spot.

---

## 9. Hidden gems & scope calls

- **Koćuša waterfall** (`ba-kocusa-falls`) — free, near-empty Kravica alternative with a watermill. Strong add.
- **Vjetrenica Cave** (`ba-vjetrenica-cave`, Zavala/Ravno) — biggest, most biodiverse cave in BiH (blind olm salamander). Worth the ~1h detour from Trebinje for cave fans; mixed service reviews (rated 3). Guided hourly, ~12°C, cheap.
- **Tvrdoš Monastery** (`ba-tvrdos-monastery`) — monks make Decanter-gold Vranac; grounds/shop free, **tastings need pre-booking weeks ahead or via tour**.
- **Hutovo Blato** (near Čapljina) — silent electric-boat bird safari (~€10–15 + €1 entry), 2–3h of slow nature. Off-beat but lower appeal for a young adventurous group — **flag, not pinned** (skip unless you like binoculars).
- **Ćiro trail** — old Mostar–Trebinje–Dubrovnik railway, now a bike path (hand-dug unlit tunnels near Popovo Polje). Not a car route, but a fun half-day rented-bike section if wanted — **flag, not pinned.**
- **UNA NP (Bihać) — OUT OF SCOPE.** Far NW corner: Mostar→Una ~165 km/4h12; Sarajevo→Una ~280 km/3.5h, plus rough dirt access to Štrbački buk. It only makes sense paired with Plitvice/Jajce on a NW loop — the opposite end of our trip. **Skip.**
- **Jajce / Pliva lakes — off-route** (central-west). Same direction problem, less extreme. **Skip.**
- **Prenj ("Bosnian Himalayas")** — stunning but serious, and **landmine status unclear in places — guided only / established trailheads only.** Not pinned; include only as a committed guided hiking day.

---

## 10. Practicalities

### Border crossings (HR ⇄ BiH ⇄ ME)
- **Dubrovnik ⇄ Trebinje:** use **Ivanica–Gornji Brgat** (small inland crossing). "Without queues a maximum of 10 minutes; with queues ~20 min." **Stop at BOTH booths** — missing one risks a ~€155 fine.
- **Coast → Kravica/Mostar:** **Bijača/Nova Sela** (modern, "5–15 min, rarely congested") or **Doljani/Metković** ("15–45 min summer, up to ~2h Fri 15:00–18:00 peak"). Prefer Bijača; cross before 9am or after 6pm.
- **BiH → Montenegro (our plan):** **Hum (BiH) → Šćepan Polje (ME)**, ~20–45 min summer. Long infamous for the *Bosnian-side road quality* (see road verdict) though now "mostly paved."
- **ME → HR coastal return (Jun 27/28):** **Debeli Brijeg/Karasovići** is the real bottleneck — **1–4h, up to 4–5h on Fri/Sun peaks**, worst 10:00–14:00. Cross **before 08:00 or after 21:00**, or use the back-door **Vitaljina/Kobila (Konfin)** via Molunat (cars only, ~1h max). (Pinned `me-debeli-brijeg-border` in logistics-places.json.) Live cams: kamere.mup.gov.me, nakordoni.eu, borderalarm.com.
- **EES (live since 10 Apr 2026):** non-EU/EEA travelers get biometrics (fingerprints + facial scan) on first Schengen crossing into Croatia — **plan +10–15 min on the first crossing**; repeats are faster. **Relevant for the 4th person if non-EU.** EU citizens unaffected. **Passport required everywhere** — EU ID cards work for Croatia but NOT for BiH or Montenegro.

### Neum corridor
**Non-issue for us.** The **Pelješac Bridge has bypassed Neum since July 2022** — the Split–Dubrovnik coastal route no longer needs the double-crossing through BiH at Neum (take the toll-free bridge). Croatia joining Schengen (Jan 2023) is *why* the remaining Neum road now has full checks, but we simply don't use it — our only BiH entries are the chosen inland ones. (Minor forward note: Pelješac Bridge renovation is scheduled to *start* Oct 2026, after the June trip.)

### Currency (KM / BAM)
1 EUR ≈ 1.95 KM (pegged). EUR is widely accepted but usually at a rounded **1:2** rate (slightly worse than official) — you lose a little paying in euros. **Pull KM from an ATM in Mostar** (or another sizeable town) before heading rural; ATMs thin out (nearest to Kravica is ~12 km away in Čapljina). Carry **cash** for: Kravica entry/parking, Vjetrenica, ćevapi, parking, Boračko camp (cash only), market. **Tip in cash directly to the server** — card tips often don't reach staff. Rough guide: ~€25–35 pp in small mixed EUR/KM notes.

### Roads & police (this is real)
Bosnia is genuinely **notorious for speed traps** — limits drop abruptly from 70/80 to **40 through villages** and locals ignore it, so **foreign rental plates get targeted.** Documented report near Mostar: stopped for "72 in a 40 zone, facing a 200 EUR ticket," officer "hinted I could pay a smaller fine directly." Patrols specifically reported on the **Trebinje–Mostar road (Stolac/Ljubinje).** Advice: rigidly obey the village 40 zones, don't speed, keep documents in order, ask for an official receipt. Don't drive unlit mountain roads at night.

### Rental car cross-border / Green Card / insurance
- **Tell the rental company up front** and confirm BiH + Montenegro are allowed.
- **Green Card is mandatory** for BiH/ME — "purchase it from the rental company, otherwise you're not authorized to take the car out of the country." Renters: "I paid for the green card at booking; they gave it with the paperwork at pickup." Even though border guards "only asked for passports," you "absolutely need it — not having it is big trouble in an accident."
- **Fees:** expect a **cross-border fee** *and* a separate **one-way drop-off fee** (our Zadar pickup → Dubrovnik drop is already arranged — confirm the green card is included).
- **Vignettes:** none needed for BiH or Montenegro on this routing. (Montenegro has occasional cash tolls e.g. Sozina tunnel, not a vignette.)
- **Net:** renters report it's smooth *provided* the green card + cross-border permission were arranged at booking — the thing people get burned on is assuming it's automatic. It isn't.

---

## Coordinate confidence
HIGH (Wikipedia/OSM/Spomenik/Outdooractive, several cross-checked live this session): Koćuša (verified 43.2493423, 17.4522203), Vjetrenica (verified 42.8458637, 17.9837844), all Trebinje pins, Tjentište monument, Maglić, Trnovačko, Tunnel of Hope, Sarajevo, Prijevor, Peručica entrance. MEDIUM (street/block-level in dense old towns): the Mostar food/nightlife pins and Željo (~30–40 m, fine for a walkable planning map). Hotel Mladost cluster pin is approximate — verify on OSM before navigating.
