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
  'hr-zrmanja-kayaking':     { day: 1, dayOrder: 8 },
  'hr-zavizan-dark-sky':     { day: 1, dayOrder: 9 },

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
  'hr-camp-lupis-loviste':   { day: 4, dayOrder: 3 },

  // ── Day 5: Jun 20 (Sat) — Mljet ─────────────────────────────────────────
  'hr-camp-prapratno':       { day: 5, dayOrder: 1 },
  'hr-mljet-np':             { day: 5, dayOrder: 2 },
  'hr-montokuc-mljet':       { day: 5, dayOrder: 3 },
  'hr-odysseus-cave':        { day: 5, dayOrder: 4 },
  'hr-camp-marina-mljet':    { day: 5, dayOrder: 5 },

  // ── Day 6: Jun 21 (Sun) — Kravica → Počitelj → Fortica → Mostar ─────────
  'ba-trebizat-canoe':       { day: 6, dayOrder: 1 },
  'ba-kravica':              { day: 6, dayOrder: 2 },
  'ba-pocitelj':             { day: 6, dayOrder: 3 },
  'ba-fortica-mostar':       { day: 6, dayOrder: 4 },
  'ba-mostar':               { day: 6, dayOrder: 5 },
  'ba-sniper-tower-mostar':  { day: 6, dayOrder: 6 },
  'ba-cafe-de-alma-mostar':  { day: 6, dayOrder: 7 },
  'ba-tima-irma':            { day: 6, dayOrder: 8 },
  'ba-gem-mostar-nanas-house': { day: 6, dayOrder: 9 },
  'ba-villa-cold-river-treehouse-bunica': { day: 6, dayOrder: 10 },
  'ba-daorson':              { day: 6, dayOrder: 11 },

  // ── Day 7: Jun 22 (Mon) — Mostar → Sarajevo ─────────────────────────────
  'ba-blagaj':               { day: 7, dayOrder: 0 },
  'ba-jablanica-kayak-neretva': { day: 7, dayOrder: 1 },
  'ba-neretva-rafting-konjic': { day: 7, dayOrder: 2 },
  'ba-boracko-lake':         { day: 7, dayOrder: 3 },
  'ba-sarajevo':             { day: 7, dayOrder: 4 },
  'ba-tunnel-of-hope':       { day: 7, dayOrder: 5 },
  'ba-trebevic-cable-car':   { day: 7, dayOrder: 6 },
  'ba-bobsled-track':        { day: 7, dayOrder: 7 },
  'ba-sarajevo-pivara':      { day: 7, dayOrder: 8 },
  'ba-zuta-tabija':          { day: 7, dayOrder: 9 },
  'ba-sarajevo-petica-ferhatovic': { day: 7, dayOrder: 10 },
  'ba-air-1542024184506963047': { day: 7, dayOrder: 11 },
  'ba-lukomir':              { day: 7, dayOrder: 12 },
  'ba-gem-konjic-lakeview-studio': { day: 7, dayOrder: 13 },

  // ── Day 8: Jun 23 (Tue) — Sarajevo → Sand Pyramids → Tara rafting → Žabljak ─
  'ba-sand-pyramids-foca':   { day: 8, dayOrder: 0 },
  'ba-tjentiste-monument':   { day: 8, dayOrder: 1 },
  'me-tara-rafting-brstanovica': { day: 8, dayOrder: 2 },
  'me-scepan-polje-piva-canyon': { day: 8, dayOrder: 3 },
  'me-mratinje-dam':         { day: 8, dayOrder: 4 },
  'me-pluzine':              { day: 8, dayOrder: 5 },
  'me-piva-lake-swim':       { day: 8, dayOrder: 6 },
  'me-trnovacko-jezero':     { day: 8, dayOrder: 7 },
  'me-camp-mlinski-potok':   { day: 8, dayOrder: 8 },
  'me-camp-grab':            { day: 8, dayOrder: 9 },

  // ── Day 9: Jun 24 (Wed) — Durmitor hike ─────────────────────────────────
  'me-veliki-medjed':        { day: 9, dayOrder: 1 },
  'me-prutas-hike':          { day: 9, dayOrder: 2 },
  'me-vrazje-jezero':        { day: 9, dayOrder: 3 },
  'me-zabljak':              { day: 9, dayOrder: 4 },
  'me-planinica':            { day: 9, dayOrder: 5 },
  'me-grabovica-canyon':     { day: 9, dayOrder: 6 },
  'me-oro-zabljak':          { day: 9, dayOrder: 7 },
  'me-gem-zabljak-mountain-spark': { day: 9, dayOrder: 8 },

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

  // ── Day 11: Jun 26 (Fri) — Stari Bar → Ulcinj → Ada Bojana (overnight) ──
  'me-stari-bar':            { day: 11, dayOrder: 1 },
  'me-ulcinj-old-town':      { day: 11, dayOrder: 2 },
  'me-ada-bojana-beach':     { day: 11, dayOrder: 3 },
  'me-misko-stilt-restaurant': { day: 11, dayOrder: 4 },
  'me-fkk-camp-ada-bojana':  { day: 11, dayOrder: 5 },
  // Budva / Sparta club kept as candidates — group can add them Day 11 if
  // skipping Ada Bojana, or Day 12 on the way back north through Budva.

  // ── Day 12: Jun 27 (Sat) — Ada Bojana → Sveti Stefan → Kotor → Trebinje ─
  'me-sveti-stefan':         { day: 12, dayOrder: 1 },
  'me-budva':                { day: 12, dayOrder: 2 },
  'me-kotor':                { day: 12, dayOrder: 3 },
  'me-kotor-fortress-paid':  { day: 12, dayOrder: 4 },
  'me-lovcen-njegos-mausoleum': { day: 12, dayOrder: 5 },
  'me-tanjga-kotor':         { day: 12, dayOrder: 6 },
  'me-perast':               { day: 12, dayOrder: 7 },
  'me-lustica-blue-cave':    { day: 12, dayOrder: 8 },
  'me-vitaljina-border':     { day: 12, dayOrder: 9 },
  'ba-trebinje-old-town':    { day: 12, dayOrder: 10 },
  'ba-air-1165836464333612445': { day: 12, dayOrder: 11 },
  'ba-villa-village-house-cvaljina': { day: 12, dayOrder: 12 },

  // ── Day 13: Jun 28 (Sun) — Dubrovnik → car drop ─────────────────────────
  'hr-pasjaca-beach':        { day: 13, dayOrder: 1 },
  'hr-dubrovnik-airport':    { day: 13, dayOrder: 2 },
};
