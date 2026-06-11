# Feature ideas & roadmap — Balkans Trip app

**Audience:** the master app-dev session. This is a DESIGN DOC, not a code change — I edited nothing but this file.
**Grounding:** read the full `app-changelog.md`, `ux-review.md`, `offline-deploy.md`, `CLAUDE.md`, and the live source (`App.tsx`, `store.ts`, `types.ts`, `components/*`, `trip.ts`, `links.ts`). Current state cited inline.

## Where the app is today (the baseline these ideas build on)

- **331 places** baked into `src/data/*.json` (255 candidate / 61 shortlist / 15 backup), loaded read-only and merged with a localStorage **overrides** layer (`{status, day, dayOrder, note}`). Routes/trip/ferry/done/mode/GPS-fix all live in their own localStorage keys, all writes funnel through `safeSetItem` (quota-safe).
- **Planning ⇄ Trip mode** split is done and good. Trip mode is a today-centric, GPS-aware, low-filter screen (`Today.tsx`): day strip, numbered stops, done/skip + undo, "Next → stop · drive · ~km from you", one-tap **🛏 Sleep tonight / 📍 Near me**, a locate FAB with a cached you-are-here dot.
- **PWA offline** ships (app shell + all baked place data precached; OSM tiles CacheFirst as you view them; OSRM NetworkFirst). **KML/GPX export → Organic Maps** is the real dead-zone nav guarantee. Deploys free to **GitHub Pages** on push.
- **Route builder** (local Held-Karp/2-opt solver, anchors, ferry hours, "apply to days"), per-day OSRM routes, corridor/nearby sleep finders, domain-labeled booking links. **"Export JSON" was deliberately removed** in the simplification pass.
- **Key gap the brief names:** the plan lives in one phone's localStorage. There is **no way for 4 phones to share one plan**. That is the single biggest missing capability and it's Part B's headline.

---

# PART A — "ADD A PLACE" feature (implementation-ready spec)

## Use case

Mid-trip, a local (or a campsite owner, or a barman) says "you have to see X." On a phone, possibly with no signal (Durmitor / Piva / a border queue), one of the 4 wants to drop that spot onto the map and assign it to a day — without losing it, and ideally so the others see it too (sharing is Part B; this part just gets it into *one* device's plan reliably).

## Why this is mostly easy here

The data model already does the hard part. Places are `Place[]` merged with overrides at load (`App.tsx:199–204`). A user-added place is just **another `Place`** that comes from a *different source* (localStorage instead of the JSON bundle). If `loadPlaces()` concatenates a `userPlaces` array, **everything downstream works for free**: map pins, filters, presets, route builder, day planner, corridor/nearby finders, KML/GPX export, booking links. No component needs to know a place was user-added. That is the whole reason this is an **S–M**, not an **L**.

## Data shape

Add an optional flag to `Place` (one line in `types.ts`) so user places are detectable for edit/delete and so they never get confused with baked data:

```ts
// types.ts — add to interface Place
  /** True for places the user added at runtime (live in localStorage userPlaces, editable/deletable). */
  userAdded?: boolean;
```

New localStorage key + helpers in `store.ts`, mirroring the existing patterns exactly (`safeSetItem`, try/catch load):

```ts
const USER_PLACES_KEY = 'balkans-trip-user-places';

export function loadUserPlaces(): Place[] {
  try {
    const a = JSON.parse(localStorage.getItem(USER_PLACES_KEY) ?? '[]');
    return Array.isArray(a) ? a : [];
  } catch { return []; }
}
export function saveUserPlaces(places: Place[]): boolean {
  return safeSetItem(USER_PLACES_KEY, JSON.stringify(places));
}
```

`loadPlaces()` returns the bundle as today; **`App.tsx` holds `userPlaces` in state** and merges:

```ts
const basePlaces = useMemo(() => [...loadPlaces(), ...userPlaces], [userPlaces]);
```

Put user places **after** baked places so the existing "first id wins" de-dupe protects against a user id colliding with a baked one. Generate ids as `user-<timestamp>` (e.g. `user-1718700000000`) — collision-proof and obviously user-origin. New user places default `status: 'shortlist'` (you added it because you want it — don't bury it in the 255-candidate haystack) and `country` inferred from lat/lng by a cheap bounding-box check (HR/BA/ME), defaulting to the trip's current country.

### Survives a redeploy

This is the important property and it falls out for free: `userPlaces` is in **localStorage**, which a redeploy never touches; baked `src/data/*.json` changing on the next deploy can add/remove *baked* places but **cannot wipe the user array** (different key, different source). The only loss vector is the user clearing site data — same as every other override. No migration needed: it's an independent additive array.

## The three input modes (and the recommended default)

A new **"+ Add place" form** with a small mode switch. Build the modes in priority order; ship mode 1 first, it covers the core use case offline.

### Mode 1 (RECOMMENDED DEFAULT) — Tap the map to drop a pin

Best on mobile, **works fully offline**, zero parsing, no network. Flow:
1. Tap **+ Add place** → the form opens in "tap-the-map" state with a hint banner ("Tap the map where it is").
2. The next map tap captures `lat/lng` (a temporary draggable marker lets you nudge it; reuse the GPS dot styling).
3. A compact sheet (reuse the bottom-sheet pattern from `DetailPanel`) collects: **name (required)**, **category** (the existing 12-category chip/select, default `other`), **assign-to-day** (the existing `DAYS` dropdown from `DetailPanel`, optional), **note** (optional textarea). Save → appended to `userPlaces`, pin appears immediately, detail panel opens on it.

This is the default because it's the only one that needs nothing but the user's eyes and the map — exactly the dead-zone scenario. A "use my GPS location" shortcut button inside the form (one tap, fills lat/lng from the existing `gpsFix`) is a nice cheap addition for "add the campsite I'm standing in."

### Mode 2 — Paste raw `lat, lng`

Trivial and offline. A text field; parse with a regex that tolerates the common copy formats (`42.123, 18.456`, `42.123,18.456`, `42.123 18.456`):

```ts
const m = input.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/);
// validate lat ∈ [-90,90], lng ∈ [-180,180]; for this trip sanity-clamp to roughly lat 41–46, lng 15–20 and warn if outside.
```

Google Maps' "copy coordinates" gives exactly this — it's the most reliable paste path and should be promoted in the UI hint ("Long-press in Google Maps → tap the coords → paste here").

### Mode 3 — Paste a Google Maps URL (handle the short-link reality honestly)

This is where static hosting bites. Two URL classes:

- **Already-expanded URLs** (what you get from the address bar of an *open* place, or "Share → Copy link" on desktop): contain coordinates inline. Parse **client-side, offline, no network** with a regex — handle both forms:
  - `…/@44.1234,15.2345,15z…` (the map-center `@lat,lng`)
  - `…!3d44.1234!4d15.2345…` (the place's true `!3d<lat>!4d<lng>` — prefer this when present; `@` is the viewport center, not always the pin)
  ```ts
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const d  = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  const coords = d ? [+d[1], +d[2]] : at ? [+at[1], +at[2]] : null;
  ```
  Also try to grab a name from `/place/<Name>/` in the path to pre-fill the name field. This path is **free, robust, and offline** — implement it.

- **`goo.gl` / `maps.app.goo.gl` SHORT links** (what phone "Share" usually produces): contain **no coordinates** — they're a server redirect. Following the redirect requires a network round-trip that is **CORS-blocked from the browser** (Google doesn't send permissive CORS headers), and there's no backend to do it server-side. Honest options, in order of recommendation:

  1. **(RECOMMENDED) Detect the short link and instruct the user to expand it first.** Show: *"Short Google links can't be read offline. Open it in Google Maps, then tap the address bar / Share → 'Copy link' and paste the long link — or just paste the coordinates."* Zero infrastructure, zero failure mode, works the moment they have any signal. Given mode 1 + 2 already cover the offline case, this is genuinely enough.
  2. **(OPTIONAL, online-only) Free public CORS proxy** to follow the redirect, with loud caveats. E.g. fetch through `https://corsproxy.io/?<encoded url>` or `https://api.allorigins.win/raw?url=<encoded>`, read the resolved URL / HTML, run the same `@`/`!3d!4d` regex on it. **Caveats to surface in the UI and the doc:** third-party proxies are unreliable (rate limits, downtime, can disappear), are a mild privacy leak (the URL passes through someone else's server), and **never work offline** — so this is a *convenience on top of* mode 1/2, never the primary path. Wrap in try/catch with a 5 s timeout and fall straight back to option 1's instruction on any failure.
  3. **(TRADEOFF — probably SKIP) A tiny Cloudflare Worker / Netlify function** that does one thing: `GET` the short link with `redirect: manual`, return the `Location` header. ~15 lines, free tier easily covers 4 people. **But** it reintroduces a backend the project deliberately doesn't have (the whole app is static GitHub Pages), it still **can't work offline**, and it's another thing to deploy/keep alive for a throwaway trip tool. The value (auto-resolving a link you could resolve yourself in 3 taps) does not justify the architectural cost. Recommend **not** building it unless short-link paste turns out to be the dominant real-world flow — which mode 1 (tap-the-map) makes unlikely.

**Net recommendation for URLs:** ship the client-side regex for expanded URLs (free, offline); for short links, detect-and-instruct (option 1). Treat the proxy as a clearly-labeled "try to auto-resolve (needs internet)" button only if there's spare effort.

## Edit / delete

User places are the only editable-in-place records (baked places are read-only by design). In `DetailPanel`, when `place.userAdded`:
- show an **Edit** affordance (name / category / lat-lng re-drop / note) and a **Delete** button (with a confirm, since there's no undo for a full delete — or reuse the 6 s undo-toast pattern from `skipStop`).
- status/day/note for a user place can keep flowing through the **same overrides layer** as baked places (so "assign to day" code is untouched) — OR store them inline on the userPlaces record. **Recommend: keep status/day/note in overrides** (one code path, already battle-tested), and store only the immutable identity (name/category/lat/lng/userAdded) in `userPlaces`. Delete = remove from `userPlaces` **and** clean its override + done keys.

## UI placement

- **Trip mode (the primary context for this feature):** a small **"+ Add place"** button in the `Today` action row, next to 🛏 Sleep tonight / 📍 Near me. This is exactly the "a local just told me" moment. Default to tap-the-map.
- **Planning mode:** a **"+ Add place"** button at the top of the Places list (above the place-list `<ul>`), so you can add a spot a friend texted you while planning at a desk. Same form.
- One shared `AddPlace` component/sheet; the entry buttons just open it.

## Effort

**M.** Storage + merge is **S** (one type field, one key, two helpers, one `useMemo` line). The form + tap-to-drop interaction + the three input parsers + edit/delete in DetailPanel is the bulk — solid **M**, not **L**, because nothing downstream changes. If you ship only mode 1 + mode 2 (skip URL parsing entirely), it's a small **M / large S**.

---

# PART B — Missing features & trip use-cases (brainstorm → prioritize)

Real situations across 13 days, 4 people, one car, camping + stays, 3 countries, dead zones, 3 border crossings. Each: use-case, minimal design, effort, priority + reasoning.

## B1. MULTI-PERSON SHARING / SYNC — *the headline gap* — **MUST**

**Use-case (from CLAUDE.md & the brief):** the user wanted the plan "available for all 4 of us." Today the plan is one device's localStorage; the other 3 see the empty default app. The skip/done/day-assignment one person does on the road is invisible to the others. There's no backend and no database, so true live sync is out — but **we don't need live sync, we need a good-enough share.**

**The shape of the problem:** the only mutable, share-worthy state is small — the `overrides` object (status/day/dayOrder/note for ~the few dozen places that matter) plus `userPlaces`. Everything else (the 331 places, routes) is either baked in or re-derivable. So "the plan" ≈ `{ overrides, userPlaces }`, a few KB of JSON.

**Recommended design — a two-tier approach (this replaces the removed "Export JSON"):**

1. **Share-link / short-code import (MUST, the core).** A **"Share plan"** button serializes `{overrides, userPlaces}`, compresses (LZ-string → base64) and puts it in the **URL hash** (`#plan=…`). The user sends that link in the group chat. Opening it shows **"Import shared plan? (merge / replace)"**. Merge = apply incoming overrides on top of mine (last-writer-per-place wins, with the importer choosing on conflict). The hash keeps it 100% static — no server, no Gist account, works the instant anyone has signal. A few KB compresses well under the URL length browsers accept (tens of KB). This is the right default because it's zero-infrastructure and matches how 4 friends actually coordinate (paste a link in WhatsApp).
   - *If the compressed plan ever exceeds a safe URL length:* fall back to a downloadable `.trip.json` file the user AirDrops/sends — same `{overrides, userPlaces}` payload, imported via a file picker. Cheap to add as the overflow path.

2. **One designated "planner" + published snapshot (NICE, the upgrade).** Before the trip, one person builds the plan and the **build bakes a default plan into the bundle** — i.e. they commit their finished `overrides` as a JSON file the app reads as *initial* state when localStorage is empty. Then all 4 phones, on first load of the deployed site, see the same finished plan with zero import step. On the road they each diverge locally (their own done/skip), and re-share via tier 1 when they want to re-sync a real change (e.g. "we added a campsite"). This gives "everyone sees the same plan out of the box" without any runtime backend.
   - Concretely: add `src/data/_plan.json` (or a `defaultPlan` export) read once when `loadOverrides()` returns empty. The planner produces it with the Share button's serializer, the dev session commits it, the next deploy ships it. **This is the cleanest answer to "available for all 4 of us"** and pairs perfectly with the share-link for live tweaks.

**Why not a GitHub Gist?** A Gist gives near-live shared state (everyone polls one Gist id) and would be the "real" answer — but it needs an auth token baked into a public static site (leaks the token) or a per-user PAT (too fiddly for 3 non-technical friends), and writes need network. The share-link + baked-snapshot combo gets ~90% of the value with **0** of the auth/secret/uptime risk. Skip the Gist.

**Effort:** Share-link import/export **M** (serializer + LZ-string dep + merge-conflict UI). Baked snapshot **S** (one initial-state read + a commit step). **Priority: MUST** — it's the stated goal and the biggest gap.

## B2. "Mark as visited / done" + trip progress — **NICE (mostly built)**

**Use-case:** at the end of the trip, "did we actually do Durmitor?"; during it, a sense of progress.
**Reality:** **per-stop done is already built** (`balkans-trip-done`, the ✓ in `Today`, greys the stop + its numbered pin). What's missing is (a) done is **trip-day-scoped** to today's stops only — you can't mark a place visited from its detail panel or browse "everything we've done," and (b) there's no **progress summary** ("9 / 23 planned stops done · Day 6 of 13").
**Minimal design:** add a "✓ Visited" toggle to `DetailPanel` (writes the same `done` key, so it stays out of the shareable overrides — it's personal ephemera, consistent with the changelog's note). Add a one-line progress strip at the top of the Today view ("Day 6/13 · 9/23 stops done"). 
**Effort: S.** **Priority: NICE** — the core already works; this is polish that genuinely feels good on a 13-day trip but isn't load-bearing.

## B3. Quick memory / photo-note per place — **NICE → lean SKIP for photos**

**Use-case:** "remember the lavender field after Ostrog" — capture a quick memory while it's fresh.
**Reality:** a per-place **text note already exists** (overrides `note`, editable in DetailPanel). For *text* memories, **it's done** — just relabel/encourage it ("Add a memory…"). 
**Photos are the trap:** localStorage is ~5 MB and already shared by routes/overrides — a single phone photo blows it. Storing photos would need IndexedDB + careful quota handling + thumbnailing, and they'd be **un-shareable** (can't put a photo in a share-URL) and **device-local** anyway. That's real engineering for a throwaway tool, and every phone already has a camera roll that does this better. 
**Recommendation:** ship the text-note relabel (S, basically free); **SKIP in-app photos** — over-engineering. If anything, a "📷 open camera" deep-link that just launches the native camera (no storage) is the only photo touch worth considering, and even that is marginal.
**Effort: S (text) / L (photos).** **Priority: NICE (text) / SKIP (photos).**

## B4. "What's near me right now" — **MUST-keep (built); small upgrade NICE**

**Use-case:** spontaneous "what's worth seeing within 30 km of where we are."
**Reality:** **built and good** — Trip mode's 📍 Near me + 🛏 Sleep tonight, anchored to the GPS fix (or today's last stop), fixed radii, scannable cards with km/cost/facilities/Navigate, matches highlight on the map. This was the ux-review's #2/#10 ask and it's done.
**Assessment / small upgrades (NICE):** (a) Near me is capped at 30 km straight-line and `SIGHT_CATEGORIES` only — a "show food too" or an adjustable radius would help in a town; (b) it excludes today's stops but not already-done ones — fine. (c) The biggest honest limitation: it only finds **baked + user-added** places, so a truly off-grid recommendation needs Part A first. **Part A directly strengthens this feature.**
**Effort: S** for the small tweaks. **Priority: the existing feature is MUST (keep); upgrades are NICE.**

## B5. In-app offline ESSENTIALS (contingency, packing, phrases) — **MUST (high value, low effort)**

**Use-case:** car breaks down in Piva canyon with no signal; someone needs the emergency numbers / "what do I do" sheet **now**. Or at a border: "what docs do they want?" The research already wrote a superb **`contingency.md`** ("112 works in all 3 countries", per-country roadside/rescue numbers, "if X → do Y → call Z", border timing) and `trip-ops.md` (packing checklist, weather, daylight). **None of it is in the app.** It's the single most safety-relevant content and it's sitting in markdown files nobody will have offline.

**Minimal design:** a new **"ℹ️ Essentials"** (or 🆘) entry in Trip mode — a static, scrollable, **fully offline** info sheet (it's just text, precached with the bundle, no network ever). Ship a curated subset, NOT the whole 30 KB doc:
- **Emergency card** (top, always one tap): 112 + per-country police/ambulance/roadside/mountain-rescue numbers from `contingency.md §0`. `tel:` links so a tap dials. Blank lines for the rental + insurance lines the user fills in.
- **"If X happens"** quick list (car breakdown, accident, police stop, injury on a hike) — the condensed §1.
- **Border cheat-sheet** (docs to have ready; Debeli Brijeg timing; lights-on rule).
- **Packing checklist** (from trip-ops §4) — could even be a checkable list (localStorage), but a static list is enough.
- **Key phrases** — *note: the brief lists "key phrases" but I did not find a phrases doc in research*; if one exists, embed it; otherwise a tiny hardcoded HR/BA/ME survival set (hello/thanks/help/where is) is ~20 lines and worth adding.

**How to ship it lightly:** put the content as a TS/JSON constant (or a small `essentials.ts`) so it precaches with the bundle automatically — **do not** try to render the markdown files at runtime (they're in `research/`, outside the build). A research session curates the subset into the data file; the app just renders sections. Keep it to one screen of tabs/accordions.
**Effort: M** (content curation is the work; the UI is a static accordion). **Priority: MUST** — highest safety value per line of code, and it's the literal reason the trip needs an *offline* app.

## B6. Money — simple shared-expense tally — **NICE (lean toward SKIP unless wanted)**

**Use-case:** 4 people, shared fuel/campsites/groceries/ferries — "who paid what, who owes whom" at trip's end.
**Honest assessment:** this is a genuinely useful trip thing, BUT (a) it's a **whole separate app concern** (entries, payers, splits, settle-up math) with its own data model and sync needs, (b) it's **completely orthogonal** to the map/plan — it would bolt a Splitwise into a trip-planner, and (c) **Splitwise / Tricount already exist, are free, and do this better**, including their own sharing. Building it here is the clearest **over-engineering risk** in this list.
**If the group insists on in-app:** the *minimal* version is a flat list `{who, what, amount, paidBy}` in localStorage + a trivial "net per person" summary, shared via the same B1 share-link. That's an **M** and competes for attention with B1/B5 which matter more.
**Effort: M (minimal) / L (full split-with-settle).** **Priority: SKIP** for the app; **recommend the group use Splitwise.** Only build the minimal tally if they explicitly want one screen for it.

## B7. Weather + daylight/sunset glance per day/zone — **NICE (static digest), SKIP live API**

**Use-case:** "is the Durmitor hike a dawn start?" "will it storm this afternoon?" "when's sunset for the Kotor climb?"
**Reality:** `trip-ops.md` already has **per-zone weather, water temps, storm timing, and daylight/golden-hour** worked out for exactly these dates — it's static, June-climatology + computed sun times. A **live weather API** would need network (dead in the zones that matter), an API key, and adds little over the researched digest for a fixed 13-day window.
**Minimal design:** fold a 1-line **weather/daylight hint per day** into the Today view header, sourced from a small static `dayOps` table (curated from trip-ops): e.g. Day 8 (Durmitor) → "14–22°C, storms build 12–15h — hike at dawn · sunrise 05:10 / sunset 20:35." Offline, precached, zero API.
**Effort: S** (one static table + one line in Today). **Priority: NICE** — cheap, genuinely useful, and the content is already written. Skip any live API.

## B8. Day-level logistics — per-day checklist, reorder, "we're tired → skip" — **partly MUST-built, checklist NICE**

**Use-case:** "ferry to catch at 10:30," "call the campsite to hold a spot," "buy the Mljet park ticket before the boat."
**Reality:** **reorder stops** (↑/↓), **skip with undo + auto-reroute**, and **ferry-hours per leg** are all **built** (Itinerary + Today + the route builder). The "we're tired → drop a stop → rebuild the road" journey from CLAUDE.md **works**. What's missing is a **free-text per-day checklist / reminder** ("things to do today that aren't a map pin").
**Minimal design:** a tiny per-day notes/checklist stored in localStorage keyed by day (`balkans-trip-day-notes`), shown at the top of the Today view and the Itinerary day header — a few checkable lines. Shareable via B1. Keep it dead simple (no due-times, no notifications — that's over-engineering for a phone with no reliable signal).
**Effort: S.** **Priority: NICE** — the destructive/reorder logistics are done (MUST, already shipped); the checklist is a small, real add. Notifications/alarms = SKIP (unreliable offline, OS-dependent).

## B9. (My own) Border-crossing helper — **NICE**

**Use-case:** 3 crossings, EES queues of 1–4 h at Debeli Brijeg on Jun 27/28 — "should we cross now or wait?"
**Minimal design:** this is mostly **content** (covered by B5's border cheat-sheet) plus optional live links: a tiny "check live wait" button linking to `kamere.mup.gov.me` / `nakordoni.eu` (needs signal, but you're at the border with Croatian roaming). No new model. **Fold into B5.**
**Effort: S (as part of B5).** **Priority: NICE.**

## B10. (My own) "Tonight's plan" anchor — **SKIP**

A "set tonight's accommodation" concept so Sleep-tonight and the next morning's "Next →" anchor to where you actually slept. Tempting, but it duplicates what assigning the stay to a day already does, and adds a state concept for marginal gain. **SKIP** — the existing GPS/last-stop anchor is good enough.

## B11. (My own) Marker declustering in Planning — **SKIP / NICE-later**

The changelog flags ~331 pins overlapping at low zoom. Trip mode already dodges it (today-only). Planning has filters/presets/search/fit-map as relief. Real but low-urgency for a 4-person tool; the changelog itself calls it "left out to avoid risk." **SKIP for now** (NICE if everything else is done).

---

# Prioritized roadmap

Ordered for the master session to pick top-down. "Built" = already shipped, listed for completeness.

| # | Feature | Effort | Priority | Notes |
|---|---------|--------|----------|-------|
| A | **Add a place** (tap-map + paste coords + paste expanded GMaps URL; userPlaces array) | M | **MUST** | The explicitly-requested feature; merges into the existing place list for free. Ship tap-map first. |
| B1 | **Share plan** (LZ-string share-link import/export + baked default-plan snapshot) | M | **MUST** | The stated "available for all 4 of us" goal; replaces removed Export JSON. Biggest gap. |
| B5 | **Offline Essentials** (emergency card, if-X-happens, border/packing/phrases) | M | **MUST** | Highest safety value; the literal reason to have an *offline* app. Content already researched. |
| B2 | Visited toggle in DetailPanel + trip-progress strip | S | NICE | Done-state mostly built; small reach + summary. |
| B7 | Per-day weather/daylight hint (static digest from trip-ops) | S | NICE | Cheap, content already written, offline. |
| B8 | Per-day checklist / reminders (free-text, shareable) | S | NICE | Reorder/skip/ferry already built; this adds the non-pin to-dos. |
| B4 | "Near me" radius/category tweaks | S | NICE | Core feature already built & good; minor upgrades only. |
| B3 | Relabel note → "memory"; (in-app photos) | S / L | NICE / **SKIP** | Text done; photos = over-engineering, use the camera roll. |
| B9 | Border live-wait links | S | NICE | Fold into B5. |
| B6 | In-app shared expenses | M / L | **SKIP** | Use Splitwise/Tricount; orthogonal to the planner. Build only if explicitly wanted. |
| B10 | "Tonight's accommodation" anchor | S | **SKIP** | Duplicates day-assignment; GPS anchor suffices. |
| B11 | Marker declustering (Planning) | M/L | **SKIP** | Filters/fit-map cover it; trip mode already avoids clutter. |
| A.opt | Short-link auto-resolve (CORS proxy / serverless) | S | **SKIP** | Can't work offline; detect-and-instruct is enough. Don't add a backend. |

---

# Final recommendation

**Add-place design (3 sentences):** Default to **tap-the-map-to-drop-a-pin** (works fully offline on a phone) plus a small form (name required, category, optional day, optional note), with secondary inputs for pasting raw `lat,lng` and pasting *already-expanded* Google Maps URLs parsed client-side via an `@lat,lng` / `!3d!4d` regex. For `goo.gl` short links, **detect and instruct the user to expand the link first** rather than adding a backend or relying on a flaky CORS proxy — they can never resolve offline anyway, so it isn't worth the architectural cost. Store user places as a `Place[]` under a new localStorage `userPlaces` key (with a `userAdded` flag) concatenated into `loadPlaces()` so they appear everywhere — map, filters, route builder, day planner — for free, edited/deleted from the detail panel, and surviving every redeploy because localStorage is untouched by deploys.

**Top 5 prioritized features:**
1. **Add a place** (MUST, M) — the requested feature; tap-the-map default, free merge into the place list.
2. **Share plan** (MUST, M) — LZ-string share-link + baked default-plan snapshot; finally makes the plan "available for all 4 of us" with no backend.
3. **Offline Essentials** (MUST, M) — emergency numbers / if-X-happens / borders / packing in-app and fully offline; the highest safety-value, lowest-tech win, content already written in `contingency.md` + `trip-ops.md`.
4. **Visited toggle + trip-progress strip** (NICE, S) — completes the done-state and adds a satisfying "Day 6/13 · 9/23 done."
5. **Per-day weather/daylight hint** (NICE, S) — a one-line static digest per day (dawn-start / storm / sunset) from already-researched `trip-ops.md`, offline and cheap.
