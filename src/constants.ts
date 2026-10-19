import type { Category, Country, LegMode, Status } from './types';

export const COUNTRY_NAMES: Record<Country, string> = {
  HR: 'Croatia',
  BA: 'Bosnia',
  ME: 'Montenegro',
  IT: 'Italy',
  AL: 'Albania',
  TH: 'Thailand',
  MY: 'Malaysia',
  SG: 'Singapore',
  VN: 'Vietnam',
  KH: 'Cambodia',
};

/** IANA time zone per country: sunrise/sunset show in the place's own clock. */
export const COUNTRY_ZONES: Record<Country, string> = {
  HR: 'Europe/Zagreb',
  BA: 'Europe/Sarajevo',
  ME: 'Europe/Podgorica',
  IT: 'Europe/Rome',
  AL: 'Europe/Tirane',
  TH: 'Asia/Bangkok',
  MY: 'Asia/Kuala_Lumpur',
  SG: 'Asia/Singapore',
  VN: 'Asia/Ho_Chi_Minh',
  KH: 'Asia/Phnom_Penh',
};

export const STATUSES: Status[] = ['candidate', 'shortlist', 'extra', 'backup', 'rejected'];

export const LEG_MODES: LegMode[] = ['walk', 'boat', 'flight', 'taxi', 'scooter', 'bus', 'train'];

// ---- Category groups ----
// The 12 fine-grained categories are kept on each place, but for filtering and
// map color we roll them into a handful of decision-buckets that match how the
// group actually chooses on the ground ("where do we eat / swim / go active…").
export type Group = 'eat' | 'nightlife' | 'swim' | 'active' | 'see' | 'sleep' | 'logistics';

export const GROUP_OF: Record<Category, Group> = {
  food: 'eat',
  nightlife: 'nightlife',
  beach: 'swim',
  hike: 'active',
  activity: 'active',
  sight: 'see',
  viewpoint: 'see',
  nature: 'see',
  town: 'see',
  campsite: 'sleep',
  accommodation: 'sleep',
  other: 'logistics',
};

export const GROUP_META: Record<Group, { label: string; icon: string; color: string }> = {
  eat: { label: 'Eat', icon: '🍴', color: '#d35400' },
  nightlife: { label: 'Nightlife', icon: '🍸', color: '#ff5dae' },
  swim: { label: 'Swim', icon: '🏖', color: '#13b6c9' },
  active: { label: 'Active', icon: '🥾', color: '#27ae60' },
  see: { label: 'See', icon: '📷', color: '#9b59b6' },
  sleep: { label: 'Sleep', icon: '⛺', color: '#2980b9' },
  logistics: { label: 'Logistics', icon: '🚗', color: '#7f8c8d' },
};

export const GROUPS = Object.keys(GROUP_META) as Group[];

export const CATEGORIES = Object.keys(GROUP_OF) as Category[];
export const COUNTRIES = Object.keys(COUNTRY_NAMES) as Country[];

// Each place's pin/dot color is its group's color — 7 readable colors instead
// of 12 near-identical ones.
export const CATEGORY_COLORS: Record<Category, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c, GROUP_META[GROUP_OF[c]].color]),
) as Record<Category, string>;

export function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
