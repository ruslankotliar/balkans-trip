# Croatia deep gem hunt — notes (2026-06-11)

Mission: after ~14 prior sessions and **126 existing HR pins**, find genuinely hidden Croatian gems the fleet *missed*, using local-language + niche angles. Inventory built first: every `src/data/*.json` HR place (id + name + coords) dumped and used as a live dedup set; near-duplicate check run at ≤600m radius against all existing HR coordinates.

**Result: 12 new pins in `src/data/hr-gems-deep.json`** (all `status: candidate`, tag `deep-dive`). Every coordinate geocoded live against OSM/Nominatim this session. A few promising leads were dropped for failing the coordinate-confidence or first-person-sourcing bar (listed at the end).

## Which angle surfaced each find

| Find | Angle |
|---|---|
| `hr-berberov-buk` Zrmanja swim falls | **Local-language river-swimming** ("Zrmanja kupanje skriveni slap"). Existing data had Zrmanja *viewpoint* and *kayaking base* but not the swimmable tufa pools at Berberov buk — a free Krka-alternative on the Knin/inland Zadar→Split variant. |
| `hr-velika-gubavica` Cetina waterfall + rim viewpoints | **Local-language** ("Velika Gubavica slap vidikovac kupanje"). Dalmatia's tallest waterfall (~48m). NOTE: 479m from the existing `hr-cetina-canyoning` *activity* pin — kept deliberately as the **free roadside rim-viewpoint** angle (the canyoning pin is a paid guided booking); honest caveat that the swim-pond descent needs a guide. |
| `hr-mosor-girometta` Mosor / Veliki Kabal | **"Sunset/viewpoint road locals name" + "meditation on a mountain".** Mosor is the Split–Omiš ridge locals climb instead of Biokovo; the 1929 Girometta hut + 1339m summit had zero presence in 126 pins. Free, no toll road, crowd-free. |
| `hr-duboka-draga-vrsi` Vrsi cove | **Local-language "skrivene plaže okolica Zadra"** + negative-space (Zadar archipelago/north-Zadar coast). Secluded cliff cove via 1km makadam; the Vrsi trio (Duboka Draga / Velika Rasovača / Matejina) never pinned. |
| `hr-blace-mljet` Blace/Limuni lagoon | **Secret swim-cove + sailing-forum angle.** Sandy "Caribbean" lagoon on Mljet's east tip, *outside* the NP ticket zone, 20-min walk from already-planned Saplunara. Distinct from every existing Mljet pin (NP, Montokuc, Odysseus Cave, Stermasi). Strongest single find. |
| `hr-kobas-bay` Kobaš cove | **Sailing/anchorage forums** ("secret anchorage Pelješac quiet bay"). Secluded sandy cove + 3 fish konobas 7km from Ston, on the Dubrovnik approach; access road so awkward it stays empty. |
| `hr-gastro-mare-kobas` Gastro Mare konoba | **No-website konoba** angle, folded out of the Kobaš find — the standout of the bay's three taverns, open kitchen, homegrown produce. |
| `hr-nakovana` ghost village + Spila cave | **Abandoned-but-legal + ancient-cave angle.** Depopulated stone hamlet + undisturbed Iron-Age Illyrian cave sanctuary (sealed ~2000 yrs, opened 1999; 2024 dig found a Greek theatre mask). Easy ~2h walk, pairs with the existing Sveti Ilija hike. |
| `hr-zitna-zavalatica` Korčula cove | **Local-language "najljepše uvale Korčula".** Quiet south-coast cove outside Zavalatica — backup for the Korčula-vs-Mljet block; rated modestly (3) as it's pretty-but-not-unique. |
| `hr-cikola-canyon` Drniš | **Negative-space scan of the Šibenik–Split inland belt.** Wild Čikola karst canyon: marked lookouts, ~50 climbing routes, canyoning line, Topla peć cave. The inland-belt blank zone had nothing. |
| `hr-konoba-campanelo` Mirlović Zagora | **No-website-ish konoba + inland-belt negative space.** Grandfather's stable turned 3-toque Gault&Millau peka/tasting-menu konoba miles from anywhere in the Zagora. |
| `hr-konoba-ivankovski` Konavle | **No-website family konoba + Konavle hinterland.** Garden-to-table farm konoba near Gruda; 24h lamb-peka pre-order, they'll even drive you. Complements the already-pinned (and more touristy) Konavoski dvori. |

## The 3 best finds, argued

1. **Blace / Limuni lagoon, Mljet (`hr-blace-mljet`)** — The clearest miss. The island block is *already* going to Mljet (Saplunara/Stermasi/Odysseus all pinned), and 20 minutes' walk past them, outside the NP ticket zone, sits a ~1km sandy lagoon with an 8m-wide neck that keeps the water bath-warm and the sailors out. Sandy bottom (rare in HR), "looks like the Caribbean", "barely visited, a must". It converts an existing stop into a half-day highlight for free, with zero added driving. Rated 5.

2. **Mosor — Girometta lodge & Veliki Kabal (`hr-mosor-girometta`)** — The data is saturated with Biokovo (skywalk, Vošac, Sveti Jure, toll road, paragliding) but the mountain *locals actually use* between Split and Omiš — Mosor — was absent. Free, no toll, no crowds, a 1929 hut with a 100-seat shaded terrace and a 1339m summit with a 360° panorama. It's the literal "meditation on a mountain, no limits" the group profile asks for, on the exact Zadar→Split→Omiš corridor, and every prior mountain pin here costs a booking or a toll.

3. **Nakovana ghost village + Spila cave (`hr-nakovana`)** — Hits three under-used themes at once (abandoned-but-legal, ancient/niche history, easy hike) on a peninsula the fleet only ever covered at sea level (wineries, beaches, Sveti Ilija summit). An empty stone village above an Illyrian sanctuary that sat sealed for two millennia, reached by a flat ~2h walk from a chapel — and it shares a trailhead with the already-pinned Sveti Ilija, so it's a free add to a planned hike.

## Leads chased but dropped (so nobody re-digs)

- **Uvala Vučine (Pelješac)** — geocoded 42.886, 17.451, i.e. ~500m from the existing `hr-zuljana` pin. Same Žuljana beach cluster, not a distinct gem. Dropped.
- **Mali Pisak / Jovići cove (near Zadar/Sukošan)** — praised in Croatian "skrivene plaže" articles, but Nominatim could not return reliable coordinates for the specific cove. **Wrong-pin-is-worse-than-no-pin** → left out.
- **Plaža Jezero (Duba, Pelješac)** — boat-only access, no road and no car-reachable trail confirmed; fails the "reachable by car/short walk" test for this trip. Noted, not pinned.
- **Zabiokovlje / Biokovo back side (Rašćane, Župa, Zagvozd; Vrgorska Matica river swimming)** — negative-space scan of the Biokovo hinterland turned up only thin, non-first-person sourcing for a specific pinnable swim spot. Left out.
- **Vis abandoned military battery / submarine base** — strong urbex, but Vis is already in the data as a structurally-impossible "skip" (`hr-vis-bisevo-blue-cave`); no point re-pinning a sub-feature of a rejected island.
- **Visovac / Roški backcountry** — all swimmable/notable parts are inside Krka NP (already pinned) or duplicate Roški slap; nothing new and legal-to-swim outside it.

## Honest coverage verdict

**Croatia was already very well covered — arguably the most thoroughly covered country in the dataset.** 126 HR pins span every node of the corridor, both NP debates (Plitvice/Krka) are resolved with drive math, Konavle and Pelješac-north were *already* explicitly negative-space-swept by the gap-hunt session, and the obvious "hidden beaches" (Divna, Vrulja, Pasjača, Nugal) are taken. I did **not** find a large untapped seam — most local-language searches led back to places already pinned or to near-duplicates.

What I *did* find is a tight set of 12 genuine, verified additions clustered in three real blind spots the fleet under-worked: **(1) inland river/canyon swimming** (Berberov buk, Gubavica, Čikola), **(2) the non-Biokovo mountain & ancient-cave/ghost-village angle** (Mosor, Nakovana), and **(3) no-website hinterland konobas + a couple of truly secluded swim coves** (Kobaš/Gastro Mare, Duboka Draga, Blace, Ivankovski, Campanelo). Blace and Mosor are the two I'd actually fight to keep; the rest are good honest backups, not headline acts. This is a "fine result, no padding" outcome — the bar was high and Croatia was close to mined out.
