import { formatClock, type DaySchedule } from '../schedule';
import type { PlaceWithOverride } from '../store';
import { DAYS, dayColor, dayDateLabel, formatDuration } from '../trip';
import { activityType } from './ActivityMix';

interface Props {
  places: PlaceWithOverride[];
  /** Day clock per day (drive time + fit verdict), from the committed route. */
  scheduleByDay: Record<number, DaySchedule | null>;
  /** The real current trip day, or -1 when the trip is not underway. */
  realDay: number;
  /** Jump to a day in the Plan view. */
  onPickDay: (day: number) => void;
}

type Fit = 'over' | 'tight' | 'ok';

const byOrder = (a: PlaceWithOverride, b: PlaceWithOverride) =>
  (a.dayOrder ?? 0) - (b.dayOrder ?? 0) || a.name.localeCompare(b.name);

function fitLevel(s: DaySchedule): Fit {
  if (s.overSec > 0) return 'over';
  if (s.slackSec < 3600) return 'tight';
  return 'ok';
}

function fitLabel(s: DaySchedule, level: Fit): string {
  if (level === 'over') return `⚠ ${formatDuration(s.overSec)} over`;
  if (level === 'tight') return `${formatDuration(s.slackSec)} spare`;
  return `✓ ${formatDuration(s.slackSec)} spare`;
}

/** All 13 days on one screen — date · fit · drive · spare · big highlights. */
export default function TripBoard({ places, scheduleByDay, realDay, onPickDay }: Props) {
  // Committed stops per day = matches the route/clock: has a day, not rejected,
  // not an `extra` area-option.
  const byDay = new Map<number, PlaceWithOverride[]>();
  for (const p of places) {
    if (!p.day || p.status === 'rejected' || p.status === 'extra') continue;
    const list = byDay.get(p.day);
    if (list) list.push(p);
    else byDay.set(p.day, [p]);
  }

  let totalDrive = 0;
  let totalStops = 0;
  let warnDays = 0;

  const rows = DAYS.map((d) => {
    const stops = (byDay.get(d) ?? []).slice().sort(byOrder);
    const schedule = scheduleByDay[d] ?? null;
    const level = schedule ? fitLevel(schedule) : null;
    totalDrive += schedule?.driveSec ?? 0;
    totalStops += stops.length;
    if (level === 'over' || level === 'tight') warnDays += 1;

    // Where we sleep — anchors the day geographically at a glance.
    const sleep = [...stops]
      .reverse()
      .find((p) => p.category === 'accommodation' || p.category === 'campsite');

    // Unique big highlights, in route order.
    const highlights: string[] = [];
    for (const p of stops) {
      const t = activityType(p);
      if (t && !highlights.includes(t)) highlights.push(t);
    }

    return { d, stops, schedule, level, sleep, highlights };
  });

  return (
    <div className="board">
      <p className="board-summary">
        <strong>13 days</strong> · {totalStops} committed stops · ~{formatDuration(totalDrive)} driving
        {warnDays > 0 && <span className="board-summary-warn"> · {warnDays} tight/over</span>}
      </p>
      <p className="board-sub">
        Every day at a glance — fit verdict, drive time, spare slack, and the big highlights. Tap a day to open it
        in the plan. Aim for comfortable spare on most days (see Plan for the wrap-by clock).
      </p>

      <ul className="board-list">
        {rows.map(({ d, stops, schedule, level, sleep, highlights }) => (
          <li key={d}>
            <button
              type="button"
              className={`board-row${realDay === d ? ' today' : ''}`}
              onClick={() => onPickDay(d)}
            >
              <span className="board-row-head">
                <span className="board-day-num" style={{ background: dayColor(d) }}>
                  {d}
                </span>
                <span className="board-day-date">{dayDateLabel(d)}</span>
                {realDay === d && <span className="board-today-badge">today</span>}
                {schedule && level && (
                  <span className={`board-fit board-fit-${level}`}>{fitLabel(schedule, level)}</span>
                )}
              </span>

              <span className="board-meta">
                {sleep && <span className="board-sleep">🛏 {sleep.name}</span>}
                <span className="board-stops">{stops.length} stops</span>
                {schedule ? (
                  <>
                    <span className="board-drive">{formatDuration(schedule.driveSec)} drive</span>
                    <span className="board-ends">ends {formatClock(schedule.finishSec)}</span>
                  </>
                ) : (
                  <span className="board-drive muted">routing…</span>
                )}
              </span>

              <span className="board-hl">
                {highlights.length > 0 ? (
                  highlights.map((h) => (
                    <span key={h} className="board-hl-chip">
                      {h}
                    </span>
                  ))
                ) : (
                  <span className="board-hl-none">⚠ no big highlight yet</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
