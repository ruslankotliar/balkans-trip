/**
 * Default day-assignment plan — pre-populates the Itinerary view on first load
 * so all 4 group members see the same plan without needing to share a URL.
 *
 * Generated from research/route-skeleton.md (v2, 2026-06-11).
 * Only day + dayOrder are set here; status is baked into src/data/*.json.
 *
 * loadOverrides() seeds from this when localStorage is empty (first visit).
 * Once a user has any override saved, this file is ignored for that device.
 */

import type { Overrides } from './store';

export const DEFAULT_PLAN: Overrides = {
  // ── Day 1: Jun 16 (Tue) — Zadar → Paklenica ──────────────────────────────
  'hr-zadar-airport':        { day: 1, dayOrder: 1 },
  'hr-zadar-old-town':       { day: 1, dayOrder: 2 },
  'hr-cape-planka-stargazing': { day: 1, dayOrder: 3 },
  'hr-velika-paklenica-gorge': { day: 1, dayOrder: 4 },
  'hr-anica-kuk':            { day: 1, dayOrder: 5 },
  'hr-camp-np-paklenica':    { day: 1, dayOrder: 6 },
  'hr-villa-stone-house-martelina': { day: 1, dayOrder: 7 },

  // ── Day 2: Jun 17 (Wed) — Omiš canyoning ─────────────────────────────────
  'hr-split':                { day: 2, dayOrder: 1 },
  'hr-kantun-paulina':       { day: 2, dayOrder: 2 },
  'hr-cetina-canyoning':     { day: 2, dayOrder: 3 },
  'hr-camp-lisicina':        { day: 2, dayOrder: 4 },

  // ── Day 3: Jun 18 (Thu) — Makarska → Biokovo → Dubrovnik airport ─────────
  'hr-punta-rata':           { day: 3, dayOrder: 1 },
  'hr-sveti-jure':           { day: 3, dayOrder: 2 },
  'hr-biokovo-tollroad':     { day: 3, dayOrder: 3 },
  'hr-peljesac-bridge':      { day: 3, dayOrder: 4 },
  'hr-konoba-feral-brijesta': { day: 3, dayOrder: 5 },
  'hr-mali-ston-oysters':    { day: 3, dayOrder: 6 },
  'hr-camping-kate-mlini':   { day: 3, dayOrder: 7 },

  // ── Day 4: Jun 19 (Fri) — Dubrovnik ─────────────────────────────────────
  'hr-dubrovnik':            { day: 4, dayOrder: 1 },
  'hr-dubrovnik-sea-kayak':  { day: 4, dayOrder: 2 },

  // ── Day 5: Jun 20 (Sat) — Mljet ─────────────────────────────────────────
  'hr-camp-prapratno':       { day: 5, dayOrder: 1 },
  'hr-mljet-np':             { day: 5, dayOrder: 2 },
  'hr-montokuc-mljet':       { day: 5, dayOrder: 3 },
  'hr-odysseus-cave':        { day: 5, dayOrder: 4 },
  'hr-camp-marina-mljet':    { day: 5, dayOrder: 5 },

  // ── Day 6: Jun 21 (Sun) — Kravica → Mostar ──────────────────────────────
  'ba-trebizat-canoe':       { day: 6, dayOrder: 1 },
  'ba-kravica':              { day: 6, dayOrder: 2 },
  'ba-mostar':               { day: 6, dayOrder: 3 },
  'ba-tima-irma':            { day: 6, dayOrder: 4 },
  'ba-gem-mostar-nanas-house': { day: 6, dayOrder: 5 },
  'ba-villa-cold-river-treehouse-bunica': { day: 6, dayOrder: 6 },

  // ── Day 7: Jun 22 (Mon) — Mostar → Sarajevo ─────────────────────────────
  'ba-jablanica-kayak-neretva': { day: 7, dayOrder: 1 },
  'ba-neretva-rafting-konjic': { day: 7, dayOrder: 2 },
  'ba-sarajevo':             { day: 7, dayOrder: 3 },
  'ba-tunnel-of-hope':       { day: 7, dayOrder: 4 },
  'ba-bobsled-track':        { day: 7, dayOrder: 5 },
  'ba-zuta-tabija':          { day: 7, dayOrder: 6 },
  'ba-sarajevo-petica-ferhatovic': { day: 7, dayOrder: 7 },
  'ba-air-1542024184506963047': { day: 7, dayOrder: 8 },

  // ── Day 8: Jun 23 (Tue) — Sarajevo → Tara rafting → Žabljak ─────────────
  'ba-tjentiste-monument':   { day: 8, dayOrder: 1 },
  'me-scepan-polje-piva-canyon': { day: 8, dayOrder: 2 },
  'me-tara-rafting-brstanovica': { day: 8, dayOrder: 3 },
  'me-mratinje-dam':         { day: 8, dayOrder: 4 },
  'me-pluzine':              { day: 8, dayOrder: 5 },
  'me-piva-lake-swim':       { day: 8, dayOrder: 6 },
  'me-camp-mlinski-potok':   { day: 8, dayOrder: 7 },
  'me-camp-grab':            { day: 8, dayOrder: 8 },

  // ── Day 9: Jun 24 (Wed) — Durmitor hike ─────────────────────────────────
  'me-veliki-medjed':        { day: 9, dayOrder: 1 },
  'me-prutas-hike':          { day: 9, dayOrder: 2 },
  'me-vrazje-jezero':        { day: 9, dayOrder: 3 },
  'me-zabljak':              { day: 9, dayOrder: 4 },
  'me-oro-zabljak':          { day: 9, dayOrder: 5 },
  'me-gem-zabljak-mountain-spark': { day: 9, dayOrder: 6 },

  // ── Day 10: Jun 25 (Thu) — Tara Bridge → Ostrog → Skadar Lake ───────────
  'me-tara-bridge-zipline':  { day: 10, dayOrder: 1 },
  'me-ostrog-monastery':     { day: 10, dayOrder: 2 },
  'me-skadar-lake':          { day: 10, dayOrder: 3 },
  'me-pavlova-strana':       { day: 10, dayOrder: 4 },
  'me-virpazar-kayak':       { day: 10, dayOrder: 5 },
  'me-vinarija-masanovic':   { day: 10, dayOrder: 6 },
  'me-villa-jablan-winery-rvasi': { day: 10, dayOrder: 7 },
  'me-camp-radoman':         { day: 10, dayOrder: 8 },
  'me-gem-skadar-orahovo-koliba': { day: 10, dayOrder: 9 },

  // ── Day 11: Jun 26 (Fri) — Stari Bar → Sveti Stefan → Budva ────────────
  'me-stari-bar':            { day: 11, dayOrder: 1 },
  'me-budva':                { day: 11, dayOrder: 2 },
  'me-budva-oldtown-bars':   { day: 11, dayOrder: 3 },
  'me-sparta-club-budva':    { day: 11, dayOrder: 4 },
  'me-gem-budva-got-it':     { day: 11, dayOrder: 5 },
  'me-camp-maslina-buljarica': { day: 11, dayOrder: 6 },

  // ── Day 12: Jun 27 (Sat) — Kotor → Perast → Trebinje ───────────────────
  'me-kotor':                { day: 12, dayOrder: 1 },
  'me-kotor-fortress-paid':  { day: 12, dayOrder: 2 },
  'me-lovcen-njegos-mausoleum': { day: 12, dayOrder: 3 },
  'me-tanjga-kotor':         { day: 12, dayOrder: 4 },
  'me-perast':               { day: 12, dayOrder: 5 },
  'me-vitaljina-border':     { day: 12, dayOrder: 6 },
  'ba-trebinje-old-town':    { day: 12, dayOrder: 7 },
  'ba-air-1165836464333612445': { day: 12, dayOrder: 8 },
  'ba-villa-village-house-cvaljina': { day: 12, dayOrder: 9 },

  // ── Day 13: Jun 28 (Sun) — Dubrovnik → car drop ─────────────────────────
  'hr-pasjaca-beach':        { day: 13, dayOrder: 1 },
  'hr-dubrovnik-airport':    { day: 13, dayOrder: 2 },
};
