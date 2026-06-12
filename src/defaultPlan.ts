/**
 * Default day-assignment plan — pre-populates the Itinerary view on first load
 * so all 4 group members see the same plan without needing to share a URL.
 *
 * Generated from research/route-skeleton.md (v4, 2026-06-12).
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
  'hr-velika-paklenica-gorge': { day: 1, dayOrder: 3 },
  'hr-camp-np-paklenica':    { day: 1, dayOrder: 4 },

  // ── Day 2: Jun 17 (Wed) — Split walk → Omiš canyoning ───────────────────
  'hr-split':                { day: 2, dayOrder: 1 },
  'hr-kantun-paulina':       { day: 2, dayOrder: 2 },
  'hr-cetina-canyoning':     { day: 2, dayOrder: 3 },
  'hr-camp-lisicina':        { day: 2, dayOrder: 4 },

  // ── Day 3: Jun 18 (Thu) — Makarska swim → airport pickup → Prapratno ──
  // Keep this day conservative: Punta Rata + the pickup run, then straight to
  // Camp Prapratno so Friday's ferry to Mljet starts from a calm base.
  'hr-punta-rata':           { day: 3, dayOrder: 1 },
  'hr-peljesac-bridge':      { day: 3, dayOrder: 2 },
  'hr-mali-ston-oysters':    { day: 3, dayOrder: 3 },
  'hr-dubrovnik-airport-pickup': { day: 3, dayOrder: 4 },
  'hr-camp-prapratno':       { day: 3, dayOrder: 5 },

  // ── Day 4: Jun 19 (Fri) — Mljet ─────────────────────────────────────────
  // Friday ferry = lighter queue than Saturday. Full day on the island.
  'hr-prapratno-ferry':      { day: 4, dayOrder: 1 },
  'hr-mljet-np':             { day: 4, dayOrder: 2 },
  'hr-montokuc-mljet':       { day: 4, dayOrder: 3 },
  'hr-odysseus-cave':        { day: 4, dayOrder: 4 },
  'hr-camp-marina-mljet':    { day: 4, dayOrder: 5 },

  // ── Day 5: Jun 20 (Sat) — Mljet return ferry → Kravica → Počitelj → Mostar ──
  'hr-sobra-ferry':          { day: 5, dayOrder: 1 },
  'ba-kravica':              { day: 5, dayOrder: 2 },
  'ba-pocitelj':             { day: 5, dayOrder: 3 },
  'ba-mostar':               { day: 5, dayOrder: 4 },
  'ba-cafe-de-alma-mostar':  { day: 5, dayOrder: 5 },
  'ba-tima-irma':            { day: 5, dayOrder: 6 },
  'ba-gem-mostar-nanas-house': { day: 5, dayOrder: 7 },

  // ── Day 6: Jun 21 (Sun) — Blagaj → Sarajevo ───────────────────────────
  'ba-blagaj':               { day: 6, dayOrder: 1 },
  'ba-sarajevo':             { day: 6, dayOrder: 2 },
  'ba-zuta-tabija':          { day: 6, dayOrder: 3 },
  'ba-sarajevo-petica-ferhatovic': { day: 6, dayOrder: 4 },
  'ba-cinemas-sloga-latin-night': { day: 6, dayOrder: 5 },
  'ba-air-1542024184506963047': { day: 6, dayOrder: 6 },

  // ── Day 7: Jun 22 (Mon) — Sarajevo → Tara rafting → Piva → Žabljak ──────
  'me-tara-rafting-brstanovica': { day: 7, dayOrder: 1 },
  'me-scepan-polje-piva-canyon': { day: 7, dayOrder: 2 },
  'me-mratinje-dam':         { day: 7, dayOrder: 3 },
  'me-pluzine':              { day: 7, dayOrder: 4 },
  'me-piva-lake-swim':       { day: 7, dayOrder: 5 },
  'me-camp-mlinski-potok':   { day: 7, dayOrder: 6 },

  // ── Day 8: Jun 23 (Tue) — Durmitor hike day ─────────────────────────────
  // Prutaš is the default mixed-group summit; the more technical Durmitor
  // scrambles stay in the data as manual swaps.
  'me-prutas-hike':          { day: 8, dayOrder: 1 },
  'me-zabljak':              { day: 8, dayOrder: 2 },
  'me-oro-zabljak':          { day: 8, dayOrder: 3 },
  'me-gem-zabljak-mountain-spark': { day: 8, dayOrder: 4 },

  // ── Day 9: Jun 24 (Wed) — Ostrog → Skadar Lake ──────────────────────────
  'me-ostrog-monastery':     { day: 9, dayOrder: 1 },
  'me-pavlova-strana':       { day: 9, dayOrder: 2 },
  'me-skadar-lake':          { day: 9, dayOrder: 3 },
  'me-virpazar-kayak':       { day: 9, dayOrder: 4 },
  'me-vinarija-masanovic':   { day: 9, dayOrder: 5 },
  // SLEEP option: Raicevic guesthouse (★9.3, fish dinner, private beach).
  'me-guesthouse-skadar-raicevic':     { day: 9, dayOrder: 6 },

  // ── Day 10: Jun 25 (Thu) — Stari Bar → Ulcinj → Velika Plaža (overnight) ──
  // Keep the deep-south day to a half-day unless the group explicitly wants
  // a kitesurfing-heavy Ada Bojana extension.
  'me-stari-bar':            { day: 10, dayOrder: 1 },
  'me-ulcinj-old-town':      { day: 10, dayOrder: 2 },
  'me-misko-stilt-restaurant': { day: 10, dayOrder: 3 },
  'me-camp-safari-beach':    { day: 10, dayOrder: 4 },

  // ── Day 11: Jun 26 (Fri) — Sveti Stefan → Budva → Kotor → Trebinje ───────
  'me-sveti-stefan':         { day: 11, dayOrder: 1 },
  'me-budva':                { day: 11, dayOrder: 2 },
  'me-kotor':                { day: 11, dayOrder: 3 },
  'me-tanjga-kotor':         { day: 11, dayOrder: 4 },
  'me-perast':               { day: 11, dayOrder: 5 },
  'me-vitaljina-border':     { day: 11, dayOrder: 6 },
  'ba-trebinje-old-town':    { day: 11, dayOrder: 7 },
  'ba-air-1165836464333612445': { day: 11, dayOrder: 8 },

  // ── Day 12: Jun 27 (Sat) — Dubrovnik walls → Pasjača Beach ──────────────
  // Day freed by going directly to Mljet after airport pickup (not camping near Dubrovnik).
  // Drive from Trebinje (~30 min). Walls open 06:30 — done before cruise ships (~10:00).
  'hr-dubrovnik':            { day: 12, dayOrder: 1 },
  'hr-pasjaca-beach':        { day: 12, dayOrder: 2 },
  'hr-camping-kate-mlini':   { day: 12, dayOrder: 3 },

  // ── Day 13: Jun 28 (Sun) — Dubrovnik → car drop & fly ───────────────────
  'hr-dubrovnik-airport':    { day: 13, dayOrder: 1 },
};
