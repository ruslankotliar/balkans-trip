import { CATEGORY_COLORS } from '../constants';
import { formatClock, formatTimeRange, type DaySchedule } from '../schedule';
import type { PlaceWithOverride } from '../store';
import type { DayRoutes } from '../useDayRoutes';
import { DAYS, dayColor, dayDateLabel, formatDistance, formatDuration } from '../trip';

interface Props {
  day: number;
  onDay: (day: number) => void;
  places: PlaceWithOverride[];
  routes: DayRoutes;
  routesLoading: boolean;
  /** The real current trip day, or -1 when the trip is not underway. */
  realDay: number;
  /** Manual ferry seconds per day (only days that have any). */
  ferrySecByDay: Record<number, number>;
  selectedId: string | null;
  onSelect: (p: PlaceWithOverride) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onAssignDay: (id: string, day: number | null) => void;
  onFindSleep?: (day: number) => void;
  /** Day clock per day, derived from the current route + stop times. */
  scheduleByDay?: Record<number, DaySchedule | null>;
}

const byOrder = (a: PlaceWithOverride, b: PlaceWithOverride) =>
  (a.dayOrder ?? 0) - (b.dayOrder ?? 0) || a.name.localeCompare(b.name);

/** Short timing cue from a place's bestTime (strip the "Day N — " prefix, first sentence). */
function bestTimeHint(bt?: string): string {
  if (!bt) return '';
  const t = bt.replace(/^(?:Day|Night)\s+\d+[^—]*—\s*/, '').trim();
  const dot = t.indexOf('. ');
  const s = dot > 0 && dot < 80 ? t.slice(0, dot) : t;
  return s.length > 72 ? s.slice(0, 69).trimEnd() + '…' : s;
}

interface AgendaEntry {
  place: PlaceWithOverride;
  arriveSec: number | null;
  departSec: number | null;
}

export default function Itinerary({
  day,
  onDay,
  places,
  routes,
  routesLoading,
  realDay,
  ferrySecByDay,
  selectedId,
  onSelect,
  onMove,
  onAssignDay,
  scheduleByDay,
}: Props) {
  const assigned = places.filter((p) => p.day && p.status !== 'rejected');
  const backlog = places
    .filter((p) => !p.day && p.status === 'shortlist')
    .sort((a, b) => a.name.localeCompare(b.name));

  const stops = assigned.filter((p) => p.day === day).sort(byOrder);
  const route = routes[day];
  const isToday = realDay === day;
  const driveSec = route ? route.duration + (ferrySecByDay[day] ?? 0) : 0;
  const schedule = scheduleByDay?.[day] ?? null;
  const scheduleEntries: AgendaEntry[] = schedule?.entries?.length
    ? schedule.entries
    : stops.map((place) => ({
        place,
        arriveSec: null,
        departSec: null,
      }));

  return (
    <div className="itinerary">
      <div className="itin-day-nav">
        <button className="itin-day-nav-btn" disabled={day <= 1} onClick={() => onDay(day - 1)}>
          ◀
        </button>
        <select
          className="itin-day-select"
          value={day}
          onChange={(e) => onDay(Number(e.target.value))}
        >
          {DAYS.map((d) => (
            <option key={d} value={d}>
              Day {d} · {dayDateLabel(d)}
            </option>
          ))}
        </select>
        <button
          className="itin-day-nav-btn"
          disabled={day >= DAYS[DAYS.length - 1]}
          onClick={() => onDay(day + 1)}
        >
          ▶
        </button>
        {realDay >= 1 && !isToday && (
          <button className="itin-day-today" onClick={() => onDay(realDay)}>
            Today
          </button>
        )}
      </div>

      <div className="itin-total">
        <strong>{stops.length}</strong> stops ·{' '}
        <strong>{formatDuration(driveSec)}</strong> / {route ? formatDistance(route.distance) : '0 km'} driving
        {routesLoading && <span className="loading-dot"> · routing…</span>}
      </div>

      <div className={`itin-day${isToday ? ' today' : ''}`}>
        <div className={`itin-day-head${isToday ? ' today' : ''}`} style={{ borderColor: dayColor(day) }}>
          <span className="itin-day-num" style={{ background: dayColor(day) }}>
            {day}
          </span>
          <span className="itin-day-date">{dayDateLabel(day)}</span>
          {isToday && <span className="itin-today-badge">today</span>}
        </div>
        {schedule && (() => {
          const level = schedule.overSec > 0 ? 'over' : schedule.slackSec < 3600 ? 'tight' : 'ok';
          const label =
            level === 'over'
              ? `⚠ Overpacked · ends ${formatClock(schedule.finishSec)} · ${formatDuration(schedule.overSec)} over — drop a stop`
              : level === 'tight'
                ? `Tight · ends ${formatClock(schedule.finishSec)} · ${formatDuration(schedule.slackSec)} spare`
                : `✓ Realistic · ends ${formatClock(schedule.finishSec)} · ${formatDuration(schedule.slackSec)} spare`;
          return <div className={`itin-verdict itin-verdict-${level}`}>{label}</div>;
        })()}

        {scheduleEntries.length === 0 ? (
          <p className="itin-empty">no stops</p>
        ) : (
          <div className="itin-stop-list">
            {scheduleEntries.map((entry, i) => {
              const timeRange =
                entry.arriveSec != null && entry.departSec != null
                  ? formatTimeRange(entry.arriveSec, entry.departSec)
                  : 'Unscheduled';
              const prev = i > 0 ? scheduleEntries[i - 1] : null;
              const legSec =
                prev && entry.arriveSec != null && prev.departSec != null
                  ? entry.arriveSec - prev.departSec
                  : null;
              const hint = bestTimeHint(entry.place.bestTime);

              return (
                <div key={`${day}-${entry.place.id}-${i}`} className="itin-stop-entry">
                  {legSec != null && legSec > 0 && (
                    <div className="itin-leg">↓ {formatDuration(legSec)} drive</div>
                  )}
                  <button
                    type="button"
                    className={`itin-stop-row${selectedId === entry.place.id ? ' selected' : ''}`}
                    onClick={() => onSelect(entry.place)}
                  >
                    <span className="itin-stop-step" style={{ background: dayColor(day) }}>
                      {i + 1}
                    </span>
                    <span className="itin-stop-main">
                      <span className="itin-stop-name">{entry.place.name}</span>
                      {hint && <span className="itin-stop-hint">{hint}</span>}
                    </span>
                    <span className={`itin-stop-time${entry.arriveSec == null ? ' muted' : ''}`}>
                      {timeRange}
                    </span>
                  </button>
                  {selectedId === entry.place.id && (
                    <div className="itin-stop-actions">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => onMove(entry.place.id, 'up')}
                        title="Move earlier"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={i === scheduleEntries.length - 1}
                        onClick={() => onMove(entry.place.id, 'down')}
                        title="Move later"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => onAssignDay(entry.place.id, null)}
                        title="Remove from day"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <details className="itin-backlog">
        <summary>Backlog · shortlisted, no day ({backlog.length})</summary>
        {backlog.length === 0 ? (
          <p className="itin-empty">nothing waiting — all shortlist places are scheduled</p>
        ) : (
          <ul className="place-list">
            {backlog.map((p) => (
              <li
                key={p.id}
                className={selectedId === p.id ? 'selected' : ''}
                onClick={() => onSelect(p)}
              >
                <span className="dot" style={{ background: CATEGORY_COLORS[p.category] }} />
                <span className="place-name">{p.name}</span>
                <select
                  className="backlog-day"
                  value=""
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onAssignDay(p.id, Number(e.target.value))}
                >
                  <option value="">+ day</option>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      Day {d}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}
