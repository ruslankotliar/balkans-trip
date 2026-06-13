/**
 * Source-link UX: classify each `sources` URL by domain so places expose
 * their MOST USEFUL links (book the stay, read campsite reviews, grab the
 * GPX) instead of anonymous [1][2] footnotes. Google Maps is a small
 * secondary "Navigate" affordance, never the main one.
 */

export type LinkKind = 'booking' | 'campsite' | 'trail' | 'reports' | 'other';

export interface SourceLink {
  url: string;
  label: string;
  kind: LinkKind;
  /** Booking-type links (Airbnb / campsite portals) can be promoted to the primary button. */
  booking: boolean;
}

interface Rule {
  /** Substrings matched against the hostname (www. stripped, lowercased). */
  match: string[];
  label: string | ((host: string) => string);
  kind: LinkKind;
}

const RULES: Rule[] = [
  { match: ['airbnb.'], label: 'Open on Airbnb', kind: 'booking' },
  { match: ['booking.com'], label: 'Open on Booking.com', kind: 'booking' },
  {
    match: ['park4night', 'campercontact', 'camping.info', 'pitchup'],
    label: 'Campsite reviews',
    kind: 'campsite',
  },
  {
    match: ['outdooractive', 'alltrails', 'komoot', 'wikiloc', 'summitpost'],
    label: 'Trail guide / GPX',
    kind: 'trail',
  },
  { match: ['reddit.', 'tripadvisor', 'forum'], label: 'Traveler reports', kind: 'reports' },
];

const KIND_ORDER: Record<LinkKind, number> = {
  booking: 0,
  campsite: 1,
  trail: 2,
  reports: 3,
  other: 4,
};

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

export function classifySource(url: string): SourceLink | null {
  const host = hostOf(url);
  if (!host) return null;
  for (const r of RULES) {
    if (r.match.some((m) => host.includes(m))) {
      const label = typeof r.label === 'function' ? r.label(host) : r.label;
      return { url, label, kind: r.kind, booking: r.kind === 'booking' || r.kind === 'campsite' };
    }
  }
  // Fallback: the site's hostname is more useful than a bare [n].
  return { url, label: host, kind: 'other', booking: false };
}

/**
 * Labeled links for a place's sources: deduped by URL, booking-type first,
 * repeated labels numbered ("Traveler reports 2") so each chip stays unique.
 */
export function deriveLinks(sources?: string[]): SourceLink[] {
  if (!sources || sources.length === 0) return [];
  const seen = new Set<string>();
  const links: SourceLink[] = [];
  for (const s of sources) {
    const l = classifySource(s);
    if (!l || seen.has(l.url)) continue;
    seen.add(l.url);
    links.push(l);
  }
  // Stable sort: booking → campsite → trail → reports → other.
  const sorted = links
    .map((l, i) => ({ l, i }))
    .sort((a, b) => KIND_ORDER[a.l.kind] - KIND_ORDER[b.l.kind] || a.i - b.i)
    .map((x) => x.l);
  // Number duplicate labels.
  const counts = new Map<string, number>();
  for (const l of sorted) counts.set(l.label, (counts.get(l.label) ?? 0) + 1);
  const used = new Map<string, number>();
  return sorted.map((l) => {
    if ((counts.get(l.label) ?? 0) <= 1) return l;
    const n = (used.get(l.label) ?? 0) + 1;
    used.set(l.label, n);
    return n === 1 ? l : { ...l, label: `${l.label} ${n}` };
  });
}

/**
 * The primary "Book / View listing" link.
 * Prefer campsite-review / campsite-portal links over Airbnb/Booking.com so camping
 * stays surface the most useful action first.
 */
export function bookingLink(links: SourceLink[]): SourceLink | undefined {
  return links.find((l) => l.kind === 'campsite') ?? links.find((l) => l.kind === 'booking');
}

/** Convenience: booking link straight from a place's sources. */
export function bookingFor(sources?: string[]): SourceLink | undefined {
  return bookingLink(deriveLinks(sources));
}

/** Google Maps — demoted to a small secondary "Navigate" link. */
export function navUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
