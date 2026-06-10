# Airbnb wishlist — enrichment & decision layer (2026-06-10)

Enriches the user's two Airbnb wishlists ("Bosnia" 19 + "Montenegro" 5 = 24 listings) into map pins,
then judges each against the actual route and proposes better-value alternatives per overnight zone.

**Framing (from the user):** the wishlist is a *taste sample* from casual browsing, not a final list.
The job is the best solution, not validating the wishlist. So below I say plainly which wishlist items
are poor value or off-route, and add found alternatives. All 24 are in the data as `status:shortlist`
(taste signal — demote in the UI); the 18 alternatives are `status:candidate`.

## Data caveats (read first)

- **Prices** (`cost`): scraped from Airbnb's *search* results (which DO render a price) for the sample
  dates, all-in nightly for 4. I got prices for **15 of 24 wishlist listings + all 18 alternatives**.
  Airbnb strips price from the anonymous *listing-page* API, so search was the only route.
- **9 wishlist listings never surfaced in June availability searches** even with a wide box and a
  4-night window. That is itself a signal: they are most likely **already booked for mid/late June**
  or carry a **min-night** that excludes short stays. Flagged below; treat "no price" as "verify
  availability before counting on it."
- **Dates are route-skeleton estimates** (BA sampled Jun 21–23, ME Jun 24–26), *not* final. Final dates
  depend on the itinerary. Prices are directional, fine for comparison; re-check at booking.
- **Cancellation policy could NOT be scraped** — it is gated behind the same anonymous wall as price.
  So the book-now/wait section below uses **market thickness** (how many available, well-rated 4-guest
  options exist in a zone) + uniqueness as the proxy, and tells you what to verify in the UI.
- Coordinates come from each listing's own embedded pin (Airbnb fuzzes exact location ~150 m until you
  book — fine for a map). Ratings/review counts are from the listing pages (verified, current).

## The headline: most of the "Bosnia" wishlist is off our route

The Bosnia wishlist skews to **NW / central Bosnia**, which our SE loop (Mostar → Konjic →
Sutjeska → Šćepan Polje) never touches. Concretely off-route:

| Listing | Where | Detour reality |
|---|---|---|
| Šipovo ×5 (Sokograd Loft/Attic, River Cabin Ana, Apartment Stanic I & II) | Šipovo 44.27,17.08 (NW Bosnia) | ~150 km / ~2.5 h **NW of Mostar**, a dead-end → ~5 h round-trip off the loop. Drop unless the trip goes NW. |
| Kamp Kestenovac | Orašac/Bihać 44.64,16.04 | ~250 km off — far NW corner (Una NP). Different trip. |
| Container House Kod Čupe | Kupres 44.03,17.23 | Kupres plateau, ~90 km N of Mostar on the Split→inland road — not our coastal approach. |
| Šehić Weekend House | Borovnica 44.36,18.18 | Central Bosnia near Visoko, off the loop; only 1 review. |
| Petrovf place | Urija 44.12,17.39 | Central Bosnia (Donji Vakuf), off-route **and 0 reviews** (unproven). |
| Apartment Ružica 6 | **Zastražišće, HVAR — Croatia, not Bosnia!** 43.15,16.89 | Mis-filed: it's on Hvar island (needs a ferry; the big N islands likely don't fit). Tagged `hr-` in the data. |

That's **9 of 19 Bosnia listings effectively off-route.** Not a criticism of taste — they're nice — but
they don't fit the Dubrovnik-anchored SE loop. They're in the data (you may overrule me) but I'd demote them.

## Wishlist items that ARE on/near the route

| Listing | Coords | Zone it serves | €/night | Cap | Verdict |
|---|---|---|---|---|---|
| **Family house Rvasi** | 42.37,19.10 | Skadar (NW shore, Cetinje/Rijeka Crnojevića) | €82 | 5 | Scenic lake-village house, ★4.96. On-route but pricey vs Virpazar options. |
| **Ivan's holiday home** | 42.22,19.11 | Skadar (Godinje wine village, S shore) | €80 | 6 | Great location, ★4.78/83. On-route; a touch pricey. |
| **Holiday Home Darja** | 42.20,19.05 | Skadar→coast / deep-south (nr Bar) | €68 | 5 | Solid, ★4.93/56. On-route for the southern leg. |
| **Mountain Lodge (Duži, Šavnik)** | 42.98,19.03 | post-Durmitor (Žabljak→Ostrog road) | n/a* | 4 | Remote, unique cabin, ★5.0/17. Could be a quiet Durmitor-exit night. *Didn't surface — verify availability.* Sleeps exactly 4. |
| **Kostela Stone House** | 43.03,18.02 | Mostar→Trebinje (Stolac/Berkovići hinterland) | n/a* | 5 | **Proven gem: ★4.94 from 157 reviews.** On the southern Herzegovina line. *Didn't surface for June — popular, likely filling.* |
| **Mountain Camp Burrows** | 43.26,18.65 | Sutjeska→ME / Trebinje axis (Gacko) | n/a* | 5 | Bungalows, ★4.86/98. Roughly on the SE corridor. *Didn't surface — verify.* |
| **Diva Cottage (Rama)** | 43.83,17.49 | Mostar→Konjic (marginal) | €107 | 5 | Lake Rama, ~40 km / ~45 min NW of Konjic. Detour + pricey — skip unless you want a Rama day. |
| **4seasons Pale / Panoramic Chalet / Vikendica IVA / HaDaNa / Nisicka Oaza** | 43.7–43.9, 18.4–18.6 | Sarajevo-night only | €64–93 | 4–6 | All cluster E/N of Sarajevo. On-route **only if you do a Sarajevo overnight** (which costs just +13 min driving — see drive-times.md §3). Then Pale/Jahorina is a 15–20 min add. |
| **Zen House Sarajevo (hot tub)** | 43.78,18.20 | Sarajevo-night (W edge, Hadžići) | n/a* | 4 | ★4.95/62, hot tub. Good Sarajevo-night candidate. *Didn't surface — verify.* Sleeps exactly 4. |

\* = price not retrieved; listing didn't appear in June searches (likely booked or min-night).

**Montenegro wishlist off-route:** *Mountain view chalet, Bijelo Polje* (42.99,19.71) — popular (★4.92/187)
but ~70 km E of Žabljak toward Serbia; a Durmitor→Bijelo Polje→coast detour adds ~2.5–3 h and points the
wrong way. Drop unless you add a NE-Montenegro day.

## Per-zone ranked recommendation (wishlist vs found alternatives)

Prices are June all-in nightly for 4. "Available now" = count of well-rated 4-guest listings that
surfaced in the zone search (market thickness).

### Mostar (Jun 21–22 area) — THICK market (~25 available)
Wishlist has **nothing in Mostar itself**. Found alternatives beat the wishlist here:
1. **Apartment City Center Mostar** — €53, ★4.94/271. *Value champion, walk to Old Bridge.*
2. **The Old Almond** — €48, ★4.81/81. *Budget, by the Old Town.*
3. Apartment Neretva — €76, ★4.95/101 (higher-end).

### Sarajevo (optional overnight) — THICK (~26 available)
1. **The Pearl Downtown** — €48, ★4.95/55. *Value champion.*
2. **Baščaršija Center** — €62, ★4.88/83 (old-bazaar quarter).
- vs wishlist: Zen House (hot tub, €n/a) and the Pale/Jahorina cottages are *nicer/quirkier* but out of
  town. If you want city + walkable old town, the alternatives win; if you want a mountain cabin night,
  Vikendica IVA (★4.98/40, €64) is the pick of the wishlist cluster.

### Konjic (Neretva rafting night) — MODERATE (~20, but pricey)
1. **Apartments S&S 1** — €66, ★4.9/30.
2. **Guest House Konjic** — €76, ★4.86/87.
- Note: Konjic runs €65+; the lakeside bungalows (Boračko/Jablaničko) are €100+. No wishlist item is in
  Konjic proper (Diva Cottage at Rama is the nearest and it's a detour).

### Trebinje (airport-pickup night Jun 18 + final night Jun 27) — THICK & CHEAP (~24, many <€55)
**Best-value zone on the whole trip, and 58 min from Dubrovnik airport.**
1. **Gaga City Center** — €35, ★5.0/48. *Outstanding.*
2. **FoRest & Relax** — €53, ★4.97/37.
3. **SANSSOUCI Apartment** — €56, ★5.0/28.
- No wishlist item here. This is where the freed-up "don't backtrack the Croatian coast" time pays off
  cheaply (per CLAUDE.md time-weighting).

### Žabljak (Durmitor, 2 nights) — MODERATE, June demand pushes prices (~26, €65–93)
1. **Black Pine 2** — €65, ★4.84/25. *Cheapest well-rated.*
2. **Bungalow Krstajić 2** — €70, ★4.76/120 (classic, lots of reviews).
- No wishlist item in Žabljak (Mountain Lodge Šavnik is 35 km south). Žabljak fills in high season —
  see book-now below.

### Skadar Lake (Virpazar, ~Jun 25) — MODERATE-THIN for lakeside (~19)
1. **Feel the village (Virpazar)** — €48, ★4.9/68. *Value champion.*
2. **Villa Semeder** — €70, ★4.91/142.
- vs wishlist: **the wishlist's lake-village houses (Rvaši €82, Godinje/Ivan's €80) are the more
  characterful, scenic picks** — genuine lakeside villages, not town apartments. If the vibe matters
  here, the wishlist wins; if it's just a sleep, Feel the village is €34 cheaper.

### Kotor (~Jun 27) — quantity THICK but value-THIN (~26, €70+ floor)
1. **Victoria's place** — €70, ★4.86/93. *Cheapest decent option.*
2. **Apartments Albomi** — €88, ★4.96/96.
- Kotor is the **priciest zone**. Consider sleeping in **Budva** (cheaper, livelier) or even Tivat and
  day-tripping Kotor's fortress early.

### Budva (~Jun 26) — THICK (~26)
1. **Masha 1** — €64, ★4.97/140. *Value+quality champion.*
2. **Sea Side, A&B Apartments** — €70, ★4.94/63.

## BOOK-NOW vs WAIT (key deliverable)

Logic: your uncertainty is **dates**, not whether you're going. The safe move everywhere is *book a
**free-cancellation** rate now and adjust dates later* — but only worth doing for **rare gems in thin
markets**. In thick "commodity" zones, waiting costs nothing because equivalent options will still be
there. **I could not read each listing's cancellation policy (gated) — before booking anything, turn on
the "Free cancellation" filter / confirm the policy in the UI.**

### WAIT (commodity zones — equivalent options remain; book late, refundable):
- **Mostar, Sarajevo, Trebinje, Budva** — all thick (~25 available), many cheap+great. Zero penalty for
  waiting until dates firm up. Trebinje especially is a buyer's market.
- **Kotor** — thick on quantity (just expensive); waiting won't lose you a comparable price.

### BOOK SOONER (rare gem and/or thinner market — act once dates are ~firm, refundable rate):
- **Kostela Stone House (Poplat)** — ★4.94/**157**, unique rural stone house, **already not showing June
  availability**. Few equivalents in that hinterland. If you want it, don't wait.
- **Skadar lake-village houses — Rvaši & Ivan's/Godinje** — characterful lakeside village houses are
  *limited* (Virpazar town apartments are not equivalents). Thin for the "village" vibe → book sooner.
- **Žabljak (any pick)** — not rare, but **high-season mountain-town demand**; the cheap end (€65) goes
  first. Book your Durmitor 2 nights earlier than the rest.
- **Mountain Camp Burrows (Gacko)** & **Mountain Lodge (Šavnik)** — unique, remote, thin markets, both
  **not showing June availability**. If either fits the corridor and you want it, grab it early.
- **Zen House Sarajevo** — only if you commit to a Sarajevo night; the hot-tub niche is scarcer than
  generic city apartments.

### DON'T BOOK (off-route — decide whether to drop first):
- All Šipovo ×5, Kamp Kestenovac (Bihać), Container House (Kupres), Šehić (Borovnica), Petrovf (Urija),
  Bijelo Polje chalet, Hvar (Ružica). Resolve route fit before spending energy on these.

## Bottom line
- The **Montenegro wishlist is well-targeted** (Skadar + the corridor); the **Bosnia wishlist mostly
  isn't** — 9 of 19 are off our SE loop.
- For **sleep-anywhere zones** (Mostar/Sarajevo/Trebinje/Budva/Kotor) my found alternatives are
  better value than the wishlist; wishlist shines only where **character + location** matter (Skadar
  villages, the Poplat stone house).
- Net: keep ~6 wishlist items as real contenders, treat the rest as inspiration, and lean on the
  alternatives for the commodity nights.
