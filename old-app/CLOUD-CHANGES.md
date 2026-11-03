# Cloud changes on `cloud/08-more`

Five logic items on top of `weekend/08-app` (base `fccc901`), one commit each, getting the app ready for the Winter 2027 trip (TH, MY, SG, VN, KH). Every spec ran with `TZ=Europe/Vienna` (the `npm test` setting). After each commit `npm test` and `npm run build` both passed. At the end: 39 tests pass (11 at the start).
No curated place data, baked plan or note was touched: `git diff --name-only fccc901..HEAD` lists no file under `src/data/`, `src/defaultPlan*` or `src/notes/`.

## 1. Winter countries TH, MY, SG, VN, KH - `3651dd0`

- **Problem:** `Country` only had HR/BA/ME/IT/AL, so a saved place with country `TH` failed `isCountry` and was given a guessed Balkan country.
- **Change:** I added the 5 codes to `Country` (`src/types.ts`) and to `COUNTRY_NAMES` (`src/constants.ts`). `isCountry` (`src/store.ts`) now checks the own keys of `COUNTRY_NAMES`, so the country list lives in one place. It uses own keys only: `'toString'` is not a country.
- **Spec** (`src/store.test.ts`):
  - before: `× keeps the Winter-trip country TH … → expected 'ME' to be 'TH'`, and the same for MY, SG, VN and KH (5 failed).
  - after: `✓ src/store.test.ts (9 tests)`.
  - A guard case checks that the codes `XX`, `toString` and `hr` are still guessed. It passed before and after.
- **Second look:** OK. Nothing else takes `Record<Country, …>`. The only other user of `COUNTRY_NAMES` is the label in the detail sheet.

## 2. Sunrise and sunset in the place's time zone - `21669fe`

- **Problem:** `formatHM` used the phone's own time zone. Planning Koh Phangan from Vienna showed sunrise 00:39.
- **Change:**
  - `COUNTRY_ZONES` in `constants.ts`: one IANA zone per country. I checked each one with `Intl` in node 22: they give GMT+1 for HR/BA/ME/IT/AL, GMT+7 for TH/VN/KH and GMT+8 for MY/SG.
  - `formatHM(d, zone)` now formats through `Intl.DateTimeFormat` with `hourCycle: 'h23'`.
  - A new `daySunHM(stops, date)` picks the day's middle stop and its country's zone. `App.tsx` (the `planDaySun` memo) calls it.
- **Spec** (`src/sun.test.ts`):
  - before: `× formats a time in the given zone … → expected '00:39' to be '06:39'`; the `daySunHM` cases failed because the function did not exist yet.
  - after: `✓ src/sun.test.ts (5 tests)`.
  - The checked values: Koh Phangan on 2027-01-10 → 06:39 / 18:14 (Bangkok time). Theth (Albania) on 15 Sep → 06:20 / 18:52, the times the plan was already checked against.
- **Second look:** OK.
  - Under `TZ=Asia/Bangkok`, only the case that checks the test runs in Vienna time fails. The zone results do not depend on the phone.
  - My first sunset guess in the spec (18:09) was wrong. The function gives 18:14, which matches an 11h35m day at 9.7°N in January, so I fixed the expected value.
  - `Asia/Ho_Chi_Minh` formats correctly in node, but node's `supportedValuesOf` lists it as `Asia/Saigon`.

## 3. Country guess by nearest known place - `221364c`

- **Problem:** the country of a new pin came from a bounding box in `guessCountry` (`src/store.ts`).
  - On the real data it got **194 of 551** HR/BA/ME places wrong: 112 HR→BA and 72 ME→BA, mostly southern Dalmatia and Montenegro.
  - A pin in a trip with countries the box doesn't cover (the Winter trip) always got the trip's first country.
- **Change:** a multi-country trip now takes the country of the nearest curated place among the trip's countries. Distance is flat-earth, with longitude scaled by latitude. A one-country trip still gets its country outright. A trip with no known places yet still gets its first country.
- **Spec** (`src/store.test.ts`):
  - before: `→ expected 'ME' to be 'TH'`, `→ expected 'ME' to be 'MY'`, and Dubrovnik old town `→ expected 'BA' to be 'HR'` (3 failed). The Mostar→BA and Kotor→ME guards passed.
  - after: `✓ src/store.test.ts (13 tests)`.
- **Second look:** OK.
  - A leave-one-out run over the same 551 places gets **4 wrong**, all on border crossings (Debeli Brijeg, Vitaljina ×2) or right on the border (Una Štrbački buk).
  - A Balkans-trip pin dropped in Italy still lands on a trip country, so it stays visible.
  - Known limit: until the Winter trip has curated places in every country, a pin goes to the nearest country that has data.

## 4. Restore from rejected - `d933a96`

- **Problem:** both restore paths (the sidebar's "↩ restore" button and the reject toggle in the detail sheet) set status `candidate`. A rejected plan stop came back as a candidate and dropped out of its list.
- **Change:**
  - `App.setStatus` now goes through `withStatus(override, current, status)`. Rejecting saves the place's status at that moment (its own edit, else the baked status) as `prevStatus`.
  - Both restore buttons use `restoredStatus(p)`, which is `prevStatus` if set, else `candidate` as before.
  - `normalizeOverride` keeps `prevStatus` only while the place is rejected.
- **Spec** (`src/store.test.ts`):
  - before: 6 failed (`withStatus is not a function`).
  - after: `✓ src/store.test.ts (19 tests)`. The cases:
    - a shortlist stop comes back as shortlist and keeps its day;
    - a baked `extra` comes back as `extra`;
    - a second reject keeps the first saved status;
    - the saved status survives a save and reload;
    - with nothing saved it restores to `candidate`;
    - the saved status is cleared once the place is no longer rejected.
- **Second look:** OK.
  - Rejected edits saved before this change, and places baked as `rejected`, still restore to `candidate`.
  - The assign-to-day path keeps other fields when it sets shortlist, but `normalizeOverride` drops the stale `prevStatus`.
  - The baked plans have no `prevStatus`, so seeding them is unchanged.

## 5. Unroutable leg reason - `842bf5c`

- **Problem:** when OSRM could not route a leg, the day showed "Unscheduled" with no reason. Loading and failure looked the same: the day stayed `null`.
- **Change:**
  - `fetchRoute` returns `NO_ROUTE` when OSRM answers `code: NoRoute` (or `NoSegment`), and `null` on any other failure.
  - When a chain has no route, `useDayRoutes` routes each leg of that chain on its own, to find the stop no road leads to. Results are kept for the session only, not saved to localStorage.
  - `buildDaySchedule` accepts `NO_ROUTE` legs. It times the stops before the first one and returns `noRouteTo` (that stop). That stop and the ones after stay unscheduled. A road leg still loading before the gap still holds the whole day back; one after the gap does not.
  - The Plan header shows `⚠ no road route to <place> - set how you get here` instead of the fit verdict. The trip board shows `⚠ no road route`. The shared plan text adds the same line, then lists the stop and the ones after as `Unscheduled`.
- **Spec** (`src/schedule.test.ts`, `src/planText.test.ts`):
  - before: `→ expected undefined to be 'island'`, `→ expected undefined to deeply equal [ 'a', 'pier' ]`. The plan text was `Unscheduled Pier …` with no reason (5 failed).
  - after: `✓ src/schedule.test.ts (9 tests)`, `✓ src/planText.test.ts (3 tests)`.
- **Second look:** OK for the logic.
  - The app's offline route download now treats `NO_ROUTE` as a failed day; before, it would have tried to read the route's coordinates.
  - **Needs the app: not checked in a browser** (the header line, the board label, the per-leg OSRM check).
  - **Not checked live:** this container's network policy blocks `router.project-osrm.org`. The `NoRoute` / `NoSegment` handling follows the OSRM HTTP API docs (HTTP 400 with a `code`), not a real response.
