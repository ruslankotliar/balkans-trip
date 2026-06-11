/**
 * Offline ESSENTIALS content (feature B5) — bundled static data, curated from
 * research/contingency.md and research/trip-ops.md (and the hospital pins in
 * src/data/contingency-places.json). This file is compiled INTO the JS bundle,
 * so the PWA precaches it: the whole Essentials view works fully offline.
 *
 * Everything here is intentionally hardcoded text — DO NOT fetch it at runtime.
 * Keep it compact and genuinely useful: a car breaks down in Piva canyon with
 * no signal and someone needs the emergency numbers / "what do I do" sheet now.
 */

/** A phone/contact line. `tel` makes the number a one-tap `tel:` dial link. */
export interface ContactLine {
  label: string;
  /** Display value (may include notes); the dial link uses `tel` if present. */
  value: string;
  /** Diallable number (digits, +, no spaces) — renders a tel: link when set. */
  tel?: string;
}

export interface EmergencyCountry {
  code: string;
  name: string;
  lines: ContactLine[];
}

/**
 * 112 works in ALL THREE countries — free, any phone, even no-SIM. The single
 * most important fact, shown at the very top of the Emergency card.
 */
export const EMERGENCY_UNIVERSAL: ContactLine = {
  label: '112 — Emergency (police · ambulance · fire · rescue)',
  value: 'Works in HR, BA & ME — free, any phone, even no SIM / no credit',
  tel: '112',
};

export const EMERGENCY_BY_COUNTRY: EmergencyCountry[] = [
  {
    code: 'HR',
    name: 'Croatia',
    lines: [
      { label: 'Police', value: '192', tel: '192' },
      { label: 'Fire', value: '193', tel: '193' },
      { label: 'Ambulance', value: '194', tel: '194' },
      { label: 'Sea rescue', value: '195', tel: '195' },
      { label: 'HAK roadside', value: '1987 (abroad +385 1 1987)', tel: '1987' },
      { label: 'Mountain rescue (HGSS)', value: 'via 112', tel: '112' },
    ],
  },
  {
    code: 'BA',
    name: 'Bosnia & Herzegovina',
    lines: [
      { label: 'Police', value: '122', tel: '122' },
      { label: 'Fire', value: '123', tel: '123' },
      { label: 'Ambulance', value: '124', tel: '124' },
      { label: 'BIHAMK roadside', value: '1282 (abroad +387 33 282 100)', tel: '1282' },
      { label: 'Mountain rescue (GSS BiH)', value: '+387 63 11 22 33', tel: '+38763112233' },
    ],
  },
  {
    code: 'ME',
    name: 'Montenegro',
    lines: [
      { label: 'Police', value: '122', tel: '122' },
      { label: 'Fire', value: '123', tel: '123' },
      { label: 'Ambulance', value: '124', tel: '124' },
      { label: 'AMSCG roadside', value: '19807 (abroad +382 20 234 467)', tel: '19807' },
      { label: 'Mountain rescue (GSCG)', value: '+382 40 256 084', tel: '+38240256084' },
    ],
  },
];

/**
 * The two numbers you can't hardcode — write them off the rental contract and
 * insurance policy at pickup. Shown as fill-in prompts in the Emergency card.
 */
export const FILL_IN_CONTACTS: { label: string; hint: string }[] = [
  {
    label: 'Rental emergency line',
    hint: 'Write it off the contract at pickup — FIRST call for any car problem',
  },
  {
    label: 'Insurance 24h assistance',
    hint: 'Write it off your policy — for medical / accident claims',
  },
];

/** "If X happens → do Y → call Z" — the condensed contingency §1. */
export interface IfThen {
  icon: string;
  title: string;
  steps: string[];
}

export const IF_THEN: IfThen[] = [
  {
    icon: '🚗',
    title: 'Car breaks down (flat, won’t start, warning light)',
    steps: [
      'Get the car safe. Put the hi-vis vest on BEFORE exiting, set the warning triangle.',
      'Call the RENTAL emergency line first — they authorise the local fix & say what they reimburse.',
      'In parallel call the local auto club: ME AMSCG 19807 · BA BIHAMK 1282 · HR HAK 1987.',
      'Carry cash (EUR + Bosnian BAM): cross-border tows are slow, you often pay first and claim back.',
    ],
  },
  {
    icon: '💥',
    title: 'Car accident / collision',
    steps: [
      'Dial 112 for injuries. A police report is mandatory for any insurance claim — always get it.',
      'Photograph everything, exchange details, do NOT admit fault.',
      'Call the rental emergency line + your insurer’s 24h line.',
      'Don’t leave the country before the paperwork is done.',
    ],
  },
  {
    icon: '👮',
    title: 'Police stop / speeding fine (most likely in Montenegro)',
    steps: [
      'Pull over, headlights already on, stay in the car, hands visible, calm and polite.',
      'Have ready: licence, passport, rental papers. No officer should keep your passport.',
      'If you sped, accept the official fine — pay by card on their POS or at the post office (Pošta), get a receipt.',
      'Never offer a cash bribe. In Bosnia switch OFF any radar-detector app — they’re illegal there.',
    ],
  },
  {
    icon: '🩺',
    title: 'Medical emergency',
    steps: [
      'Dial 112 (or 124 ambulance). Tourist-area dispatchers usually speak English.',
      'BA & ME are non-EU — EHIC does NOT cover you. Be ready to pay (cash/card) and reclaim.',
      'Žabljak, Konjic, Budva, Mljet are clinic-only — the real hospitals are Nikšić, Mostar, Podgorica, Kotor (see Hospitals tab).',
    ],
  },
  {
    icon: '⛰️',
    title: 'Lost / injured in the mountains, no signal',
    steps: [
      'Signal dies in Sutjeska NP, Durmitor interior trails (Black Lake → Veliki Međed), Piva canyon.',
      'Any bars: 112, then GSS BiH +387 63 11 22 33 (Sutjeska) or GSCG +382 40 256 084 (Durmitor).',
      'Give your location two ways: GPS lat/long from your offline map AND your what3words address, plus the nearest named feature.',
      'Prevent it: tell someone your route + turnaround time, carry water/layers/headtorch.',
    ],
  },
  {
    icon: '🛂',
    title: 'Lost / stolen passport',
    steps: [
      'Police report (122/112) — you need it.',
      'Embassy: Bosnia → Sarajevo · Montenegro → Podgorica · Croatia → Zagreb (consulates Split/Dubrovnik).',
      'EU citizens: any EU embassy must help. Since Dec 2025 the EU Emergency Travel Document covers a trip home.',
      'An offline photo of every passport speeds replacement hugely — save one before you go.',
    ],
  },
  {
    icon: '🅿️',
    title: 'Parking ticket / car towed',
    steps: [
      'Worst tow spots: Dubrovnik Old Town ZTL (€150), Kotor (Pauk), Budva (gone in 15 min, €160+), Mostar.',
      'Always use signed paid lots and walk into old towns (see Borders & driving tab).',
      'If towed: the paid lot or police (122) tells you the pound — bring cash.',
    ],
  },
];

/** Border + car + police quick tips — condensed contingency §2 & §4. */
export interface TipSection {
  title: string;
  tips: string[];
  /** Optional quick-links rendered as chips after the tip list. */
  links?: { label: string; url: string }[];
}

export const QUICK_TIPS: TipSection[] = [
  {
    title: '⚡ Book before Jun 16 (urgent)',
    tips: [
      'CALL Sicily By Car (+385 23 646 547) — confirm BiH + ME cross-border permission + written letter. Ref: D013947246.',
      'BOOK Tara rafting Jun 23 — office@raftingtara.com or +381 64 420 1956 (Drina-Tara, €60pp) OR info@tarasportrafting.com / +387 66 606 306 (TaraSport, €50pp). 4 adults, Jun 23, Brštanovica→Šćepan Polje.',
      'CALL Sutjeska NP for Perućica guided forest slot Jun 23 — +387 58 233130 or office@sutjeskanp.com. 16 people/day quota; 4-person min. If unavailable, do monument + Dragoš Sedlo viewpoint instead (~2h). No walk-ins.',
      'BOOK Biokovo Skywalk Jun 18 morning slot — shop.pp-biokovo.hr. 20-car/hour cap, sells out. 4 × €15 = €60.',
      'BOOK Camp Lisičina Omiš (Jun 17) — kamp-lisicina@inet.hr. Croatian peak season, fills fast.',
      'BOOK Camping Kate Mlini (Jun 18–19) — info@campingkate.com. ~€51/night for 4 + tent, 10 min from DBV airport.',
      'BOOK Autokamp Marina (Ropa, Mljet, Jun 20) — +385 20 745 071 or mob +385 98 915 56 76. Only ~10 pitches, fills on June Saturdays. NP side of the island.',
      'Book Cetina Extreme Canyoning Jun 17 (1–2 days ahead) — canyoning-cetina.com (~€70pp) or maldukadventures.com.',
      'CHECK Kotor cruise schedule for Jun 27 at cruisetimetables.com — verify the "1 ship / 170 pax" figure is still accurate; if more ships added, plan fortress climb before 08:00.',
      'MLJET ferry (Jun 20 Saturday): queue Prapratno 90+ min before your chosen sailing. Car spaces first-come; missing the ferry = 3h wait or foot-passenger only.',
      'CALL Konoba Feral Brijesta on Jun 16–17 for Jun 18 lunch (+385 98 924 6025) — family-run on south Pelješac, limited seating, phone-only reservation.',
    ],
    links: [
      { label: 'Biokovo Skywalk booking', url: 'https://shop.pp-biokovo.hr' },
      { label: 'Rafting Centar Drina-Tara', url: 'https://raftingtara.com' },
      { label: 'Cetina canyoning', url: 'https://canyoning-cetina.com' },
    ],
  },
  {
    title: 'Borders (HR→BA, BA→ME, ME→HR)',
    tips: [
      'Carry passports (EU ID cards NOT accepted for BA/ME), licence, original vehicle registration, rental agreement w/ cross-border auth, green card.',
      'Make sure HR + BA + ME are written on the contract — crossing into a non-listed country voids your insurance.',
      'Guards mostly just check passports — but make sure you get entry/exit stamps.',
      'ME→HR on Jun 27: use VITALJINA/Karasovići (15 km south of Kotor toward Herceg Novi) — 15–45 min. Do NOT use Debeli Brijeg (1–4 h EES biometric queues). If Vitaljina is closed, fall back to Debeli Brijeg before 08:00 or after 21:00.',
    ],
    links: [
      { label: 'Live ME border cams', url: 'https://kamere.mup.gov.me' },
      { label: 'nakordoni.eu wait times', url: 'https://www.nakordoni.eu/en/montenegro' },
    ],
  },
  {
    title: 'Driving rules that catch tourists',
    tips: [
      'Keep LOW-BEAM headlights ON the whole trip — mandatory daytime in BA & ME (€30 fine in ME), harmless in HR.',
      'One sober driver, always. Treat Montenegro as zero-tolerance (0.2–0.3‰); BA 0.3‰, HR 0.5‰.',
      'No mountain roads at night: Piva canyon tunnels, Durmitor ring, Sutjeska, Kotor serpentines — daylight only.',
      'Must be in the car: warning triangle, hi-vis vest (keep in cabin!), first-aid kit, spare bulbs. The police fine YOU, not the rental.',
      'Let tailgaters pass; don’t overtake on blind curves. Watch for livestock and rockfall on mountain roads.',
    ],
  },
  {
    title: 'Fuel & tunnels',
    tips: [
      'Fill up in BOSNIA whenever below half — reliably the cheapest of the three. HR is dearest.',
      'Top up before remote stretches: Foča before Sutjeska/Šćepan Polje; Plužine before the Durmitor Ring.',
      'Piva canyon: ~56–70 unlit single-lane tunnels over ~25 km — go slow, yield early, allow 40–60 min.',
    ],
  },
  {
    title: 'At rental pickup (Zadar)',
    tips: [
      'Timestamped walk-around video: all glass, four rims, fuel gauge, AND the front/rear undercarriage (the documented fake-damage spot).',
      'Confirm HR+BA+ME on the contract + green card + cross-border letter in hand; get the cross-border fee in writing.',
      'Photograph the contract’s emergency/breakdown number → save it in your phone (and in the Emergency card above).',
    ],
  },
  {
    title: 'Theft & scams (low-risk route — these habits cover ~95%)',
    tips: [
      'Pack the car to look empty; passports/phones/laptops/cash/keys on your person, NEVER in the car.',
      'Taxis: insist on the meter or use Bolt/Uber. Unlicensed cabs at ferries/bus stations quote insane fares.',
      'ATMs: use bank-branded machines, decline "charge in home currency" (DCC) — always pick local currency.',
      'Bar/club traps in Budva, Split, Mostar: get pricing in writing before entering, card-only, watch your drink, leave together.',
    ],
  },
  {
    title: 'Phone & SIM (activate before departure)',
    tips: [
      'Drei users: activate "Go" Balkan pack (€5/1 GB/15 days) — default rate is €15/MB, catastrophic.',
      'A1 users: activate "A1 Roaming Datenwoche" (~€4.90/2 GB/7 days) via the A1 app.',
      'Magenta users: activate "Travel & Surf Balkan" pass — check price at magenta.at.',
      'Best value as hotspot SIM: BiH → BH Telecom Ultra Tourist 1 (€10/15 GB/10 days); ME → m:tel Turist 15 (€15/500 GB/15 days). Buy at any Telecom or m:tel shop.',
      'Download offline maps BEFORE leaving (Google Maps + OsmAnd for BiH & ME). No roaming on Durmitor trails or Piva canyon.',
    ],
  },
  {
    title: 'Cash & ATMs',
    tips: [
      'Bosnia uses KM (BAM) — €1 = 1.955 KM (fixed peg). Montenegro uses EUR. Croatia uses EUR.',
      'BiH best ATMs: Raiffeisen Bank and MF Bank — no fee. Avoid UniCredit (high fee). Withdraw in EUR at some Sarajevo ATMs if you prefer.',
      'ME best ATMs: Ziraat Bank — no fee. Always choose "local currency" — never "home currency" (DCC rip-off).',
      'Studenac Trebinje is CASH ONLY. Many rural campsites, konobas, and small operators are cash-only too. Keep €100–150 in small bills at all times.',
      'Tara rafting operators may require advance bank transfer — confirm when booking.',
    ],
  },
];

/**
 * Nearest hospital / pharmacy per overnight zone — curated from
 * contingency.md §3 and the contingency-places pins. `pinId` matches an id in
 * src/data/contingency-places.json so the UI can offer "show on map".
 */
export interface HospitalZone {
  zone: string;
  hospital: string;
  where: string;
  pharmacy: string;
  /** id of the matching pin in contingency-places.json (for "show on map"). */
  pinId?: string;
  /** Diallable hospital/emergency number, if known. */
  tel?: string;
}

export const HOSPITAL_ZONES: HospitalZone[] = [
  {
    zone: 'Zadar (Jun 16)',
    hospital: 'Opća bolnica Zadar — 24h ER',
    where: 'Bože Peričića 5, central Zadar',
    pharmacy: 'City ljekarne + hospital pharmacy',
    pinId: 'hr-er-zadar',
  },
  {
    zone: 'Omiš / Makarska (Jun 17)',
    hospital: 'KBC Split (Firule) — real ER, ~45 min N (Riviera has clinics only)',
    where: 'Spinčićeva, Firule, Split',
    pharmacy: 'Town pharmacies; KBC Split 24h',
    pinId: 'hr-er-split',
  },
  {
    zone: 'Krka / Skradin (if visited)',
    hospital: 'Opća bolnica Šibenik',
    where: 'Stjepana Radića 83, Šibenik',
    pharmacy: 'Town pharmacies',
    pinId: 'hr-er-sibenik',
  },
  {
    zone: 'Mljet island (Jun 20)',
    hospital: 'No hospital on island — Dubrovnik General (Opća bolnica Dubrovnik) nearest, ~70 km via ferry + drive ~2h. Clinic only at Babino Polje.',
    where: 'Leave on first ferry, drive to Dubrovnik Lapad',
    pharmacy: 'No 24h pharmacy on island — carry your own kit',
  },
  {
    zone: 'Dubrovnik (Jun 18–19)',
    hospital: 'Opća bolnica Dubrovnik — 24/7 ER',
    where: 'Lapad (Roka Mišetića / A. Šercera)',
    pharmacy: 'Two 24h pharmacies alternate weekly (Old Town "kod Zvonika" / Gruž)',
    pinId: 'hr-er-dubrovnik',
  },
  {
    zone: '↳ if sleeping Trebinje (BA)',
    hospital: 'JZU Bolnica Trebinje (~30 min from Dubrovnik)',
    where: 'Dr Levija 2, Trebinje',
    pharmacy: 'Town pharmacies',
    pinId: 'ba-er-trebinje',
  },
  {
    zone: 'Mostar (Jun 21)',
    hospital: 'SKB Mostar — region’s largest, 24h ER',
    where: 'Bijeli Brijeg · +387 36 336 000',
    pharmacy: '24h pharmacies in Mostar',
    pinId: 'ba-er-mostar',
    tel: '+38736336000',
  },
  {
    zone: 'Konjic / Boračko day-stop (Jun 22)',
    hospital: 'Clinic only — real hospital = Mostar (~35 min) or Sarajevo (~1h)',
    where: 'Konjic town',
    pharmacy: 'Town pharmacies',
    pinId: 'ba-er-mostar',
  },
  {
    zone: 'Sarajevo (Jun 22 overnight)',
    hospital: 'KCUS Klinički centar Sarajevo — main BA tertiary, 24h ER',
    where: 'Bolnička 25, Sarajevo · +387 33 297 000',
    pharmacy: '24h pharmacies across the city',
    pinId: 'ba-er-sarajevo',
    tel: '+38733297000',
  },
  {
    zone: 'Žabljak / Durmitor (Jun 23–24)',
    hospital: 'Žabljak health station (very limited, 2 doctors). Real hospital = Nikšić, ~45 km / 1h25',
    where: 'Jakova Ostojića bb, Žabljak · +382 67 613 158',
    pharmacy: 'Small town pharmacy — carry your own kit',
    pinId: 'me-er-zabljak',
    tel: '+38267613158',
  },
  {
    zone: '↳ Nikšić (Durmitor evac)',
    hospital: 'Opšta bolnica Nikšić — nearest real ER/surgery for Durmitor/Piva',
    where: 'Vuka Mićunovića, Nikšić',
    pharmacy: 'Town pharmacies',
    pinId: 'me-er-niksic',
  },
  {
    zone: '↳ if visiting Sutjeska (BA)',
    hospital: 'No facility in the park → nearest = Foča (~20 km)',
    where: 'Foča town',
    pharmacy: 'Remote — bring a kit',
  },
  {
    zone: 'Skadar / Podgorica / Virpazar (Jun 25–26)',
    hospital: 'Klinički centar Crne Gore (KCCG) — ME’s main tertiary hospital',
    where: 'Ljubljanska bb, Podgorica · +382 20 412 412',
    pharmacy: '24h pharmacies in Podgorica',
    pinId: 'me-er-podgorica',
    tel: '+38220412412',
  },
  {
    zone: 'Budva (Jun 26)',
    hospital: 'Health Care Centre Budva (clinic). Serious → Kotor or Podgorica',
    where: 'Popa Jola Zeca, Budva · +382 33 427 200',
    pharmacy: 'Town pharmacies',
    pinId: 'me-er-kotor',
  },
  {
    zone: 'Kotor (Jun 27)',
    hospital: 'Opšta bolnica Kotor — regional hospital, signed foreigner/tourist entrance',
    where: 'Škaljari, Kotor · +382 32 325 602',
    pharmacy: 'Town pharmacies',
    pinId: 'me-er-kotor',
    tel: '+38232325602',
  },
];

/**
 * Packing checklist — curated from trip-ops.md §4. Grouped; a static list (the
 * brief notes a checkable list is optional — this stays simple and offline).
 */
export interface PackGroup {
  title: string;
  items: string[];
}

export const PACKING: PackGroup[] = [
  {
    title: 'Documents, car & borders',
    items: [
      'Passports ×4 (required for BA & ME — ID cards not accepted)',
      'Green Card listing BIH + MNE (confirm at pickup)',
      'Rental agreement permitting cross-border BA + ME',
      'Driving licences (EU fine, no IDP needed)',
      'Travel insurance covering BA + ME and the activities (rafting/canyoning/cliff-jumping/high hiking)',
      'In-car legal kit: hi-vis vest per person, warning triangle, first-aid kit, spare bulbs',
      'Cash: EUR (HR & ME) + ~€50–100 of Bosnian marks (BAM/KM)',
    ],
  },
  {
    title: 'Power & navigation',
    items: [
      'Multi-port USB-C car charger (×2 ideal) + long cables + phone mount',
      'Power bank 20,000 mAh+ (one per pair) for camp nights',
      'Offline maps downloaded: Google Maps regions + Organic Maps / Mapy.cz',
      'Regional Balkans eSIM (BA & ME are NOT in EU free-roaming)',
    ],
  },
  {
    title: 'Camping at altitude',
    items: [
      'Warm 3-season sleeping bags (+ liner) — the key Durmitor item',
      'Insulated sleeping pads (good R-value)',
      'Warm layers: fleece/down, beanie, warm socks, long trousers',
      'Stove gas canisters — BUY in Zadar day 1 (can’t fly with them)',
      'Good tent pegs + guylines for exposed alpine pitches',
    ],
  },
  {
    title: 'Beach & water',
    items: [
      'Water/aqua shoes ×4 (rocky entries, sea urchins, river rocks)',
      'Quick-dry towels, swimwear, dry bag for rafting/boat days',
      'Snorkel/mask (optional — clear water)',
    ],
  },
  {
    title: 'Sun, heat & hiking',
    items: [
      'High-SPF sunscreen, sun hat, sunglasses, lightweight long sleeves',
      'Refillable water bottles (1.5–2 L pp on hike days) + electrolyte tabs',
      'Proper boots / trail shoes, daypack, trekking poles (Durmitor scree)',
      'Headlamp with red mode (dawn hikes, camp, stargazing) + spare batteries',
      'Packable rain shell (Bosnia/Durmitor afternoon storms)',
    ],
  },
  {
    title: 'Bugs, health & commonly-forgotten',
    items: [
      'Strong repellent (DEET/picaridin) — Skadar at dusk is the worst',
      'First-aid + blister plasters, antihistamine, tick tool + tweezers, personal meds',
      'Universal sink plug, duct tape, laundry soap + pins, reusable shopping bag, cooler bag',
      'Paper backup of all bookings + rental/green-card docs',
    ],
  },
];

/**
 * Survival phrases — a compact HR / BA-SR / ME set. One Latin-script phrase
 * covers all three (mutually intelligible); the small differences worth noting
 * are flagged. PRONUNCIATION: c=ts · č/ć=ch · š=sh · ž=zh · j=y · lj=lly.
 */
export interface Phrase {
  en: string;
  /** The phrase (one form covers all three unless `variants` is given). */
  hr: string;
  /** Rough pronunciation for an English speaker. */
  say?: string;
  /** Regional variant note, e.g. "BA/ME: apoteka". */
  variant?: string;
}

export interface PhraseGroup {
  title: string;
  phrases: Phrase[];
}

export const PHRASES: PhraseGroup[] = [
  {
    title: 'Basics',
    phrases: [
      { en: 'Hello', hr: 'Dobar dan', say: 'DO-bar dahn' },
      { en: 'Hi (casual)', hr: 'Bok / Zdravo', say: 'bohk / ZDRAH-vo', variant: 'Bok = HR · Zdravo = BA/ME' },
      { en: 'Thank you', hr: 'Hvala', say: 'HVAH-lah' },
      { en: 'Please / You’re welcome', hr: 'Molim', say: 'MO-leem' },
      { en: 'Yes / No', hr: 'Da / Ne', say: 'dah / neh' },
      { en: 'Excuse me / Sorry', hr: 'Oprostite / Izvinite', say: 'o-PRO-stee-teh', variant: 'Oprostite = HR · Izvinite = BA/ME' },
      { en: 'Do you speak English?', hr: 'Govorite li engleski?', say: 'go-VO-ree-teh lee EN-gleh-skee' },
      { en: 'I don’t understand', hr: 'Ne razumijem', say: 'neh rah-ZOO-mee-yem' },
    ],
  },
  {
    title: 'Emergency',
    phrases: [
      { en: 'Help!', hr: 'Upomoć!', say: 'oo-PO-moch' },
      { en: 'Call an ambulance!', hr: 'Zovite hitnu pomoć!', say: 'ZO-vee-teh HEET-noo PO-moch' },
      { en: 'Call the police!', hr: 'Zovite policiju!', say: 'ZO-vee-teh po-LEE-tsee-yoo' },
      { en: 'Call mountain rescue!', hr: 'Zovite gorsku spasilačku službu!' },
      { en: 'I need a doctor', hr: 'Trebam liječnika', say: 'TREH-bam lee-YECH-nee-kah', variant: 'BA/ME: Treba mi doktor' },
      { en: 'There’s been an accident', hr: 'Dogodila se nesreća', say: 'do-GO-dee-lah seh NES-reh-cha' },
      { en: 'He/She is injured', hr: 'On/Ona je ozlijeđen/a', variant: 'BA/ME: povrijeđen/a' },
      { en: 'This is a rental car', hr: 'Ovo je iznajmljeni auto', say: 'O-vo yeh eez-NIGH-mleh-nee OW-to' },
    ],
  },
  {
    title: 'Where is…?',
    phrases: [
      { en: 'Where is…?', hr: 'Gdje je…?', say: 'g-dyeh yeh' },
      { en: 'Where is the hospital?', hr: 'Gdje je bolnica?', say: 'g-dyeh yeh BOL-nee-tsah' },
      { en: 'Where is a pharmacy?', hr: 'Gdje je ljekarna?', say: 'g-dyeh yeh lyeh-KAR-nah', variant: 'BA/ME: apoteka' },
      { en: 'Where is the toilet?', hr: 'Gdje je toalet?', say: 'g-dyeh yeh TWAH-let' },
      { en: 'Where is a petrol station?', hr: 'Gdje je benzinska postaja?', variant: 'BA/ME: benzinska pumpa' },
    ],
  },
  {
    title: 'Out & about',
    phrases: [
      { en: 'How much (is it)?', hr: 'Koliko košta?', say: 'KO-lee-ko KOSH-tah' },
      { en: 'Water (still / sparkling)', hr: 'Voda (negazirana / gazirana)', say: 'VO-dah' },
      { en: 'A table for 4, please', hr: 'Stol za četvero, molim', say: 'stohl zah CHET-veh-ro', variant: 'BA/ME: Sto za četvoro' },
      { en: 'Fill up the tank, please', hr: 'Pun rezervoar, molim', say: 'poon reh-zer-VWAR', variant: 'HR also: Do vrha, molim' },
      { en: 'The bill, please', hr: 'Račun, molim', say: 'RAH-choon MO-leem' },
      { en: 'Card / Cash', hr: 'Kartica / Gotovina', say: 'KAR-tee-tsah / go-to-VEE-nah' },
    ],
  },
  {
    title: 'Numbers 1–10',
    phrases: [
      { en: '1', hr: 'jedan', say: 'YEH-dahn' },
      { en: '2', hr: 'dva', say: 'dvah' },
      { en: '3', hr: 'tri', say: 'tree' },
      { en: '4', hr: 'četiri', say: 'CHEH-tee-ree' },
      { en: '5', hr: 'pet', say: 'pet' },
      { en: '6', hr: 'šest', say: 'shest' },
      { en: '7', hr: 'sedam', say: 'SEH-dahm' },
      { en: '8', hr: 'osam', say: 'O-sahm' },
      { en: '9', hr: 'devet', say: 'DEH-vet' },
      { en: '10', hr: 'deset', say: 'DEH-set' },
    ],
  },
];
