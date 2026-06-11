export type Country = 'HR' | 'BA' | 'ME';

export type Category =
  | 'town'
  | 'sight'
  | 'viewpoint'
  | 'beach'
  | 'hike'
  | 'activity'
  | 'campsite'
  | 'accommodation'
  | 'food'
  | 'nightlife'
  | 'nature'
  | 'other';

export type Status = 'candidate' | 'shortlist' | 'backup' | 'rejected';

export interface Place {
  id: string;
  name: string;
  country: Country;
  category: Category;
  lat: number;
  lng: number;
  /** What it is and why it's worth going. */
  description: string;
  /** What real people (Reddit, forums, park4night reviews) say — quotes welcome. */
  communityNotes?: string;
  /** URLs of the threads/reviews the notes came from. */
  sources?: string[];
  /** e.g. "€10 entry", "~€25/night for 4 + tent + car" */
  cost?: string;
  /** e.g. "2h", "half day", "full day" */
  timeNeeded?: string;
  /** e.g. "sunrise", "go before 9am to beat crowds" */
  bestTime?: string;
  /** Campsites: showers, power, shade, beach access, etc. */
  facilities?: string;
  tags?: string[];
  /** 1–5: how strong/consistent the community feedback is. */
  rating?: number;
  status: Status;
  /** True for places the user added at runtime (live in localStorage userPlaces, editable/deletable). */
  userAdded?: boolean;
  /** Origin of the place: 'user' for runtime-added pins, otherwise the baked bundle. */
  source?: 'user';
}
