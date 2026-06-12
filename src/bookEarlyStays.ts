export interface BookEarlyStay {
  id: string;
  bestUse: string;
  why: string;
  urgency: string;
}

export const BOOK_EARLY_STAYS: BookEarlyStay[] = [
  {
    id: 'me-villa-jablan-winery-rvasi',
    bestUse: 'Skadar Lake flagship night',
    why:
      '300-year-old stone house inside Jablan Winery, with vineyard views, wine tasting, bikes, and the strongest review signal in the whole trip.',
    urgency: 'book now',
  },
  {
    id: 'ba-villa-cold-river-treehouse-bunica',
    bestUse: 'Mostar / Blagaj base',
    why:
      'Treehouse on the Bunica river with a private sand beach, kayak access, breakfast delivery, and real “special stay” character.',
    urgency: 'book early',
  },
  {
    id: 'hr-gem-peljesac-mlinica-watermill',
    bestUse: 'Pelješac splurge night',
    why:
      'Restored watermill cottage with jacuzzi and bay views near the Mljet ferry approach. One of the strongest “wow” stays on the Croatian coast.',
    urgency: 'book early',
  },
  {
    id: 'me-villa-above-the-lake-bobija',
    bestUse: 'Skadar Lake premium night',
    why:
      'Wooden cottage above the lake with sunsets, terrace space, kayaks, and the highest review score among the Skadar lake houses.',
    urgency: 'book early',
  },
  {
    id: 'me-villa-eternum-glamping-ninkovici',
    bestUse: 'Durmitor mountain night',
    why:
      'Luxury-touch glamping with open mountain views just outside Žabljak. The right blend of nature and comfort for the highland stay.',
    urgency: 'book early',
  },
];
