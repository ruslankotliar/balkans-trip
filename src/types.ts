export type Country = 'HR' | 'BA' | 'ME' | 'IT';

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

// candidate = undecided · shortlist = in the plan · extra = situational
// "while you're in the area" pick (food/bars/beaches/swims/views), never
// auto-scheduled · backup = contingency fallback (campsites/sleeps) · rejected = no.
export type Status = 'candidate' | 'shortlist' | 'extra' | 'backup' | 'rejected';

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
  /**
   * Groups this place with others as alternatives for the same plan slot.
   * Consecutive stops with the same optionGroup collapse into one swipeable card.
   * e.g. "d1-coffee", "d3-hike", "varenna-parking"
   */
  optionGroup?: string;
  /** Short label shown on the tab button (defaults to truncated place name). */
  optionTabLabel?: string;
}
