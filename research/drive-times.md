# Drive-time estimates (OSRM, fetched 2026-06-10)

Source: OSRM public routing API (car profile). **Caveats:** no border-queue time, no traffic, mountain roads are often slower in reality (+20–30%), ferries NOT included. Treat as lower bounds for decision-making, not gospel. Legs marked ⚠ need verification by research sessions.

## Legs

### Croatia: Zadar → Dubrovnik (Jun 16–18)

| Leg | Time | km |
|---|---|---|
| Zadar → Paklenica (Starigrad) | 0:54 | 46 |
| Zadar → Plitvice | 2:33 | 146 |
| Plitvice → Krka (Skradin) | 2:48 | 188 |
| Zadar → Krka (Skradin) | 1:00 | 76 |
| Zadar → Knin (inland option) | 1:41 | 110 |
| Knin → Split | 1:59 | 86 |
| Krka → Split | 1:12 | 93 |
| Split → Omiš | 0:37 | 25 |
| Omiš → Makarska | 0:49 | 37 |
| Makarska → Dubrovnik | 2:52 | 187 |
| Dubrovnik → Dubrovnik Airport | 0:36 | 22 |

### Pelješac / islands block

| Leg | Time | km |
|---|---|---|
| Ploče → Orebić (Korčula ferry) | 1:23 | 72 |
| Orebić → Prapratno (Mljet ferry) | 1:24 | 55 |
| Ploče → Prapratno | 1:22 | 51 |
| Prapratno → Dubrovnik | 1:39 | 66 |

### Bosnia

| Leg | Time | km |
|---|---|---|
| Dubrovnik → Kravica | 2:19 | 121 |
| Kravica → Mostar | 0:52 | 45 |
| Dubrovnik Airport → Trebinje | 0:58 | 39 |
| Trebinje → Mostar | 2:17 | 113 |
| Mostar → Jablanica | 0:45 | 40 |
| Jablanica → Konjic | 0:35 | 25 |
| Mostar → Konjic | 1:21 | 69 |
| Konjic → Sarajevo | 0:51 | 57 |
| Sarajevo → Tjentište (Sutjeska) | 2:03 | 113 |
| Konjic → Tjentište direct (mountain road) | 2:41 | 160 |
| Tjentište → Žabljak ⚠ | 3:11 | 153 |

⚠ OSRM routed Tjentište→Žabljak in 153 km — OSRM missed the intended route. The group's planned road is: Šćepan Polje (BiH/ME border, Tara rafting) → Piva canyon tunnels (56 unlit, lights on) → Plužine → Mratinje dam → Piva Lake swim → Žabljak. This is ~110 km. Estimated driving time Šćepan Polje → Žabljak = **~2.5–3h** (mountain road, Piva canyon is slow). From Sarajevo: Sarajevo → Tjentište 2:03, Tjentište → Šćepan Polje ~1h = **~3h Sarajevo → Šćepan Polje** (plus ~1h before rafting start = leave Sarajevo 07:00, arrive 10:00 for rafting). This route is confirmed.

### Montenegro

| Leg | Time | km |
|---|---|---|
| Žabljak → Tara bridge (Đurđevića) | 0:31 | 23 |
| Žabljak → Ostrog | 2:11 | 95 |
| Ostrog → Podgorica | 1:03 | 43 |
| Podgorica → Virpazar (Skadar) | 0:33 | 29 |
| Virpazar → Bar | 0:30 | 24 |
| Bar → Ulcinj | 0:34 | 26 |
| Ulcinj → Budva | 1:33 | 64 |
| Virpazar → Sveti Stefan | 0:47 | 35 |
| Sveti Stefan → Budva | 0:18 | 10 |
| Budva → Kotor | 0:28 | 21 |
| Kotor → Dubrovnik (excl. border queue!) | 1:48 | 78 |

## Variant math (the decisions the sketch opens)

### 1. Zadar → Split: coast vs mountains vs Plitvice

- **Coast-classic:** Zadar → Krka → Split = **2:12** driving.
- **+ Plitvice:** Zadar → Plitvice → Krka → Split = **6:33** → Plitvice costs **+4:21 driving** (plus ~4h visit) inside an already-tight 2.5-day window. Verdict needed from Session A: is it worth burning most of a day?
- **Mountains-first (sketch's northern loop):** Paklenica is cheap (0:54 from Zadar) — a Velebit hike day fits easily. Full inland routing via Knin = 3:40 vs 2:12 coast (+1:28, passes Zrmanja canyon area / Knin fortress).

### 2. Island block: Mljet vs Korčula vs both (after Jun 18 pickup)

- **Mljet day/overnight:** Dubrovnik → Prapratno 1:39 + ~45min ferry.
- **Korčula:** Dubrovnik → Orebić ~3:00 + 15–20min ferry — heavier; sketch loops around Vela Luka (far west tip = +1h on island).
- **Combo:** both share the Pelješac drive; Orebić ↔ Prapratno is only 1:24, so Korčula + Mljet as a 2-day Pelješac swing is plausible. Ferries/prices: Session E.
- **Zero-driving options:** Lokrum (10min boat from Dubrovnik old town), Elaphiti.

### 3. Bosnia: with or without Sarajevo

- Without: Mostar → Konjic → Tjentište direct = **4:02**.
- With: Mostar → Konjic → Sarajevo → Tjentište = **4:15**.
- **Sarajevo costs only ~13 minutes of extra driving** — the direct Konjic→Tjentište road is a slow mountain road anyway. The real cost is sightseeing time (half day+). This makes the sketch's Sarajevo loop very cheap to include. Session C: verify the Konjic→Tjentište road quality claim and assess Sarajevo as an overnight.

### 4. Montenegro: deep south (Bar/Ulcinj) vs straight to Budva

- Sketch route: Podgorica → Virpazar → Bar → Ulcinj → Budva = **3:10** driving.
- Short version: Podgorica → Virpazar → Sveti Stefan → Budva = **1:38**.
- Deep south costs **+~1.5–2h driving** plus visit time. What it buys: Stari Bar ruins, Ulcinj old town, Velika Plaža/Ada Bojana (kitesurfing!). Session D: is it worth a day?

## Rough totals

Core sketch route (no Plitvice, with Sarajevo, with deep south, islands excluded): ≈ **27h driving over 13 days** — very manageable (~2h/day average). Adding Plitvice (+4:21) and Korčula+Mljet (+~4h + ferries) pushes toward ~36h. Still feasible, but those are the three biggest line items to decide on.
