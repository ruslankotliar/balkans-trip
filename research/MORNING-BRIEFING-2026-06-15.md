# ☀️ Morning briefing — what I did overnight (2026-06-15)

You went to sleep and asked me to work autonomously and back everything up. Done. **Nothing was lost — full backups taken first** (see end). Everything below is live in Supabase already, except the app code change, which needs your OK to deploy.

## TL;DR
The plan was already structurally solid. Overnight I (1) **restored a dead safety panel** in the app, (2) **rebalanced all 13 days toward activities over passive meals** — exactly your three messages — and (3) backed everything up. The trip is now activity-led: most days have 3–5 activities, food is mostly camp-cook/quick with **6 special sit-down meals** kept.

## The biggest changes (all live, all reversible)

**Your two corrections, applied:**
- **D4 Mljet kayak restored** as the day's highlight (I'd wrongly cut it); the sit-down dinner there is now a camp-cook/quick default.
- **Food re-planned trip-wide** to your rule (cook at camp / grab quick / few special meals). Demoted 7 generic sit-downs → options; kept 6 special meals: Konoba Feral peka (D2), Blagaj trout terrace (D5), Etno Sočica Piva terrace (D7), Or'O post-summit (D8), Konoba Mostina Skadar carp (D9), Mašanović winery (D10). Full plan: `research/food-strategy-2026.md`.

**"Many days have unused time" → filled the slack with activities** (all self-rent/swim, on-zone, on-taste):
- D1 Skradin swim (legal Krka-area swim) · D3 Cavtat swim *during* the airport dead-window · D5 got a swim-canyon + a Neretva kayak at camp (5 activities now) · D8 a post-summit recovery lake swim (kept light on purpose) · D9 a river swim + merged the duplicate Karuč stop into the kayak · **D10 went from 2 stops to a real Skadar water day** (self-rent SUP + secret cove) · D13 an early swim before the kayak.
- Self-rent water **upgrades**: Boračko (D6) and Piva Lake (D7) are now SUP/kayak, not passive swims.

**Verified the new self-rent activities** (a separate adversarial web check): all real, self-rent confirmed — Jablanica Neretva kayak (Neretva Kayak Safari, ~€20–26pp, WhatsApp ahead), Virpazar SUP (Boat Milica, €10pp/1h or €40pp/day — say "self-guided"), Piva Lake kayak (Nature Park Piva info center, not the "Hook" bar), Boračko (pedalo/rowboat at the beach). Fixed 5 wrong pins (the Jablanica put-in was 3.7 km off) — all corrected live. Operator names + numbers are in each stop's note in the app.

**App: restored the hidden safety sheet** — emergency numbers (112 + per-country), breakdown/accident/police/medical/mountain-rescue playbooks, hospital-by-zone with working map pins, driving/border/fuel/cash rules, survival phrases. It was 547 lines of dead code; now it's the second half of the ✅ Essentials panel and works fully offline. Also fixed two stale checklist items (skydive→Krka; Mljet ferry times).

## ⚠️ The one decision waiting for you: DEPLOY
The **app code change** (safety panel + checklist fixes) only reaches everyone's phones if you **deploy** (push to GitHub → Pages). I did **not** deploy — that's your call and it touches all 4 devices. Since the trip is tomorrow and the safety sheet is genuinely useful on the road, I'd **recommend deploying it today**. The change is committed on branch `autonomous-session-2026-06-15`; build is clean. To ship: merge to `main` and push (or tell me to). The **plan changes are already live** (Supabase) and need no deploy.

## ✅ Book / do TODAY (Jun 15) before you leave
1. **Sicily By Car cross-border letter** (+385 23 646 547) — must have it in hand at pickup tomorrow (BiH+ME on the contract + green card).
2. **Krka NP timed tickets** (np-krka.hr) for tomorrow — go efficient (swim is at Skradin, in-park swimming is banned).
3. **Biokovo toll-road slot** (shop.pp-biokovo.hr) for D2 ~06:30 — 20 cars/hr, sells out.
4. **Cetina canyoning** (D2) + **Tara rafting** (D7, raftingtara.com) + **GO2FLY paragliding** (D11) — reserve ahead.
5. **Mljet ferry**: pre-buy Prapratno→Sobra online; you catch the **20:30 last sailing** D3 after the 17:20 pickup (tight — the #1 risk).
6. Buy **gas canisters in Zadar D1** (can't fly with them); big self-cater shop in **Bosnia** (cheapest).

## The plan as it stands now
(See `research/REAL-PLAN-supabase.md` for the timed version with notes.)

**D1 Tue Jun16:** Zadar Airport · Krka National Park · Skradin town beach · Kantun Paulina · Ramova Beach  🛌 Camping Krvavica

**D2 Wed Jun17:** Biokovo NP scenic toll road · Sveti Jure · Cetina Canyoning · Konoba Feral · Makarska  🛌 Camping Krvavica

**D3 Thu Jun18:** Baćina lakes · Pelješac Bridge · Walls of Ston · Mali Ston oysters · Cavtat Rat peninsula swim & snorkel coves · Dubrovnik Airport · Prapratno ferry port  🛌 Autokamp Mungos (Babino Polje, Mljet)

**D4 Fri Jun19:** Odysseus Cave · Self-rent kayak / SUP on the Mljet salt lakes · Kravica Waterfalls · Počitelj  🛌 Home in Poplat

**D5 Sat Jun20:** Blagaj Tekija · Blagaj Buna-spring trout terraces · Buna River Swimming @ Blagaj · Stari Most Bridge Jump · Mostar · Tima-Irma · Fortica Hill · Drežnica / Drežanka canyon · Jablanica Kayak Safari  🛌 Ravna Camping

**D6 Sun Jun21:** Battle of Neretva Museum & sunken bridge · Boračko Lake · Buregdžinica ASDŽ · Sarajevo · Ćevabdžinica Petica Ferhatović · Žuta tabija · Kino Bosna · Baščaršija bar cluster  🛌 Home in Pale

**D7 Mon Jun22:** Tara Canyon rafting · Šćepan Polje → Piva Canyon drive · Mratinje Dam · Piva Lake · Etno Restoran Sočica  🛌 Home in Boričje

**D8 Tue Jun23:** Prutaš · Vražje jezero · Restaurant Or'O  🛌 Auto Camp Mlinski Potok (Žabljak)

**D9 Wed Jun24:** Ostrog Monastery · Enjoy Skadar Lake kayak base · Rijeka Crnojevića · Konoba Mostina · Pavlova Strana viewpoint  🛌 Home in Rvaši

**D10 Thu Jun25:** SUP self-rent on Skadar · Murići → Beška island self-swim / €20 boat-taxi · Pješačac beach · Vinarija Mašanović  🛌 Home in Rvaši

**D11 Fri Jun26:** Tandem Paragliding Brajići → Bečići · Sveti Nikola Island · Budva Old Town · BBQ Tanjga · Kotor Old Town + San Giovanni Fortress hike · Kotor Old-Town Bars  🛌 Camping Mimoza (Donji Stoliv, Kotor Bay)

**D12 Sat Jun27:** Pasjača Beach · Cavtat self-drive boat rental  🛌 Camping Kate (Mlini, near Dubrovnik)

**D13 Sun Jun28:** Sveti Jakov beach · Dubrovnik Sea Kayaking · Bellevue · Barba · Dubrovnik Old Town · Peppino's Gelato · Dubrovnik Airport  🛌 —

## If anything looks wrong — revert
Full pre- and post-change backups are in `backups/` (two timestamped snapshots + `restore.py` + `RESTORE.md`), committed to git on branch `autonomous-session-2026-06-15`. Any single change is one Supabase row — tell me what to undo and it's a one-liner. Every cut place is demoted to an **option** (still on the map under "options nearby"), not deleted.

— Notes I left for you to weigh in the morning: **D5 is now options-rich** (5 activities: bridge jump, Fortica zipline, Buna swim, Drežnica canyon, Neretva kayak) — great menu, drop what you're tired of. **D10** gives you a choice: the Virpazar SUP cluster *or* the far-south Murići/Beška push (doing both = a big driving day).
