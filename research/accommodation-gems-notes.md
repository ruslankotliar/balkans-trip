# Airbnb GEM hunt — deep dive (2026-06-11)

A dedicated hunt for genuinely *special*, well-priced, well-rated Airbnb stays — not the commodity
apartments the wishlist enrichment already covered. Method: queried Airbnb's public map search per
overnight zone (desktop UA + curl), parsed the embedded `data-deferred-state-0` JSON for id, name,
real (fuzzed) coordinates, per-night price for 4 adults, rating, and the Superhost / Guest-favorite /
Top-guest-favorite badges. Then pulled each top pick's listing page to verify `personCapacity` (≥4
required), room type ("Cabin" / "House" / "Cottage" = gem signal), and review count.

**Data caveats (same as the wishlist file):**
- Prices are **all-in nightly for 4, on sample dates** (per zone, matching the route skeleton) — directional, NOT final. Re-check at booking once dates firm.
- Coordinates are Airbnb's own pin, fuzzed ~150 m until you book. Verified each against the correct town/shore.
- I filtered to **Entire home/apt** and confirmed **sleeps 4+** on the listing page for the headline picks (a few search cards under-count "beds" — e.g. "2 beds" but personCapacity 4 via sofa beds; I used the listing-page capacity).
- Cancellation policy is gated (can't scrape) — turn on the "Free cancellation" filter in the UI before booking, especially for the thin-market / book-early zones below.

---

## THE HEADLINE FINDING: the Croatian coast is the problem, not Montenegro/Bosnia

In **mid-June the Dalmatian coast is genuinely expensive** — Zadar city, Omiš, Makarska, Pelješac and
Mljet well-rated entire homes mostly run **€110-280/night for 4**, far above the ~€50 benchmark. Gems
at €50-100 exist but are *scarce* and go first. By contrast **Bosnia and inland/lake Montenegro are a
buyer's market**: Trebinje, Mostar, Konjic, Sarajevo and Skadar have ★4.9+ whole places at **€40-66**.
So the value strategy is exactly what CLAUDE.md already leans toward: **keep Croatian coast nights short
and cheap, spend the comfort budget inland/in Montenegro** where €50 buys a real gem.

## SINGLE BEST-VALUE GEM OF THE TRIP
**Nana's House — entire private house with its own yard, central Mostar — ~€40/night for 4, ★5.0**
(`ba-gem-mostar-nanas-house`, id 1681210440141810898). A *whole house with a private yard* at
room-price, walkable to the Old Bridge. Nothing else on the hunt matches this price-to-product. The only
risk is exactly that it's so good — book it early on a free-cancellation rate.

---

## PER-ZONE: top pick + runners-up

### Zadar / Paklenica (Jun 16) — SCARCE for value; coast is dear
- **TOP PICK: Large apartment, Seline — ~€105, ★5.0** (`hr-gem-seline-large-apartment`). Whole 4-guest place at the foot of Velebit, walk to the sea, 10 min to the Paklenica trailheads — anchors the Plan-M Velebit morning.
- Runner-up: nothing cheaper well-rated surfaced. Zadar *city* is €80-170 (Apartman Aldo 1 ★4.88 €95 / Jasmine ★4.93 €88 if you want to be in town). **Verdict: this zone has no true cheap gem — Camp NP Paklenica (~€50, digest pick) is honestly the better value here.** If you want a roof, book Seline early.

### Omiš / Makarska Riviera (Jun 17) — a few real gems, but book early
- **TOP PICK: A-2808-b near beach, Jesenice/Omiš — ~€68, ★5.0** (`hr-gem-omis-a2808b-beach`). Cheapest ★5.0 on this stretch; beach-walk distance, ideal Cetina canyoning/rafting base.
- Runners-up: **Modern apt *Esthi* ★4.96 €77** (sea view), **Žižula two-bed terrace ★5.0 €109** (twin Žižula II as fallback). Makarska side: **Apartment Soldan 3 ★4.96 €87**, **dorotea 1 ★4.99 €111** (highest-rated on the Riviera).
- Note: most of the Riviera is €150-280 in June — these are the exceptions. Lisičina/Krvavica campsites (digest) still beat them on pure price.

### Mljet / Pelješac (Jun 20) — **THIN + pricey, the scarcest island market: BOOK EARLY**
- **TOP PICK (character): Mlinica — converted watermill cottage with jacuzzi, Brijesta (Pelješac) — ~€155, ★4.91 Superhost** (`hr-gem-peljesac-mlinica-watermill`). A genuine restored stone *mlinica* — exactly the unique property type the user wanted. Secluded bay near the Mljet ferry approach.
- **TOP PICK (value): Roberto Apartment, Ston end — ~€98, ★5.0** (`hr-gem-peljesac-roberto`). Best value on Pelješac, handy for Ston walls + Mali Ston oysters + Dingač.
- **Mljet island itself is a problem**: only ~8 entire-homes surfaced island-wide, €99+ floor. Best on-island: **Seaview apt Rotim ★4.95 €140** (verified sleeps 4) and **Mljet sunrise ★4.9 Superhost €99** (verify it really sleeps 4 — titled "2+2"). **If you do the Mljet overnight, book the bed before anything else, or plan to camp (Autokamp Marina/Ropa, digest).**

### Trebinje / Konavle / Cavtat (Jun 18 pickup + Jun 27 final) — CHEAPEST GREAT ZONE
- **TOP PICK: Apartment NN, Trebinje — ~€49, ★5.0 Top guest favorite** (`ba-gem-trebinje-apartment-nn`). 3-bedroom whole apartment, 58 min from Dubrovnik airport. Perfect rating at a celebration-cheap price.
- Runners-up: **Niksin san ★4.96 €53** (old-town/riverside), **Apartments Ena 1 ★4.79 Superhost €43** (rock-bottom).
- **Important contrast:** the Cavtat/Konavle side of this zone (closer to the airport) is *triple* the price — €95-270 (Cavtat Micika ★4.94 €134 is the nicest mid-option). **Sleep in Trebinje, not Cavtat** — same night, a third of the cost, and it crosses you toward Bosnia.

### Mostar (Jun 21) — THICK + cheap; holds the trip's best-value gem
- **TOP PICK: Nana's House — whole house + yard — ~€40, ★5.0** (`ba-gem-mostar-nanas-house`). See best-value-of-trip above.
- Runners-up: **City Center Apartments #3 ★4.97 €103** (private terrace, by the Kriva Ćuprija — perfect for the 21:00 lit-bridge), **Zara ★4.95 €138** (2-bed, 3 ACs — the roomy/cool upgrade for the heat).

### Konjic (Jun 22, if not Sarajevo) — value here is excellent
- **TOP PICK: Studio with Lake View, Lisičići — ~€46, ★5.0 Superhost** (`ba-gem-konjic-lakeview-studio`). Whole studio over Jablaničko Lake; the value floor of an otherwise €65+ zone.
- Runner-up: **Apartment Konjic ★5.0 Top-guest-favorite €66** (central, by the Ottoman bridge & rafting meet points). Also kept the wishlist's Apartments S&S 1 ★4.9 €66 (4 beds) as a known quantity.

### Sarajevo (Jun 22, the recommended overnight) — THICK; great rating-for-price
- **TOP PICK: Apartman Biber Deluxe — ~€61, ★5.0** (`ba-gem-sarajevo-biber-deluxe`). Whole place in the Baščaršija old bazaar, sleeps 5 — walk to ćevapi, the Trebević cable car, the night out.
- Runners-up: **Apartman Emir ★5.0 €68** (central, sleeps 5), **Kapa Apartment ★4.99 Top-guest-favorite €135** (designer 2-bed above the old town — the splurge). The wishlist's Zen House (hot tub) is still the quirk pick *if* it shows June availability.

### Žabljak / Durmitor (2 nights, Jun 23-24) — MODERATE; June demand bites — BOOK FIRST
- **TOP PICK: Mountain spark — wooden Durmitor cabin — ~€82, ★4.93** (`me-gem-zabljak-mountain-spark`). Cabin character + best rating-for-price, personCapacity 6 (roomy for 4), near the Black Lake / Veliki Međed trailheads.
- Runners-up: **House maslacak ★4.97 €94** (quiet whole house + parking), **A-frame Durmitor ★5.0 €164** (UNIQUE A-frame — the photogenic splurge, but **sleeps exactly 4, no spare bed**), **Ethno house Bajka ★4.75 €152** (traditional timber plateau house at Njegovuđa — the katun/"mountain meditation" vibe). Also kept the wishlist's Black Pine 2 (€65) as the cheap-end anchor.
- **Book the 2 Durmitor nights before any other bed** (digest §6): the cheap end goes first in high season. If the warm bags are real, wild camping in the NP is legal and free-ish (digest).

### Skadar Lake (Virpazar / Rijeka Crnojevića, Jun 25) — MODERATE; lake-village gems are the win
- **TOP PICK: Orahovo cottages — koliba 1, Virpazar — ~€48, ★4.87 Guest favorite** (`me-gem-skadar-orahovo-koliba`). A traditional stone *koliba* by the lake at Virpazar — real village character (not a town flat), right where the kayak + Pavlova Strana + winery half-day starts. **Value champion of the lake.**
- Runners-up: **Cloud 9 House ★4.99 €51** (NE shore lake-view house, Rijeka Crnojevića side), **Apartman Boljević ★4.96 €58** (Dodoši, ~262 reviews — the most *proven* lake gem), **Above the Lake House ★4.99 €116** (ridge-top panorama upgrade). These beat the wishlist's Rvaši (€82) / Ivan's (€80) on either price or rating while keeping the village/lake character.

### Budva / coast (Jun 26, the night-out) — THICK; cheaper & livelier than Kotor
- **TOP PICK: Apartment Got it — ~€98, ★4.94 Guest favorite** (`me-gem-budva-got-it`). Central, sleeps 5, walk to old town and beach for the big night.
- Runner-up: **The House Rooms Family Suite ★5.0 €105** (free parking — genuinely valuable in central Budva). The wishlist's Masha 1 (★4.97 €64) is still the cheapest-great Budva option if value trumps the gem hunt.

### Kotor bay (Jun 27 area) — value-THIN (€70+ floor); sleep on the inner bay
- **TOP PICK: Danilo i Filip, Risan — ~€94, ★4.94 Guest favorite** (`me-gem-kotor-danilo-filip-risan`). Inner-bay (Perast/Risan side) whole apartment, personCapacity 6 — best value in the priciest zone, with the fortress an easy early-morning drive (climb before 8am: free, cool, empty).
- Runner-up: **Glosy Apartment, Dobrota ★4.91 Top-guest-favorite €116** (waterfront just north of the old town, if you want to be right by Kotor). Honest note: **Kotor is the trip's priciest zone** — consider sleeping Budva or even doing the Trebinje back-door for the final night (digest §3) and just day-tripping the fortress.

---

## ZONES WHERE GEMS ARE SCARCE → book early or compromise
1. **Mljet** — thinnest market on the trip (~8 island listings, €99+). Book the bed first or camp.
2. **Zadar/Paklenica** — no true cheap roof; the campsite is the better value. Book Seline early if you want a roof.
3. **Croatian coast generally (Omiš/Makarska/Pelješac)** — the €68-98 ★5.0s are the *exceptions* and disappear first; everything else is €150+. Reserve the cheap ones the moment dates firm.
4. **Žabljak** — not rare, but high-season demand pushes the cheap end out fast; book the 2 nights before anything else.
5. **Kotor** — expensive floor; "compromise" = sleep Budva/Risan or Trebinje and day-trip the fortress.

## BUY SIGNAL summary
- **Book early (refundable):** Nana's House (Mostar, the steal), Mljet beds, Žabljak (any), the A-frame (sells out), Mlinica watermill (unique). 
- **Wait is fine (thick, cheap):** Trebinje, Mostar (other than Nana's), Sarajevo, Konjic, Budva, Skadar Virpazar town.
