# Special-stay / "WOW villa" tier (Tier 3) — per-zone notes (2026-06-11)

Owner: the special villa/house tier only. Practical per-zone apartments (Tier 2) and the
user's own Airbnb wishlist live in `accommodation-wishlist.json` (a parallel agent) — these notes
do NOT compete with that; everything here is **scenic / rural / waterfront, not a city-center flat.**

## Method & data caveats (read first)

- Scraped Airbnb **search** pages with curl + a desktop User-Agent and parsed the embedded
  `<script id="data-deferred-state-0">` JSON for each listing's id, title, coordinates, rating,
  review count and the **per-night price for 4 adults** (the "N nights x €X" breakdown gives the
  true nightly even when the headline total is for a min-stay). Search was the only price source —
  Airbnb strips price from the anonymous listing-page API.
- For every candidate kept below I then fetched the individual **/rooms/<id>** page and parsed the
  property **description** straight from the deferred state (the quotes below are verbatim from the
  listings) and cross-checked location by **reverse-geocoding the coordinates** (Nominatim/OSM).
  Coordinates are the listing's own pin (Airbnb fuzzes the exact spot ~150 m until you book) and all
  reverse-geocode to the rural village/area claimed — none is a town centroid.
- **Review TEXT could not be scraped** — Airbnb loads reviews via a separate authenticated GraphQL
  call, and WebFetch is 403-blocked by Airbnb. So the "why special" judgment rests on (a) the
  verified description, (b) the verified ★rating + review COUNT, and (c) independent web sources
  where I could find them (Jablan Winery, Cold River treehouse). Star/review counts are current.
- **Dates are route-skeleton ESTIMATES** (Zadar Jun 16, Makarska Jun 17, Mljet/Pelješac Jun 20,
  Konavle/Trebinje Jun 18, Mostar Jun 21, Konjic/Bjelašnica Jun 22, Žabljak Jun 23, Skadar Jun 25,
  Budva Jun 26, Kotor Jun 27). Prices are directional — re-check at booking.
- Budget target ~€100–130/night for 4. A couple of stretch picks (€155, €170) are kept but **flagged
  on price**; several great units sleep 4 on only 2 beds and are **flagged on bedding**.

---

## THE SINGLE MOST SPECIAL STAY OF THE TRIP

**The Winemaker's House — Jablan Winery, Rvaši (Lake Skadar)** — `me-villa-jablan-winery-rvasi`,
~€96/night, ★4.86 from **219** reviews.

A 300-year-old stone house that *is* the heart of **Montenegro's only Demeter-certified organic
winery**, on a hillside above Rvaši on Lake Skadar. Verbatim: *"Imagine waking up, opening the
shutters of a 300-year-old stone house, and seeing vineyards and meadows in front of you. No noise."*
Independent sources (montenegropulse, mnevillage.gov.me, argophilia) confirm: family-run hillside
winery, wake to birdsong and wild herbs, **guided tasting of small-batch organic wine made meters
away**, farm-to-table lunch, free mountain bikes, sunset over the mountains from a private terrace —
all inside the national park yet ~30 min from Podgorica. It is the rare stay that is itself a
half-day experience, it is on-route for the Skadar leg, AND it lands in budget. Nothing else on the
loop combines this much character, this proven a track record (219 reviews), and this price.
*Caveat:* 1BR / 2 beds → sleeps 4 max; verify the bedding suits 4 adults (a 2-couple group is ideal).

---

## Per-zone picks

### Zadar hinterland & islands  — WEAK in budget (flag)
Inland Ravni-Kotari "pool villas" near Zadar are real but all **€150–420/night** (Vila Ivona,
Oliva Vallis, Dedaj Resort, Villa Daisy) — over budget. The genuinely special *in-character*
options are on **Dugi Otok**, but they're ferry-dependent (off the mainland Day-1 route) and pricey.
- **WOW (conditional): Grandpa Mate House**, Dragove, Dugi Otok — `hr-villa-grandpa-mate-dugi-otok`,
  ~€170/n, ★4.92/25. A 1930 island house built by an emigrant back from New York, kept original with
  "modern retro comfort," near Sakarun/Veli Žal beaches. Lovely story and setting — but **over budget
  and needs the Dugi Otok ferry.** Include only if Day 1 becomes an island day.
- Runners-up (apartments, so Tier-2-ish): "amazing view" apartments in Sali ★4.86–4.88/72 (€105),
  Poljana ★4.98/44.
- **Verdict:** no in-budget rural WOW on the mainland for the single Zadar night — the other agent's
  practical Zadar flat is the sensible call unless you island-hop.

### Makarska Riviera / Biokovo slopes  — solid back-country picks
The coast itself is wall-to-wall sea-view apartments (Tier 2). The villa-tier signal is **inland**,
in the Biokovo/Imotski hinterland villages (Krivodol, Grubine, Cista Provo) — stone cottages in the
hills 10–15 km above the sea, away from the crowds.
- **WOW: Magical cottage in the mountains near the sea**, Krivodol — `hr-villa-magical-cottage-krivodol`,
  ~€112/n, ★4.94/17. *"Escape to your idyllic holiday home nestled in the tranquil countryside, just
  15 km from the Adriatic… rustic yet modern retreat."* **FLAG: 1BR / 2 beds** (sleeps 4 nominally).
- **Runner-up next door: "paradise in forest close to the sea"**, Krivodol (id 1054929404657769777),
  ★5.0/12, ~€117 — *"The whole group will be comfortable in this spacious and unique space in
  beautiful nature."* Same 2-bed caveat.
- Also seen: Stone villa Rafael (Slivno) ★4.94/17 and "Villa Stillness" (Cista Provo) ★4.9/20 €82 —
  cheaper but more apartment-like.

### Pelješac & Mljet  — good island-village + isolated-cottage options
Mljet itself is thin on true villas (mostly apartments — Villa Evita, Prožurska Luka ★4.9/129 €100,
is the best-rated but a flat). The villa-tier lives on **Pelješac/Korčula**.
- **WOW: Villa Mare Jabuka**, Žrnovo (above Korčula town) — `hr-villa-mare-jabuka-zrnovo`, ~€111/n,
  ★4.93/28. Newly renovated **village house**, quiet/green, 3.5 km from Korčula centre, 3 private
  baths, sleeps 6 — a relaxed island-village base away from the harbour bustle.
- **WOW (stretch): Mlinica stone cottage with jacuzzi**, Brijesta (Pelješac) —
  `hr-villa-mlinica-brijesta-peljesac`, ~€155/n (**over budget**), ★4.91/65. *"beautiful stone house
  with jacuzzi… completely quiet… overlooking the entire bay,"* covered terrace + jacuzzi + BBQ in
  oyster/wine country. Genuinely special if the group splurges a Pelješac night.
- **Verdict:** Mljet = camp or apartment; the WOW is on Pelješac/Korčula.

### Konavle / Cavtat & Trebinje countryside  — WOW is in the BiH hinterland, not Cavtat
Cavtat/Konavle is expensive sea-view apartments (★4.8–5.0 but €150–420/night; Villa Luigi w/pool
€420, Villa Antonija pool €409). No in-budget rural villa surfaced on the Croatian side — flag.
The far better-value, more *characterful* option is just across into Herzegovina (Popovo polje):
- **WOW: Village House, Čvaljina** (Popovo polje, Ravno/Trebinje hinterland) —
  `ba-villa-village-house-cvaljina`, ~€82/n, ★**5.0**/46. Traditional rural household, hosts Beba and
  Dragan, terrace valley views, the **Ćiro bike trail** at the door, walking distance to the 13th-c.
  **Zavala Monastery** and **Vjetrenica** (BiH's most important cave); ~25 min to the coast, ~1 h to
  Dubrovnik. Beats any city flat and fits the airport-pickup-night "sleep toward Trebinje/Konavle"
  logic in the skeleton.
- Note: Trebinje TOWN itself is all central apartments (Tier 2) — even the "FoRest & Relax" ★4.97/37
  is a town condo. No rural WOW inside the town.

### Neretva valley & Herzegovina hills around Mostar  — STRONG zone (two WOWs)
- **WOW #1: Cold River Treehouse with private sand beach**, on the river Bunica near Buna/Blagaj —
  `ba-villa-cold-river-treehouse-bunica`, ~€112/n, ★4.92/**106**. *"romantic nature spot nestled on
  the bank of tranquil river Bunica… Cold River camp consists of four Treehouses… rent a kayak and
  paddle to River Grill for delicious BBQ (breakfast delivered)… lay in a hammock on a sandy beach."*
  Guest review (Booking/Airbnb): *"Super cosy and unique experience,"* feels remote yet close to
  Mostar/Blagaj/Kravica. 10 min from the Old Bridge. **A treehouse with a private river beach** — one
  of the most distinctive stays on the whole route, and it sleeps 4 on real beds.
- **WOW #2: Kostela Stone House**, Poplat/Berkovići (Stolac hinterland) —
  `ba-villa-kostela-stone-house-poplat`, ~€119/n, ★4.94/**157**. Modernly restored old stone house in
  a **plantation of aromatic plants**, big patio + landscaped garden, deeply rural. Heavily proven
  (157 reviews) and on the Mostar→Trebinje line. (Also in the user's wishlist — now confirmed
  available with a price.)
- Runner-up: **River View Buna-Mostar** tiny home (Buna village), ★4.97/119, €118 — riverside, very
  high reviews, more apartment-like than the treehouse but a strong fallback.

### Bjelašnica / Konjic highlands  — WEAK for proven in-budget WOW (flag)
Searched Boračko jezero, Konjic, Bjelašnica. Almost everything that surfaced was Sarajevo flats
(off-mood) or thin: "Lake House" at Boračko ★4.64/14, "Bjelašnica Lodges 2" (a real chalet, ~€141,
but **no reviews yet** — unproven and over budget). No standout, well-reviewed mountain chalet in
budget appeared for the Konjic night.
- **Verdict:** for the Konjic/Bjelašnica night, take a Tier-2 apartment or camp — OR, since this night
  is geographically close to Mostar, lean on the **Cold River treehouse / Kostela** instead (they're
  the WOWs for this whole Herzegovina stretch). Revisit Bjelašnica Lodges if reviews accumulate.

### Durmitor / Žabljak & Piva / Sinjajevina  — good mountain options
Town Žabljak is apartments/bungalows (Tier 2: Mountain Story ★4.95/87 €117, Bungalow Krstajić). The
villa-tier is glamping + cabins out in the highland/parks.
- **WOW: Eternum Glamping**, Ninkovići (just outside Žabljak) — `me-villa-eternum-glamping-ninkovici`,
  ~€117/n, ★**5.0**/17. *"finding peace in heart of nature… awesome view on mountains… everything has
  luxury touch."* **FLAG: 2 beds** for 4 — verify bedding.
- **Runner-up (Sinjajevina/Bjelasica side): Mountain Cabin Suvodo**, Biogradska Gora —
  `me-villa-suvodo-biogradska-gora`, ~€82/n, ★4.98/46. 2BR cabin in the heart of the NP, *"where you
  listen only to the swarm of bees and chirping of birds,"* sleeps 5. **Off the direct loop** (NE of
  Mojkovac) — attach a detour cost.
- **Runner-up: Mountain Star House**, Mojkovac — `me-villa-mountain-star-mojkovac`, ~€94/n, ★5.0/10.
  Between Sinjajevina & Bjelasica, over the Tara at Mojkovac; good if routing Durmitor→south via
  Mojkovac. Newer (10 reviews).

### Skadar Lake villages (Rvaši / Godinje / Virpazar)  — STRONGEST zone overall (three WOWs)
This zone is the densest cluster of genuinely special lake/vineyard stone houses in budget.
- **WOW #1 + TRIP FLAGSHIP: The Winemaker's House — Jablan Winery, Rvaši** (see top section) —
  `me-villa-jablan-winery-rvasi`, ~€96/n, ★4.86/**219**.
- **WOW #2: Above the Lake**, Bobija — `me-villa-above-the-lake-bobija`, ~€116/n, ★**4.99**/110.
  Wooden cottage *above* the lake, *"stunning lake views, fresh air, and beautiful sunsets… spacious
  terrace… kayaks for rent to explore the lake's hidden beauty."* 2BR / 4 beds — comfortably sleeps 4.
- **WOW #3 (for the adventurous): Wild Beauty House**, Žabljak Crnojevića —
  `me-villa-wild-beauty-skadar`, ~€116/n, ★**4.99**/83. *"can be approached only by boat what makes
  it unique… kayaks are free… restaurant with local fresh fish just on the other side of the river."*
  **Arrive by boat** — maximum isolation. **FLAG: 2 beds** for 4.
- Other strong runners-up that surfaced: "Wild Beauty house Skadar lake" siblings, Holiday home
  Bobija (★4.95/101, €118), Villa Skadar Lake Dodoši (★4.8/149, €129), Rustic Homestead Drušići
  (★5.0/11, €105). The user's wishlist Godinje/Rvaši houses (Ivan's, Family house Rvasi) also sit
  here. **A whole night could be built around this zone — it is the trip's accommodation high point.**

### Bay of Kotor & Luštica  — WEAK for in-budget rural villa (flag)
The Bay is fundamentally **sea-view-apartment** country (Tier 2): best-rated affordable options are
Apartments Albomi (Kotor) ★4.96/96 €88, Modern apt w/ bay view (Škaljari) ★4.95/215 €117, "The
Legendary Apartment" (Dobrota) 5.0/57 €141 — all flats, not standalone villas. True villas with pools
(Orahovac, Muo) run €200–350. Stone-house villages (Stoliv/Prčanj) yielded only apartments + a couple
of €170+ outliers (Casa Antica houseboat, VillaS&T €193). Luštica proper didn't surface affordable
entire-villa stock.
- **Verdict:** for the Kotor night, an in-budget Tier-2 sea-view flat is the right call; if the group
  wants a villa-tier *moment* in the Bay it means paying up (€200+ Orahovac villa or a Perast palace
  suite). The nearby Skadar WOWs cover the "special Montenegro stay" need far better in budget.

### Hills behind Budva  — WEAK in budget (flag)
Above Sveti Stefan/Pržno/Blizikuće = pricey sea-view apartments with pool access (Sea View Escape
Above Sveti Stefan ★4.86/22 €106 — a flat; Family Luxury Villa overlooking the sea €627). The one
in-budget standalone *house* with character that surfaced here was actually **"Above the Lake"** at
Bobija (it shows up because it's inland between Budva and Skadar) — already counted under Skadar.
- **Verdict:** no distinct in-budget villa WOW specifically in the Budva back-hills; use a Tier-2 flat
  for a Budva party night, or sleep at the far nicer Skadar cluster the night before/after.

---

## Summary table (WOW pick per zone)

| Zone | WOW pick | €/night (4) | ★ / reviews | Why |
|---|---|---|---|---|
| Zadar hinterland & islands | Grandpa Mate House (Dugi Otok) | ~€170* | 4.92 / 25 | 1930 island house, NYC story; *over budget + ferry* |
| Makarska / Biokovo | Magical cottage, Krivodol | ~€112 | 4.94 / 17 | hill cottage 15 km above the sea; *2 beds* |
| Pelješac & Mljet | Villa Mare Jabuka (Žrnovo, Korčula) | ~€111 | 4.93 / 28 | quiet island-village house, sleeps 6 |
| Konavle/Cavtat & Trebinje | Village House, Čvaljina (Popovo polje) | ~€82 | 5.0 / 46 | rural household, monastery + cave + bike trail |
| Neretva / Mostar hills | Cold River Treehouse (Bunica) | ~€112 | 4.92 / 106 | treehouse w/ private river beach + kayaks |
| Bjelašnica / Konjic | — (no proven in-budget WOW) | — | — | use Tier-2/camp or lean on Mostar WOWs |
| Durmitor / Žabljak & Piva/Sinjajevina | Eternum Glamping (Ninkovići) | ~€117 | 5.0 / 17 | highland glamping, mountain views; *2 beds* |
| Skadar Lake villages | **Winemaker's House, Jablan Winery (Rvaši)** | ~€96 | 4.86 / 219 | **TRIP FLAGSHIP** — 300-yr stone house at organic winery |
| Bay of Kotor & Luštica | — (no in-budget rural villa) | — | — | Tier-2 sea-view flat; pay up for a true Bay villa |
| Hills behind Budva | — (no distinct in-budget WOW) | — | — | use Tier-2 flat / sleep at Skadar instead |

\* over the ~€130 budget and/or ferry-dependent.

**Zones with NO genuine in-budget villa-tier option (honest):** Bjelašnica/Konjic, Bay of
Kotor/Luštica, hills-behind-Budva, and the Zadar mainland (its only WOW is an over-budget island
house). Everywhere else has at least one true scenic WOW in budget; **Skadar Lake and the
Neretva/Mostar hills are the two standout zones**, with Skadar's Jablan winery house the single most
special stay of the trip.
