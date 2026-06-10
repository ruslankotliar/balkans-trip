# Red-Team Notes — adversarial verification of the shortlist (2026-06-10)

Mission: try to REFUTE every shortlisted place (70 total across `src/data/*.json`). Method: targeted web checks against 2024–2026 sources — official price lists (incl. the NP Mljet 2026 PDF and pp-biokovo.hr), recent TripAdvisor/forum reviews, Croatian/Bosnian/Montenegrin local news (Novi list, eKapija, Sarajevo Times, Euronews.ba). A place survives only if the refutation attempt failed.

**Tally: 4 DEMOTE · 23 FLAG (survive with corrections) · 43 CONFIRMED.**
Recommendations only — no data files were edited.

---

## 1. DEMOTE — should leave the shortlist

### 1.1 `me-nevidio-canyon` — Nevidio Canyon Canyoning (rating 5) → **demote to backup; replace with "Grabovica canyoning" candidate**
The product you'd actually be sold in our window is not Nevidio. Operators themselves state: **"From May to June, the water level in Nevidio canyon makes it too dangerous for canyoning"** — guides run the substitute **Grabovica** canyon instead, and **"from July… the conditions in Nevidio become ideal."** Our Durmitor window is Jun 23–24; late June is at best a coin-flip transition week. Paying ~€120–130 pp for the regional bucket-list item and getting the easier substitute is exactly the "considers bullshit" failure mode. If the group wants pre-season canyoning, shortlist *Grabovica* honestly (it's the high-water canyon and "equally beautiful" per the same operators) and treat Nevidio as a lucky-weather bonus call made 2–3 days out.
Sources: https://nevidio-canyoning.com/en/home-english/ · https://canyoning.ba/activities/canyoning-nevidio/ · https://www.outdoortara.com/activities/canyoning-nevidio

### 1.2 `hr-veliki-prstavac` — Veliki Prštavac waterfall, Plitvice → **demote to candidate (consistent with the route verdict)**
This pin is shortlisted while the trip's own decision document (`verdicts-digest.md` §1a) rules Plitvice a unanimous NO: +4:21 pure driving the wrong way inside a hard 1.5-usable-day window, ~€40 pp, timed boardwalks, no swimming. Recent visitor guidance confirms June = "overwhelmingly busy", workable only with a 7–8am entry — i.e. it would have to *own* the scarcest day of the trip. A shortlisted Plitvice waterfall pin contradicts the agreed plan; keep it as candidate so the map doesn't imply a commitment nobody made.
Sources: https://atickettotakeoff.com/en/ultimate-guide-to-visit-plitvice-lakes/ · `research/verdicts-digest.md` §1a · `research/drive-times.md`

### 1.3 `me-biogradska-gora` — Biogradska Gora NP (rating 4) → **demote to backup (auto-promote only if the eastern swing is voted in)**
The payoff is an easy ~1h lake loop whose lakefront boardwalk "gets bus-busy in high season" — for a net **+2.5–3.5h of driving** (the pin's own detour math). The group already gets a glacial-lake-in-forest moment for free at Black Lake on the Durmitor days, and the 2-night Žabljak block is already fully booked with rafting + a summit day. A 500-year-old forest does not survive a cost-benefit where the unique part (old-growth depth trails) isn't what a transit stop actually sees. Worth it ONLY as part of a deliberately chosen eastern swing (Tara canyon road + Morača) — which the current skeleton has no slack for.
Sources: https://www.montenegropulse.com/biogradska-gora.html · pin's own detour math in `off-route-gems.json` · `research/route-skeleton.md`

### 1.4 `hr-buza-bar` — Buža Bar, Dubrovnik (rating 4) → **demote to backup; check status on arrival**
The bar as an operating business is in legal limbo: the Dubrovnik Tourist Board's standing line is that it is "not permanently closed, however, due to recent changes in legal procedures… unable to provide a specific opening date," and a **May 2026 TripAdvisor review reports the tables and chairs have been removed**. Dubrovnik's concession litigation wave (cf. Novi list on city beaches without concessionaires for a third season) makes a June 2026 normal season anything but guaranteed. The hole-in-the-wall terrace and cliff-jump ledges remain physically accessible and free — fine as a sunset walk-by — but a shortlist slot for "the cliff bar institution" oversells what's reliably on offer. Re-promote instantly if it's confirmed pouring drinks.
Sources: https://www.tripadvisor.com/Restaurant_Review-g295371-d18894103-Reviews-Buza_Bar-Dubrovnik_Dubrovnik_Neretva_County_Dalmatia.html · https://www.tripadvisor.com/Attraction_Review-g295371-d552668-Reviews-Cafe_Buza-Dubrovnik_Dubrovnik_Neretva_County_Dalmatia.html · https://www.novilist.hr/novosti/hrvatska/jedna-od-najposjecenijih-plaza-u-dubrovniku-trecu-sezonu-bez-koncesionara/

---

## 2. FLAG — survive, but correct the facts

**Prices / hours wrong or drifted:**

1. `ba-bobsled-track` — **Cable car tourist fare is 20 KM one-way / 30 KM return (~€10/€15.30)** since Dec 2023 — our pin's "15 BAM one-way / 20 return" is the old tariff (locals' price is 4/6 KM, don't expect it). Mondays often open late (~12:00) and maintenance closures happen — check zicara.ba the day before. Track itself free; stay ON the concrete (UXO off-path) and go as a group — both cautions reconfirmed. (https://sarajevotimes.com/increased-ticket-prices-for-the-trebevic-cable-car/ · https://bosnianvoyager.com/sarajevo-cable-car-trebevic/)
2. `ba-tunnel-of-hope` — price is a flat **20 KM adult (~€10)**, not "15–20 KM"; **cash KM only — no cards, no euros** (plan a Sarajevo ATM stop first); Apr–Oct hours 08:30–17:30, last entry 17:00. (https://cultureactivities.com/sarajevo-war-tunnel-museum-tickets-opening-hours · https://sarajevo.travel/en/things-to-do/tunnel-of-hope/180)
3. `me-lovcen-njegos-mausoleum` — budget **€11 pp (€3 NP entry + €8 mausoleum)** per 2025/26 reports — our pin's "~€3+€3" is roughly half the real cost. €44 for 4, still worth it for the 360° panorama. (https://monteguide.com/lovcen-njegos-mausoleum/ · https://montenegrodigitalnomad.com/montenegro-blog/njegos-mausoleum-montenegro/)
4. `me-kotor-fortress-paid` — **€15 high season confirmed**, but the "free before 8am" loophole is unreliable for 2026: official admission starts ~07:00 and booth staffing varies; gates may be open pre-07:00 but treat free entry as a bonus, not a plan. Tickets checked at the turnstile on the way down (no Ladder-exit trick). Budget €60 for 4 or start ~06:00. (https://tourismattractions.net/montenegro/buy-kotor-fortress-tickets · https://adriaticways.com/kotor-fortress-city-walls/)
5. `hr-velika-paklenica-gorge` — official 2026 adult day ticket **€10 in Jun–Sep** (not €8; −5% via parkovihrvatske.hr webshop). June parking overflow confirmed (cars 1 km down the road) — before 09:00 stands. (https://www.np-paklenica.hr/en/price-list-en · https://starigrad-paklenica.com/nacionalni-parkovi/cijene_ulaznica_u_nacionalne_parkove)
6. `hr-zavizan-dark-sky` — North Velebit NP entry is **€7/day adult** (official price list), not ~€10; the last **7 km to Zavižan is rough macadam** — slow but fine driven carefully in a rental; the hut sells **drinks but no full meals** — carry dinner/breakfast for the dark-sky night. (https://np-sjeverni-velebit.hr/www/en/visiting/price-list · https://np-sjeverni-velebit.hr/www/en/visiting/how-to-reach-us)
7. `hr-knin-fortress` — entry is only **~€3–4** (our pin says €8–10 — wrong direction, nice surprise), hours 09:00–18:00. Still inland-route-conditional (see §4 bench). (https://us.trip.com/travel-guide/attraction/knin/knin-fortress-58283323/)
8. `hr-mljet-np` — **€25 adult June confirmed by the official 2026 price list (PDF, adopted Oct 30 2025)**; note precisely: the −25% after 16:00 applies to adult/child/student tickets **bought at the park**, and the St Mary boat + parking + electric train are included. (https://np-mljet.hr/wp-content/uploads/2025/11/ENG-Cjenik-ulaznica-za-posjetitelje-za-2026.g.pdf)
9. `me-vinarija-masanovic` — confirmed €10 tasting; **with the food platter it's €20 pp**, not "platters extra, affordable-vague". Book by phone/email ≥1 day (vinarijamasanovic@yahoo.com, +382 68 509 541); cash only. (https://www.tripadvisor.com/Attraction_Review-g1232143-d6819135-Reviews-Wine_tasting_Winery_Masanovic-Virpazar_Bar_Municipality.html)
10. `ba-blagaj` — seed pin has no cost: it's now **10 KM / €5 cash** to enter the tekija, knees/shoulders covered (wraps provided free). Park at the lower lots — the final street is a midday tour-bus trap. (https://exploremostar.com/blagaj-tekke/ · https://www.thetripverdict.com/blagaj-tekija)
11. `ba-kravica` — seed's "~€10" holds: **20 KM adult flat, year-round**; June pool is swimmable (~18–20°C). Crowd play confirmed: arrive ~07:00–08:00. (https://kravica.ba/en/for-visitors/ · https://www.traveltomtom.net/destinations/europe/bosnia/visiting-kravice-waterfalls-bosnia)
12. `me-perast` — add concrete costs: Our Lady of the Rocks boat **€5–10 pp return + €3 church/museum**; island open to ~18:00 in June; parking ~€8/day stands. (https://www.montenegropulse.com/our-lady-of-the-rocks.html)

**June-specific / experience-quality corrections:**

13. `me-lustica-blue-cave` — our pin says "you can swim inside"; recent reviews say **swimming inside is often not permitted or practical** — peak midday sees **20+ boats jockeying inside the cave** and operators keep swimmers out, swimming happens just outside. Best-light advice (10:00–13:00) collides with the boat rush: book the **earliest ~09:00 departure** from Herceg Novi/Žanjic and accept slightly less glow, or go private. (https://www.montenegropulse.com/blue-cave-montenegro.html · https://bosnianvoyager.com/blue-cave-kotor/)
14. `me-sveti-stefan` — big news, net positive: after 5 years closed, **Aman Sveti Stefan reopens Jul 1, 2026 — three days AFTER we fly out**, so the islet itself stays off-limits on our dates. Meanwhile the beaches around it are **free** (the €120-sunbed era is over; Queen's Beach becomes Aman-exclusive only after reopening) — but there are **no facilities** (no showers/toilets). Correct the pin from "iconic beach alternative" to "free swim + the classic roadside photo stop." (https://www.euronews.com/travel/2026/05/06/amans-sveti-stefan-resort-in-montenegro-to-reopen-five-years-after-beach-access-row · https://www.rferl.org/a/free-beach-sveti-stefan-montenegro/33467608.html)
15. `me-trnovacko-jezero` — keep (it's the signature reroute), but harden the road language: TripAdvisor consensus is **"the road is in bad shape… high clearance recommended; you could barely manage with a normal car"** — and 18 km of gravel may breach the rental's prohibited-surfaces clause (same issue as Lukomir; check the contract, or take the 4x4 transfer from Tjentište). Ranger collects a small Piva NP fee at the lake; carry passports (border zone). (https://www.tripadvisor.in/ShowTopic-g294449-i6233-k14420003-Prijevor_parking_and_road-Bosnia_and_Herzegovina.html)
16. `ba-lukomir` — the road dispute resolves to: **dry-weather-only in a 2WD, final ~11 km gravel, mud = treacherous**; multiple sources still say 4x4 recommended. Given rental-insurance gravel exclusions, the defensible plan is **hike in from Umoljani (asphalt all the way there) or book the jeep tour**; drive it yourselves only on a bone-dry day with the contract checked. (https://www.tripadvisor.com/ShowTopic-g17492704-i48564-k14776145-Lukomir_road_conditions-Federation_of_Bosnia_and_Herzegovina.html · https://www.finalrentals.ba/blog/single/travel-to-the-village-of-lukomir-in-bosnia-and-herzegovina)
17. `me-scepan-polje-piva-canyon` — crossing verdict stands, but add: **active roadworks on the BA side (Brod na Drini/Foča → Hum) with slow traffic and temporary ~10-min stoppages** reported through 2025/26, and Montenegro has the 24-tunnel Plužine section earmarked for reconstruction (new joint border post Šćepan Polje–Hum is still in the paperwork phase — no relief by June). Budget an extra 30–60 min on top of the 2.5–3h; daylight-only rule unchanged. (https://www.glassrpske.com/lat/novosti/drustvo/oprez-radovi-na-putevima/634896 · https://bankar.me/scepan-polje-pluzine-na-20-kilometara-cak-24-tunela/ · https://rtnk.me/drustvo/mup-priprema-projektnu-dokumentaciju-za-izgradnju-granicnog-prelaza-scepan-polje-hum/)
18. `hr-tulove-grede` — survives, with the safety line made explicit: trail and summit area were de-mined, **but marked minefields remain in the wider area — zero off-trail wandering** (red signs; mine map at hcr.hr). Access road has unpaved sections — slow in a rental. (https://www.summitpost.org/tulove-grede/153393 · https://www.lifeandventures.com/tulove-grede-velebit-mountain/)
19. `me-ploce-beach` — party fit confirmed, but recent reviews include a **documented triple-overcharging incident at the pool bar** plus "pool is dirty" complaints; €1.20 for 0.5L water. Rule: pay per round in cash, check every bill. (https://www.tripadvisor.com/ShowUserReviews-g19218517-d7074383-r850764278-Plaza_Ploce-Krimovica_Budva_Municipality.html)
20. `hr-punta-rata` — beach itself superb; the catch is **parking ~€11/day closest zone with reports up to €25 and "aggressive attendants", plus midday crush** — slot it as the Jun 18 *morning* swim (also clears out after ~15:30). Sunbed ~€7. (https://www.tripadvisor.com/ShowUserReviews-g480253-d3137988-r619350088-Punta_Rata_Beach-Brela_Split_Dalmatia_County_Dalmatia.html)
21. `hr-konoba-feral-brela` — open and thriving (4.5/843 TA, 4.6/2808 RG), but June reality: **reserve ~3 days ahead** (phone only), not the "24h" in our pin; walk-ins wait ~30 min. Peka still pre-order. (https://www.tripadvisor.com/Restaurant_Review-g480253-d1100633-Reviews-Konoba_Feral-Brela_Split_Dalmatia_County_Dalmatia.html)
22. `me-budva-oldtown-bars` — bars confirmed alive (Casper daily 10:00–02:00, live jazz; El Mundo nightly against the walls), **but Casper's DJ program starts in July** — late June is the mellower live-music version, and Top Hill is historically not yet in season. Set expectations: great bar night, not peak-clubbing. (https://www.lonelyplanet.com/montenegro/coastal-montenegro/budva/nightlife/casper/a/poi-dri/1305658/360154 · https://twopacksandapup.com/budva-nightlife-breakdown-all-the-top-spots-to-party/)
23. `hr-odysseus-cave` — survives, but the pin undersells the approach: recent accounts call it sharp, jagged karst with steep, wobbly final sections (~up to 1h down with breaks, not a uniform 20–30 min), and the cave interior is **swim-in only**. Water shoes mandatory; fits this group fine. (https://tayloronatrip.com/odysseus-cave-mljet-island-croatia · https://www.lifeandventures.com/odysseus-cave-on-mljet/)

---

## 3. CONFIRMED — refutation attempts failed (strongest recent positive evidence)

**Bosnia**
- `ba-sarajevo` — cheap-capital + Baščaršija value re-verified everywhere; Garden of Dreams (Jun 21–23) still the in-window bonus.
- `ba-mostar` — overnight verdict intact; no adverse 2025/26 findings.
- `ba-trebinje-old-town` — cheap-base claim holds across sources; no closures.
- `ba-tjentiste-monument` — free, roadside, open; spomenik condition unchanged.
- `ba-neretva-rafting-konjic` — Raft Kor's 2025–26 reviews still glowing ("knew every hole and trick"); June snowmelt = prime; named-operator rule stands.
- `ba-sarajevo-petica-ferhatovic` — 2025 reviews still call it "the gold standard" of Sarajevo ćevapi.
- `ba-tima-irma` — open; "best ćevapi of the trip" in recent reviews; queue persists (early lunch).
- `ba-pocitelj` — free, quick, no changes.

**Croatia**
- `hr-kantun-paulina` — TripAdvisor Travellers' Choice 2025; the queue ritual is alive and the batch-cooking explains it.
- `hr-gricko-grill-zadar` — open (winter break only; reopened Jan 12, 2026 per their Facebook).
- `hr-barba-dubrovnik` — 2025 reviews positive; octopus burger ~€15 meal level; no closure signals.
- `hr-dubrovnik-sea-kayak` — no pattern of negative/refuting evidence; sunset+wine version still the most-recommended.
- `hr-cetina-canyoning` — Sep 2025 reviews excellent; HGSS-credentialed guides confirmed.
- `hr-zrmanja-kayaking` — June clear-water kayak season confirmed (the low-water "it's not rafting" caveat is already in our data).
- `hr-anica-kuk` — scramble/via-ferrata status unchanged; sandbagged-grades warning stands.
- `hr-biokovo-tollroad` — **€15 adult Jun–Sep confirmed on the official pricelist**, webshop ticketing live; Skywalk open for the season (the 2023 glass crack was resolved in days).
- `hr-sveti-jure` — drivable via the toll road as planned.
- `hr-peljesac-bridge` — renovation confirmed **Oct 2026 → May 2027, chosen to avoid the season, no full closure planned** — June 2026 completely clear.
- `hr-ston-walls` — €10 adult incl. both forts, ~08:00–19:00 summer; no price surprise.
- `hr-mali-ston-oysters` — ~€2–2.5/oyster holds; the only norovirus event found was **2019, officially cleared** — no 2024–26 recurrence.
- `hr-montokuc-mljet` — included in NP ticket, trail open.
- `hr-zadar-old-town`, `hr-split`, `hr-dubrovnik` — anchors, nothing to refute.
- `hr-dubrovnik-airport` — logistics anchor.

**Montenegro**
- `me-tara-rafting-brstanovica` — late-June high/cold/fast water confirmed by operators; meeting point (Motel Tara car park at the bridge) and €70 half-day pricing reconfirmed via 2025 listings.
- `me-tara-bridge-zipline` — extreme line ~€25 confirmed; 4.8/5 across platforms; "over too quickly" remains the only gripe.
- `me-virpazar-kayak` — rental rates (€5/h–€20/day single, €10/h–€30/day double) and the separate **€5 pp Skadar NP fee** independently reconfirmed.
- `me-pavlova-strana` — free drive-up; still "FIVE STAR panorama"; wider-road approach advice stands.
- `me-stari-bar` — **€5 adult, ~08:00–20:00 summer** confirmed; quiet vs Kotor confirmed.
- `me-ostrog-monastery` — free, wraps at the entrance, weekday-before-09:00 rule confirmed; June = shoulder-season sweet spot.
- `me-tanjga-kotor` — 4.6/1700+ reviews, value intact (500g beef + sides ~€20); only cost is the queue (up to 1h peak — go off-peak).
- `me-oro-zabljak` — #2/27 in Žabljak, strong Sep 2025 reviews; reserve in season.
- `me-veliki-medjed`, `me-planinica` — June–Sep is the sanctioned season; no 2025/26 reports of blocking snow on these routes in late June; dawn-start/dry-day rules already in our data are the right mitigations.
- `me-mratinje-dam` — still the canyon drive's best pull-over; no access restrictions found.
- `me-debeli-brijeg-border` — queue intel and Konfin back-door confirmed current.
- `me-durmitor-black-lake` — €5 NP + €2 parking reconfirmed for 2025/26.
- `me-skadar-lake`, `me-budva`, `me-kotor`, `me-zabljak`, `me-pluzine` — anchors/umbrella pins, intact.

---

## 4. Proposed final core shortlist (~40, ranked)

**Route/logistics anchors — keep on the map, unranked (11):** `hr-dubrovnik-airport`, `me-debeli-brijeg-border`, `hr-peljesac-bridge`, `me-scepan-polje-piva-canyon`, `hr-zadar-old-town`, `hr-split`, `hr-dubrovnik`, `me-zabljak`, `me-pluzine`, `me-skadar-lake`, `me-budva`.

**THE CORE 44 (ranked by group fit × uniqueness × survived-evidence):**

1. `me-tara-rafting-brstanovica` — Europe's deepest canyon at June high water, on the border route anyway
2. `me-veliki-medjed` — the group's own summit wish; honest scramble, dry-morning rule
3. `me-planinica` — "arguably the best view in the park", non-technical, same trailhead
4. `ba-bobsled-track` — the trip's signature weird hit (cable car now 30 KM return — still cheap)
5. `ba-sarajevo` — the one real city stop; Baščaršija + €2.30 beers + festival window
6. `ba-neretva-rafting-konjic` — best value thrill of the trip (€31–45)
7. `hr-cetina-canyoning` — "best thing we did" reviews, 12m jumps, June water
8. `me-trnovacko-jezero` — heart-shaped lake; converts a transfer day into a mountain day (road flagged)
9. `me-kotor` — bay + old town, Jun 27 = 170-pax cruise day
10. `me-kotor-fortress-paid` — the climb is worth €15; dawn start regardless
11. `hr-mljet-np` — the overnight island play (€25 pp confirmed)
12. `hr-odysseus-cave` — free cliff-jump pool, exactly this group
13. `hr-montokuc-mljet` — user-saved, included in the NP ticket
14. `ba-mostar` — overnight for the 21:00 bridge
15. `ba-kravica` — dawn swim under the falls (20 KM)
16. `ba-tunnel-of-hope` — the history stop that survives every skeptic (20 KM cash)
17. `me-virpazar-kayak` — best half-day on Skadar (€20–30 + €5 NP)
18. `me-vinarija-masanovic` — €10/€20 tasting, ten generations, books out
19. `me-pavlova-strana` — the horseshoe bend, free, drive-up
20. `hr-velika-paklenica-gorge` — shaded canyon 54 min from Zadar (€10)
21. `hr-anica-kuk` — summit scramble icon, free
22. `hr-biokovo-tollroad` — Croatia's highest road, booked slot (€15 pp)
23. `hr-sveti-jure` — the payoff summit of #22 (user-saved)
24. `ba-lukomir` — highest village + Rakitnica rim (go via Umoljani hike/jeep)
25. `hr-dubrovnik-sea-kayak` — walls-and-Lokrum sunset paddle (€35–50)
26. `me-mratinje-dam` — the Piva drive's mandatory pull-over, free
27. `me-perast` — baroque half-day, boat €5–10 + €3
28. `me-lovcen-njegos-mausoleum` — 461 steps, all of Montenegro below (€11 pp now)
29. `me-stari-bar` — the deep-south dip that justifies itself (€5)
30. `me-lustica-blue-cave` — go 09:00, swim outside the cave (€15–25)
31. `me-tara-bridge-zipline` — €25 add-on at the rafting put-in
32. `ba-trebinje-old-town` — the €35-apartment base that funds everything else
33. `hr-zrmanja-kayaking` — the inland-route active day (€55–65)
34. `hr-zavizan-dark-sky` — new-moon window Jun 16–18 only; €7 + macadam
35. `ba-tjentiste-monument` — 2-minute brutalist monster, free
36. `me-ostrog-monastery` — free, before 09:00
37. `hr-mali-ston-oysters` — €2.50 oysters on the bridge approach
38. `me-tanjga-kotor` — the value legend, queue is the only price
39. `ba-sarajevo-petica-ferhatovic` — the ćevapi gold standard (€3–7)
40. `hr-kantun-paulina` — Split's queue-worthy institution (€5–8)
41. `ba-tima-irma` — Mostar's heaped plates, early lunch
42. `me-oro-zabljak` — the post-summit kačamak/lamb dinner
43. `me-budva-oldtown-bars` — the night-out night (jazz-paced in June)
44. `hr-punta-rata` — the Jun 18 morning swim (park early, €11)

**Bench — survivors NOT in the core (11; keep as `backup`, promote on condition):**
- `hr-knin-fortress` (€3–4 — auto-promote if the inland Zadar→Split route wins)
- `hr-tulove-grede` (auto-promote with the inland route; stay on trail — mines)
- `hr-ston-walls` (€10; promote if a Ston half-day materializes — oysters already cover the stop)
- `ba-blagaj` (€5; classic but bus-crushed midday — promote if the Mostar day runs long on time)
- `ba-pocitelj` (free 30-min stop if passing at golden hour)
- `me-sveti-stefan` (free photo+swim stop now — islet closed until Jul 1)
- `me-ploce-beach` (party option; watch the bills)
- `me-durmitor-black-lake` (as a standalone pin — the summit days start there anyway; it's the built-in "we're tired" fallback)
- `hr-gricko-grill-zadar` (open; redundant with three better-placed ćevapi institutions)
- `hr-konoba-feral-brela` (excellent but €30–60 pp and 3-day booking friction)
- `hr-barba-dubrovnik` (good cheap seafood; Dubrovnik time is thin — grab it if the kayak day allows)

**Demoted (4):** `me-nevidio-canyon`, `hr-veliki-prstavac`, `me-biogradska-gora`, `hr-buza-bar` (see §1).

*Bookkeeping: 44 core + 11 anchors + 11 bench + 4 demoted = 70.*
