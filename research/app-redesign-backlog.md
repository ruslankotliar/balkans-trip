# App redesign + plan-refinement backlog

## ✅ DONE (2026-06 redesign session)
Trip mode + Triage removed · detail panel rebuilt (inline info, hours field, no notes, reject→small link) · `extra` status added · accommodations cleaned (kept 5 booked + 43 camps) · filtering→7 groups + map color by group · data review applied (83→extra, 14 reject, 4 cat fixes, dupes) · Essentials→**editable Checklist** (add/edit/delete) + renamed button · 13 requested activities added (boat/fishing/paragliding/skydive/bikes/buggy/ATV) · Plan view: **day-fit verdict + inline leg times + bestTime cues + bigger ↑/↓** · Prutaš desc fixed · **rebalanced 13-day plan authored** (planner→critic→reviser; ~34h drive avg 2.6h/day; Day1 full, Day3 cut to ~5h) → in defaultPlan.ts · **"⟳ Latest plan" publish button** (re-seeds overrides→Supabase) · safe dead-code purge (presets/numberIcon/sliceLegCoords/legFerrySec/unused Essentials). Net +1100/−4865. USER APPROVED plan ("publish + keep refining"); Day 7 ~5.8h kept.

## ⬜ REMAINING (future sessions)
- Routing auto-sequence (auto on load, manual sticks) — CAUTION: must not disturb the now-carefully-sequenced published plan; needs a per-day "manual" flag.
- Booking tracker (date-sorted to-book from bookingLink/phone) · ferry last-boat warnings (ferries.ts).
- Wire per-day start-time + pace (makes the day-fit verdict exact for early-ferry days).
- Deeper dead-code purge: corridor subsystem (CorridorPanel + corridorMatches + render guards) + nearby state + toolsOpen + orphaned CSS (.today*/.mode-pill/.detail-facts/.nearby-*/.preset*/.itin-day-summary). All currently inert (no user impact).
- Remaining data-quality (workflow `wehnvf1v4`): merge near-dup pairs (Vukoje, Drežanka, Blagaj trout, Ada FKK, Kotor kayak); re-pin suspicious coords (ark-bunker-konjic, kotor motorboat, tulove-grede, skadar-self-drive-boat).
- Weave the "unforgettable moments" framings into research/route-skeleton.md.
- Data gaps to research: zero-bed zones, WOW-tier rebalance, hot-day swims, dinner near thin overnights, nightlife in base towns, rainy-day plan-B.

---


Master checklist of everything discussed (June 2026 redesign push). Keep this updated so nothing is lost across sessions. ✅ done · 🔄 in progress · ⬜ todo.

## Product direction (decided)
- App collapses to ONE tool: **Places** (map + list + detail, where you decide) and **Plan** (day-by-day with times). No Trip mode, no Triage.
- Carte blanche to push back on ideas, find better ones, and simplify for max usability.
- **Never lose curated place data.** Deletions must be deliberate + git-recoverable.
- Auto-reorder each day to the fastest driving order **on load**, but a manual **drag overrides and sticks** (auto only (re)applies to days not hand-arranged, or when a day's stops change).
- **Ask questions via AskUserQuestion (ask mode), never in plain chat** — long-running turns hide chat questions.

## Code / UX
- ✅ Remove Trip mode (Today.tsx, GPS, mode toggle/state)
- ✅ Remove Triage/Review (Review.tsx)
- ✅ Detail panel: show all info inline (no click-to-expand accordions); remove "notes"
- ✅ Duration = plain **hours** number field (1, 0.5, 0.25), stored as minutes; data estimate shown as "suggested" hint
- ✅ Remove "find sleep along route"
- ✅ New status **extra** (situational "while you're in the area"; distinct from backup = contingency sleeps)
- ✅ Delete non-camping accommodations (78 removed; kept 5 booked overnights as markers + 43 campsites)
- ✅ Simplify filtering → **category groups** (Eat / Nightlife / Swim / Active / See / Sleep / Logistics); map pins colored by group (7 colors not 12). 12 categories kept in data; filter + color use groups. Presets/country/category-wall removed; status chips + reset kept.
- ✅ **Data review** (workflow `wehnvf1v4`) APPLIED: 83 situational food/bars/swims/views → **extra**; 14 → rejected; 2 → shortlist (pupnatska-luka, blace-mljet); 4 category fixes (kino-bosna/old-crew/ima-moze → nightlife, jajce-pliva → nature); deleted 2 exact dups (mostar-tima-irma, mljet-odysseus-cave). Now 407 places.
- ⬜ Remaining data-quality from workflow (not yet applied): merge near-dup pairs (Vukoje estate, Drežanka swim, Blagaj trout, Ada Bojana FKK, Kotor kayak); genericize stale day refs in body text; strip stale night-N markers on campsites; re-pin suspicious coords (ark-bunker-konjic, kotor motorboat, tulove-grede, skadar-self-drive-boat).

## DECISIONS (think-hard calls made for the user)
- **Sutjeska NP** = INCLUDE light: add **Tjentište spomenik** as a ~40min Day-7 transit stop (zero detour, on the Sarajevo→Šćepan Polje line). **Skip Hrčavka canyoning** (4th water-canyon, redundant with Cetina+Tara). **Skip Perućica half-day** (would restructure a working transit for a 4th hike; not worth it). Perućica/Trnovačko/Zelengora stay as opt-in candidates.
- **Komovi** = SKIP (~9h detour, redundant 2nd 2400er beside Durmitor; keep me-komovi as backup, only a Durmitor-summit substitute).

## Plan sync (IMPORTANT — corrected architecture)
The shared plan is NOT just localStorage — it syncs centrally via **Supabase table `plan_overrides`** (place_id → {day,dayOrder,status,…}). All 4 devices pull/merge it. `defaultPlan.ts` only seeds NEW visitors. So **plan-content changes (day assignments, drops, reorders) must be written to `plan_overrides`** to reach everyone — NOT just defaultPlan.ts.
- Plan to publish refinements: build the canonical refined plan, then push to `plan_overrides` (via an in-app "Load latest plan" action one person triggers, or a direct authored upsert). Confirm before overwriting the shared live plan.
- NOTE: place DATA changes (status/category/desc, in src/data/*.json) are baked/compiled — they propagate on next deploy, no Supabase needed. Only the day-PLAN needs the Supabase push.
- ⬜ Plan: **drag-to-reorder** day cards (replace ↑↓ arrow buttons)
- ⬜ Routing: review precision + **auto-sequence per day** (TSP/nearest-neighbour, auto on load, drag overrides & sticks)
- ⬜ Durmitor over-mountain question: no paved through-road over the massif; only the **Sedlo gravel pass** (seasonal, OSRM skips it). Decide whether to offer a "scenic" route option / verify Sedlo is routable. Also the Day-8 plan currently has TWO 5h summits (Prutaš + Veliki Međed) — content bug.
- ⬜ Trim **Essentials** to just the pre-trip todo checklist (drop the rest)
- ⬜ Clean now-dead code: corridor subsystem (CorridorPanel, corridorMatches, corridorRadius), nearby finder state (nearbyActive/nearbyRadius/nearbyMatchIds), toolsOpen, numberIcon, `.trip-mode` CSS, leftover Marker import, focusPin if unused
- ⬜ (earlier-flagged, optional) GPS staleness, collab last-write-wins — left as-is per throwaway-tool scope

## Plan content — refinement (from balkans-plan-refine workflow)
- ⬜ **Day 4 Mljet** (overpacked): reorder east→west (Ferry → Odysseus Cave → NP lakes → Montokuc), fold Montokuc into NP block; add Mljet **lake bikes**; scope NP to ~4h
- ⬜ **Day 5** (most overpacked): catch earliest Sobra ferry (~06:00); **Počitelj** = slack/drop item (climb Gavankula tower, skip if behind); move Café de Alma to Day 6; protect Kravica swim
- ⬜ **Day 6** Sarajevo: **drop Cinemas Sloga** (Monday-only event, Day 6 is Sunday); add **Kino Bosna** (nightly sevdah) + **1984 Olympic bobsled track** (Trebević); swap order so dinner→Žuta tabija sunset; add Buna swim at Blagaj
- ⬜ **Day 7** (light, 3h slack): merge duplicate Plužine + Piva swim; add **Đurđevića Tara Bridge zipline** (zero detour) + optional **Via Ferrata Piva**
- ⬜ **Day 8 Durmitor**: FIX two-summits-same-day; fix **Prutaš trailhead coords** (currently Sedlo ridge, not Black Lake); add **Vražje jezero** swim cooldown; **Grabovica canyoning** as tired-day fallback; Durmitor **buggy / Black Lake bike** option
- ⬜ **Day 9 Ostrog/Skadar**: drop **Pavlova Strana** (photo-only ~30-40min detour) unless early; alt **Žabljak Crnojevića fortress**; Skadar **e-bike wine route** option; phone winery/kayak ahead
- ⬜ **Day 10 deep south** (light): add **kitesurf/SUP** at Ada Bojana; anchor Ulcinj with lunch + Mala Plaža swim or drop; front-load Stari Bar (shadeless); Misko = sunset dinner; **sea fishing Bar** (Capt. Beli) option
- ⬜ **Day 11 Kotor** (worst, ~15h): **drop Sveti Stefan** (islet closed until Jul 1 2026) + **drop Budva** (midday-wasted, duplicates Kotor) → ~12h; clean northbound order; **Blue Cave speedboat** + **paragliding Budva→Bečići** + **Lovćen ATV** options; Trebinje = evening arrival only
- ⬜ Water-activity selection across trip: pick best kayak/raft/canyon **combination** (avoid redundant Skadar kayak bases); for hiking just confirm worthwhile **locations** (group picks route on Outdooractive)
- ⬜ Days **1–3** & **12–13**: light-touch (skydive Zadar D1 only-if-time; Dubrovnik finale)

## New activities researched (verified; ready-to-add data in task outputs)
- ⬜ **Boat**: Kotor Blue Cave **private speedboat** (~€75pp, D11) + group backup; Croatia **self-drive no-licence boat** to Elaphiti (D4)
- ⬜ **Sea fishing**: Bar (Capt. Beli, D10) / Budva (Predator, D11)
- ⬜ **Paragliding**: tandem Budva→Bečići (~€99pp, D11)
- ⬜ **Skydiving**: Zadar beach dropzone (D1 only-if-time); Montenegro has none solid
- ⬜ **Cycling/e-bike**: Mljet lakes (D4), Durmitor Black Lake (D8), Skadar wine route (D9)
- ⬜ **Quad/buggy**: Durmitor SOA 4-seat buggy (D8), Lovćen ATV (D11); dirt-bike = none drop-in

## Ideas to evaluate (don't take for granted)
- ⬜ **Komovi** mountains hike — ~50km east, off-route; quantify detour vs worth before adding
- ✅ **Počitelj** — keep as Day 5 slack item (already scheduled), tower-climb, early-ferry dependency
- ✅ pickup → islands directly (already how the plan is built; Dubrovnik is the finale)

## Ideation workflow results (`w9rzeuifl`) — my proactive ideas, ranked
**Top 10 (do):**
1. ⬜ Delete dead corridor/nearby/review machinery in App.tsx (~100+ lines) [= dead-code task]
2. ⬜ Inline **drive time to next stop** in the Plan list ("↓ 38 min · 41 km", red if implausible) — data already computed (route.legs)
3. ⬜ Loud **"does this day fit?"** verdict at top of each day (green/amber/red from slackSec/overSec) + one-tap "suggest a drop"
4. ⬜ Wire up **per-day start time + pace** (buildDaySchedule already takes dayStartHour/endHour/paceMultiplier; nothing sets them) — header start-time picker + relaxed/normal/fast
5. ⬜ **Booking tracker** — derive a date-sorted "to book" list from places with bookingLink/phone + tap-to-call + done checkbox (replaces the trimmed Essentials list)
6. ⬜ **Ferries as data** (ferries.ts: June times + crossing + queue rule) → last-boat warnings on ferry legs
7. ⬜ Promote **bestTime** to a compact badge on each Plan stop row; soft-flag arrival-time conflicts
8. ⬜ **"Tired? drop it"** one-tap (re-sequences day) + **"sleep check"** (warn day with activities but no sleep stop)
9. ⬜ Detail sheet: take **reject out of the 5-wide status row** (4 primary + small reject link); make "Hours here" a chip that reveals input on tap
10. ⬜ Purge **orphaned CSS** (.today*, body.trip-mode, .mode-pill, .tools-menu, .detail-facts/-time/-plan, .nearby-*, .preset*, .locate-fab, .corridor-*)

**Worthwhile later:** share/export Plan as text + per-day Google Maps multi-stop URL; per-day cash/currency cue; fuel-before-dead-zone flags; move reorder into detail sheet; OSRM cached-route honesty; structured closed/seasonal flag (Sveti Stefan/Sloga/Perućica); manual per-day cost band; maybe collapse Places chip wall behind one "Filters".

**DON'T build (anti-bloat):** ⚠️ **drag-to-reorder** (gesture-conflict swamp, rare action — keep ↑/↓) [CONFLICTS with user req — ask]; auto-summed budget (free-text cost = garbage); live border/ferry/weather APIs (offline-first); weather-swap nudges; per-activity packing; free-form notes (deliberately cut); moments/mood/festival features as code; MORE "see"/photo viewpoints (see=136 already dominates).

**Unforgettable moments → write into route-skeleton.md (not code):** (1) Night-1 Velebit Milky Way (Jun 16 darkest, new moon — `hr-zavizan-dark-sky`); (2) group peka feast (Omiš/Brela or Pelješac); (3) Tara day = raft+zipline+Piva framing; (4) Day-6 pick ONE: Lukomir sunrise vs Sarajevo big night/Garden of Dreams (confirm 2026 dates); (5) full-moon Kotor/Orjen sunrise finale.

**Data gaps to research next:** zero-bed zones (Piva/Plužine, Ostrog/Nikšić, Kotor Bay, Sutjeska); tier rebalance (5 apartments vs 41 camps, WOW tier nearly empty — need rural/waterfront houses + €40-60 apartments where only camps exist); hot-day swim on inland half (Konjic/Sutjeska/Piva/Žabljak); dinner near thin overnights; nightlife in base towns (cap tight); rainy-day indoor plan-B for alpine days; Plitvice zone empty (only if variant live).

## Research workflow outputs (full detail)
- Plan refinement: task `wxtjjc1o3` output file
- New activities (boat/fishing/air): task `w6ri48exg` output file
- Wheels (bike/quad): task `w41xdmajb` output file
