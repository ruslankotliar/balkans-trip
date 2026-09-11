/**
 * Albania, Sep 12-19 2026 - the baked day plan. Seeds a phone's first visit to
 * the trip (the Supabase project is gone, so this is how the plan reaches a phone).
 * Generated from the vault's Plan.md by a script; day + dayOrder, plus timeMinutes where the
 * category default is wrong (a sleep stop counts 15 min unless overridden). Other durations
 * sit on the places (timeNeeded), walks and unrouted drives on legMinutes.
 */
import type { Overrides } from './store';

/** When the plan last changed - a phone that seeded an older plan is offered this one. */
export const ALBANIA_PLAN_VERSION = '12 Sep 01:32';
// plan hash: a48bb0b9

export const ALBANIA_PLAN: Overrides = {
  // -- Day 1: Sat Sep 12 --
  "al-tirana-airport-arrival": { day: 1, dayOrder: 1 },
  "al-spar-lezhe": { day: 1, dayOrder: 2 },
  "al-beach-camp-shengjin": { day: 1, dayOrder: 3, timeMinutes: 30 },
  "al-rana-e-hedhun": { day: 1, dayOrder: 4 },
  "al-kult-beach-bar": { day: 1, dayOrder: 5 },
  // -- Day 2: Sun Sep 13 --
  "al-tiny-house-shiroka": { day: 2, dayOrder: 1 },
  "al-mesi-bridge": { day: 2, dayOrder: 2 },
  "al-kir-canyon-pools": { day: 2, dayOrder: 3 },
  "al-zhyle-cave": { day: 2, dayOrder: 4 },
  "al-shpija-e-mishit": { day: 2, dayOrder: 5 },
  "al-shiroka-promenade-fish": { day: 2, dayOrder: 6 },
  // -- Day 3: Mon Sep 14 --
  "al-stolia-shkoder": { day: 3, dayOrder: 1 },
  "al-te-tullat-e-kuqe": { day: 3, dayOrder: 2 },
  "al-outdoor-shop-shkoder": { day: 3, dayOrder: 3 },
  "al-riparime-gazi": { day: 3, dayOrder: 4 },
  "al-pajisje-gazi": { day: 3, dayOrder: 5 },
  "al-olympic-sports": { day: 3, dayOrder: 6 },
  "al-arme-gjahu": { day: 3, dayOrder: 7 },
  "al-store-and-go-locker": { day: 3, dayOrder: 8 },
  "al-conad-shkoder": { day: 3, dayOrder: 9 },
  "al-big-market-shkoder": { day: 3, dayOrder: 10 },
  "al-spar-shkoder": { day: 3, dayOrder: 11 },
  "al-qafa-e-thores": { day: 3, dayOrder: 12 },
  "al-camping-balcony": { day: 3, dayOrder: 13 },
  "al-guesthouse-pashko": { day: 3, dayOrder: 14 },
  "al-zariklis": { day: 3, dayOrder: 15 },
  "al-theth-canyon-loop": { day: 3, dayOrder: 16 },
  "al-ura-e-gerles": { day: 3, dayOrder: 17 },
  "al-theth-church-tower": { day: 3, dayOrder: 18 },
  "al-theth-village-dinner": { day: 3, dayOrder: 19 },
  // -- Day 4: Tue Sep 15 --
  "al-shala-dawn-fish": { day: 4, dayOrder: 1 },
  "al-nderlysaj-parking": { day: 4, dayOrder: 2 },
  "al-blue-eye-theth": { day: 4, dayOrder: 3 },
  "al-vaskat-nderlysaj": { day: 4, dayOrder: 4 },
  "al-theth-lunch": { day: 4, dayOrder: 5 },
  "al-shala-pool-theth": { day: 4, dayOrder: 6 },
  "al-shala-village-fish": { day: 4, dayOrder: 7 },
  "al-nderlysa-fish": { day: 4, dayOrder: 8 },
  "al-gjon-shpella": { day: 4, dayOrder: 9 },
  "al-villa-belinis": { day: 4, dayOrder: 10 },
  "al-restorant-zorgji": { day: 4, dayOrder: 11 },
  "al-camping-balcony-n2": { day: 4, dayOrder: 12 },
  // -- Day 5: Wed Sep 16 --
  "al-loop-start": { day: 5, dayOrder: 1 },
  "al-shtraza-springs": { day: 5, dayOrder: 2 },
  "al-peja-lake": { day: 5, dayOrder: 3 },
  "al-white-spring-camp": { day: 5, dayOrder: 4 },
  // -- Day 6: Thu Sep 17 --
  "al-gropa-e-bukur-spring": { day: 6, dayOrder: 1 },
  "al-high-camp-2206": { day: 6, dayOrder: 2 },
  // -- Day 7: Fri Sep 18 --
  "al-valbona-pass": { day: 7, dayOrder: 1 },
  "al-balcony-shower-car": { day: 7, dayOrder: 2 },
  "al-tirana-flat": { day: 7, dayOrder: 3, timeMinutes: 150 },
  "al-pyramid-tirana": { day: 7, dayOrder: 4 },
  "al-pazari-i-ri": { day: 7, dayOrder: 5 },
  "al-oda-tirana": { day: 7, dayOrder: 6 },
  "al-mullixhiu": { day: 7, dayOrder: 7 },
  "al-nouvelle-vague": { day: 7, dayOrder: 8 },
  "al-sky-club-tirana": { day: 7, dayOrder: 9 },
  "al-radio-bar-tirana": { day: 7, dayOrder: 10 },
  "al-hemingway-bar-tirana": { day: 7, dayOrder: 11 },
  "al-komiteti-tirana": { day: 7, dayOrder: 12 },
  "al-kino-tirana": { day: 7, dayOrder: 13 },
  "al-tunel-tirana": { day: 7, dayOrder: 14 },
  "al-magic-club-tirana": { day: 7, dayOrder: 15 },
  // -- Day 8: Sat Sep 19 --
  "al-mulliri-i-vjeter": { day: 8, dayOrder: 1 },
  "al-tirana-airport-departure": { day: 8, dayOrder: 2 },
  // Per-day start / wrap-by hours for the schedule clock (see DAY_CONFIG_ID in App.tsx).
  '__day_config__': { note: "{\"1\":{\"startHour\":13.5,\"note\":\"Rain on landing day: 10-25 mm at the beach, gusts to 26 km/h; dry from Sunday (3 models, pulled Sat 12 Sep 01:00)\"},\"2\":{\"startHour\":9.5,\"note\":\"Dry, 27-30 C, night 17-19 C (3 models, pulled Sat 12 Sep 01:00)\"},\"3\":{\"startHour\":8.5,\"note\":\"Theth: dry, 20-23 C, night 9-11 C (3 models, pulled Sat 12 Sep 01:00)\"},\"4\":{\"startHour\":6,\"note\":\"Theth: dry (0-1 mm), 20-23 C, night 12-14 C (3 models, pulled Sat 12 Sep 01:00)\"},\"5\":{\"startHour\":7,\"note\":\"1,673 m camp: dry, 17-19 C by day, 5-10 C at night, gusts to 30 km/h (3 models, pulled Sat 12 Sep 01:00)\"},\"6\":{\"startHour\":8,\"note\":\"2,206 m camp: DRY on all 3 models - on Fri 11 it was 0-10 mm on 2 of 3. Night 2-6 C, gusts 24-35 km/h (3 models, pulled Sat 12 Sep 01:00)\"},\"7\":{\"startHour\":7,\"endHour\":27,\"note\":\"Descent dry, 17-20 C at the pass; Tirana 28-32 C (3 models, pulled Sat 12 Sep 01:00)\"},\"8\":{\"startHour\":9,\"endHour\":14,\"note\":\"Tirana 30-33 C, dry (3 models, pulled Sat 12 Sep 01:00)\"}}" },
};
