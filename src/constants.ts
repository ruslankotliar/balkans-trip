import type { Category, Country, Status } from './types';

export const COUNTRY_NAMES: Record<Country, string> = {
  HR: 'Croatia',
  BA: 'Bosnia',
  ME: 'Montenegro',
};

export const STATUSES: Status[] = ['candidate', 'shortlist', 'backup', 'rejected'];

export const CATEGORY_COLORS: Record<Category, string> = {
  town: '#9b59b6',
  sight: '#e67e22',
  viewpoint: '#f1c40f',
  beach: '#1abc9c',
  hike: '#27ae60',
  activity: '#e74c3c',
  campsite: '#2980b9',
  accommodation: '#34495e',
  food: '#d35400',
  nightlife: '#ff5dae',
  nature: '#16a085',
  other: '#7f8c8d',
};

export const CATEGORIES = Object.keys(CATEGORY_COLORS) as Category[];
export const COUNTRIES = Object.keys(COUNTRY_NAMES) as Country[];

export function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
