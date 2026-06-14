/**
 * Default day-assignment plan — the canonical, driving-balanced itinerary.
 * Generated 2026-06 from the plan-rebalance workflow (planner→critic→reviser).
 * Only day + dayOrder live here; status lives in src/data/*.json.
 * "Options" (rich nearby extras, not scheduled) stay unscheduled in the data.
 *
 * loadOverrides() seeds from this on first visit; the shared plan then syncs
 * via Supabase (plan_overrides). Publish changes with the "Load latest plan" action.
 */
import type { Overrides } from './store';

export const DEFAULT_PLAN: Overrides = {
  // ── Day 1: Jun 16 (Tue) — Zadar arrival, swim, Velika Paklenica gorge hike, camp under Velebit (drive ~1.1h · good) ──
  'hr-zadar-airport':               { day: 1, dayOrder: 0 },
  'hr-zadar-old-town':              { day: 1, dayOrder: 1 },
  'hr-velika-paklenica-gorge':      { day: 1, dayOrder: 2 },
  'hr-camp-np-paklenica':           { day: 1, dayOrder: 3 },

  // ── Day 2: Jun 17 (Wed) — Paklenica to Split, Cetina canyoning at Omis, sleep Makarska Riviera (not Omis) (drive ~3h · good) ──
  'hr-split':                       { day: 2, dayOrder: 0 },
  'hr-kantun-paulina':              { day: 2, dayOrder: 1 },
  'hr-cetina-canyoning':            { day: 2, dayOrder: 2 },
  'hr-camping-krvavica':            { day: 2, dayOrder: 3 },

  // ── Day 3: Jun 18 (Thu) — Riviera to Peljesac to the Dubrovnik-airport pickup, then north to the Mljet-ferry camp (drive ~5h · full) ──
  'hr-peljesac-bridge':             { day: 3, dayOrder: 0 },
  'hr-mali-ston-oysters':           { day: 3, dayOrder: 1 },
  'hr-dubrovnik-airport-pickup':    { day: 3, dayOrder: 2 },
  'hr-camp-prapratno':              { day: 3, dayOrder: 3 },

  // ── Day 4: Jun 19 (Fri) — Ferry to Mljet, bike the salt-lake loop, cliff-jump at Odysseus Cave (drive ~0.4h · good) ──
  'hr-prapratno-ferry':             { day: 4, dayOrder: 0 },
  'hr-mljet-np':                    { day: 4, dayOrder: 1 },
  'hr-mljet-bike-rental-lakes':     { day: 4, dayOrder: 2 },
  'hr-odysseus-cave':               { day: 4, dayOrder: 3 },
  'hr-camp-marina-mljet':           { day: 4, dayOrder: 4 },

  // ── Day 5: Jun 20 (Sat) — Ferry to the mainland, Kravica falls, Pocitelj, into Mostar (drive ~3.8h · full) ──
  'hr-sobra-ferry':                 { day: 5, dayOrder: 0 },
  'ba-kravica':                     { day: 5, dayOrder: 1 },
  'ba-pocitelj':                    { day: 5, dayOrder: 2 },
  'ba-mostar':                      { day: 5, dayOrder: 3 },
  'ba-tima-irma':                   { day: 5, dayOrder: 4 },
  'ba-gem-mostar-nanas-house':      { day: 5, dayOrder: 5 },

  // ── Day 6: Jun 21 (Sun) — Blagaj Tekija, drive to Sarajevo via Konjic, Bascarsija, sunset fortress, night out (drive ~1.8h · good) ──
  'ba-blagaj':                      { day: 6, dayOrder: 0 },
  'ba-sarajevo':                    { day: 6, dayOrder: 1 },
  'ba-zuta-tabija':                 { day: 6, dayOrder: 2 },
  'ba-sarajevo-petica-ferhatovic':  { day: 6, dayOrder: 3 },
  'ba-kino-bosna-sarajevo':         { day: 6, dayOrder: 4 },
  'ba-air-1542024184506963047':     { day: 6, dayOrder: 5 },

  // ── Day 7: Jun 22 (Mon) — Sarajevo to the Tara rafting put-in, then the Piva canyon drive to Zabljak (drive ~5.8h · full) ──
  'ba-tjentiste-monument':          { day: 7, dayOrder: 0 },
  'me-tara-rafting-brstanovica':    { day: 7, dayOrder: 1 },
  'me-scepan-polje-piva-canyon':    { day: 7, dayOrder: 2 },
  'me-mratinje-dam':                { day: 7, dayOrder: 3 },
  'me-piva-lake-swim':              { day: 7, dayOrder: 4 },
  'me-camp-mlinski-potok':          { day: 7, dayOrder: 5 },

  // ── Day 8: Jun 23 (Tue) — One Durmitor summit (Prutas), Tara-bridge zipline, easy lake time around Zabljak (drive ~1.5h · good) ──
  'me-prutas-hike':                 { day: 8, dayOrder: 0 },
  'me-tara-bridge-zipline':         { day: 8, dayOrder: 1 },
  'me-oro-zabljak':                 { day: 8, dayOrder: 2 },
  'me-gem-zabljak-mountain-spark':  { day: 8, dayOrder: 3 },

  // ── Day 9: Jun 24 (Wed) — Off the mountain: Ostrog Monastery, Pavlova Strana, into Skadar Lake (drive ~4.3h · full) ──
  'me-ostrog-monastery':            { day: 9, dayOrder: 0 },
  'me-pavlova-strana':              { day: 9, dayOrder: 1 },
  'me-skadar-lake':                 { day: 9, dayOrder: 2 },
  'me-virpazar-kayak':              { day: 9, dayOrder: 3 },
  'me-vinarija-masanovic':          { day: 9, dayOrder: 4 },
  'me-guesthouse-skadar-raicevic':  { day: 9, dayOrder: 5 },

  // ── Day 10: Jun 25 (Thu) — Deep south: Bar sea-fishing, Stari Bar ruins, Ulcinj old town, Ada Bojana sunset (drive ~1.1h · good) ──
  'me-bar-fishing-beli':            { day: 10, dayOrder: 0 },
  'me-stari-bar':                   { day: 10, dayOrder: 1 },
  'me-ulcinj-old-town':             { day: 10, dayOrder: 2 },
  'me-ada-bojana-beach':            { day: 10, dayOrder: 3 },
  'me-camp-safari-beach':           { day: 10, dayOrder: 4 },

  // ── Day 11: Jun 26 (Fri) — Coast north: Budva, Kotor fortress, Perast, inland over the border to Trebinje (drive ~4.3h · full) ──
  'me-budva':                       { day: 11, dayOrder: 0 },
  'me-kotor':                       { day: 11, dayOrder: 1 },
  'me-tanjga-kotor':                { day: 11, dayOrder: 2 },
  'me-perast':                      { day: 11, dayOrder: 3 },
  'ba-trebinje-old-town':           { day: 11, dayOrder: 4 },
  'ba-air-1165836464333612445':     { day: 11, dayOrder: 5 },

  // ── Day 12: Jun 27 (Sat) — Trebinje to the Dubrovnik finale: Pasjaca cliff beach on the way in, then the walls, camp near the city (drive ~1.3h · good) ──
  'hr-pasjaca-beach':               { day: 12, dayOrder: 0 },
  'hr-dubrovnik':                   { day: 12, dayOrder: 1 },
  'hr-camping-kate-mlini':          { day: 12, dayOrder: 2 },

  // ── Day 13: Jun 28 (Sun) — Mlini to a last Dubrovnik morning, car drop, fly out (drive ~1h · light) ──
  'hr-dubrovnik-airport':           { day: 13, dayOrder: 0 },

};
