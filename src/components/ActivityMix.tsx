import type { PlaceWithOverride } from '../store';
import { DAYS } from '../trip';

// ── Big-highlight classifier ──
// Only the MAJOR highlights worth balancing across days — the booked / time /
// money / effort ones. Quick/free/ambient things (eating, swimming, cliff-
// jumping, snorkeling, viewpoints, town/sightseeing, plain nature, scenic
// drives) are intentionally NOT tracked. Gated by CATEGORY (so a drive/dam/
// viewpoint named "...Canyon..." isn't counted) and matched on the NAME only.
export function activityType(p: PlaceWithOverride): string | null {
  if (p.category === 'nightlife') return 'nightlife';
  if (p.category === 'hike') return 'hiking';
  const n = p.name.toLowerCase();
  // A national park (Krka, Mljet NP, Plitvice…) is a marquee half-day destination,
  // not ambient "nature" — count it as a highlight regardless of its category.
  if (/national park|nacionalni park/.test(n)) return 'national park';
  if (p.category === 'food') {
    if (/\bwine\b|vinarij|winery|vineyard/.test(n)) return 'wine tasting';
    if (/peka|cooking class|cook[ -]your[ -]own/.test(n)) return 'cooking';
    return null;
  }
  if (p.category !== 'activity') return null;
  if (/raft/.test(n)) return 'rafting';
  if (/ferrata|rock.?climb|\bclimbing\b/.test(n)) return 'climbing';
  if (/kayak|canoe/.test(n)) return 'kayaking';
  if (/\bsup\b|paddle.?board|stand.?up.?paddle/.test(n)) return 'SUP';
  if (/scuba|diving|dive cent/.test(n)) return 'diving';
  if (/zip.?line/.test(n)) return 'zipline';
  if (/paraglid/.test(n)) return 'paragliding';
  if (/skydiv/.test(n)) return 'skydiving';
  if (/\batv\b|buggy|quad|dirt.?bike/.test(n)) return 'ATV/buggy';
  if (/e-?bike|cycling|\bbike\b/.test(n)) return 'e-bike';
  if (/speedboat|motorboat|boat tour|boat trip|boat rental|boat hire|blue cave|\bcruise\b|\byacht\b/.test(n)) return 'boat';
  if (/fishing|charter/.test(n)) return 'fishing';
  if (/\bwine\b|vinarij|winery/.test(n)) return 'wine tasting';
  if (/canyon/.test(n)) return 'canyoning';
  return null;
}

interface Props {
  places: PlaceWithOverride[];
  /** Jump to a day (switches to the Plan view + selects that day). */
  onPickDay: (day: number) => void;
}

/** Trip-wide mix of the BIG highlights over the committed (day-assigned) plan. */
export default function ActivityMix({ places, onPickDay }: Props) {
  const byType = new Map<string, { count: number; days: Set<number> }>();
  const dayHasStops = new Set<number>();
  const dayHasHighlight = new Set<number>();
  for (const p of places) {
    // Committed = anything with a day that isn't an extra area-option or rejected.
    if (!p.day || p.status === 'extra' || p.status === 'rejected') continue;
    dayHasStops.add(p.day);
    const t = activityType(p);
    if (!t) continue;
    dayHasHighlight.add(p.day);
    const e = byType.get(t) ?? { count: 0, days: new Set<number>() };
    e.count += 1;
    e.days.add(p.day);
    byType.set(t, e);
  }
  const mix = [...byType.entries()]
    .map(([type, e]) => {
      const days = [...e.days].sort((a, b) => a - b);
      return { type, count: e.count, days, adjacent: days.some((d, i) => i > 0 && d - days[i - 1] === 1) };
    })
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  // THE top goal: every day with stops should have at least one big highlight.
  const emptyDays = DAYS.filter((d) => dayHasStops.has(d) && !dayHasHighlight.has(d));

  if (mix.length === 0) {
    return <div className="mixview"><p className="itin-empty">No big highlights committed yet.</p></div>;
  }

  return (
    <div className="mixview">
      <p className="mixview-sub">
        The goal: <strong>at least one big highlight every day</strong>. Two on one day is fine — if they clash on
        time you'll pick one; if not, you can do both. The only thing to avoid is the <em>same</em> activity on
        back-to-back days. Quick/free things (eating, swims, cliff jumps, viewpoints) aren't counted.
      </p>
      {emptyDays.length > 0 ? (
        <div className="mixview-empty-warn">
          ⚠ Days with no big highlight yet — give each one something:{' '}
          {emptyDays.map((dd) => (
            <button key={dd} type="button" className="itin-mix-day" onClick={() => onPickDay(dd)}>
              {dd}
            </button>
          ))}
        </div>
      ) : (
        <div className="mixview-ok">✓ All {dayHasStops.size} planned days have at least one big highlight.</div>
      )}
      <ul className="itin-mix-list">
        {mix.map((m) => (
          <li key={m.type} className={m.adjacent ? 'adjacent' : ''}>
            <span className="itin-mix-type">{m.type}</span>
            <span className="itin-mix-count">×{m.count}</span>
            <span className="itin-mix-days">
              {m.days.map((dd) => (
                <button key={dd} type="button" className="itin-mix-day" onClick={() => onPickDay(dd)} title={`Open day ${dd}`}>
                  {dd}
                </button>
              ))}
            </span>
            {m.adjacent && (
              <span className="itin-mix-warn" title="Scheduled on back-to-back days">
                ⚠ back-to-back
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
