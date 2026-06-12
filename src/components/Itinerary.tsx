import { CATEGORY_COLORS } from '../constants';
import { formatClock, formatRecoveryNames, type DaySchedule } from '../schedule';
import type { PlaceWithOverride } from '../store';
import type { DayRoutes } from '../useDayRoutes';
import {
  DAY_HINTS,
  DAYS,
  dayColor,
  dayDateLabel,
  formatDistance,
  formatDuration,
  stopHint,
} from '../trip';
import type { Country } from '../types';


const COUNTRY_FLAG: Record<Country, string> = { HR: '🇭🇷', BA: '🇧🇦', ME: '🇲🇪' };

interface Props {
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
  onFindSleep: (day: number) => void;
  /** Free-text per-day notes (from Today view textarea). */
  dayNotes?: Record<number, string>;
  /** Day clock estimate per day, derived from the current route + stop times. */
  scheduleByDay?: Record<number, DaySchedule | null>;
}

const byOrder = (a: PlaceWithOverride, b: PlaceWithOverride) =>
  (a.dayOrder ?? 0) - (b.dayOrder ?? 0) || a.name.localeCompare(b.name);

export default function Itinerary({
  places,
  routes,
  routesLoading,
  realDay,
  ferrySecByDay,
  selectedId,
  onSelect,
  onMove,
  onAssignDay,
  onFindSleep,
  dayNotes,
  scheduleByDay,
}: Props) {
  const assigned = places.filter((p) => p.day);
  const backlog = places
    .filter((p) => !p.day && p.status === 'shortlist')
    .sort((a, b) => a.name.localeCompare(b.name));

  const ferryTotal = Object.values(ferrySecByDay).reduce((s, v) => s + v, 0);
  const totalSec =
    Object.values(routes).reduce((s, r) => s + r.duration, 0) + ferryTotal;
  const totalM = Object.values(routes).reduce((s, r) => s + r.distance, 0);

  return (
    <div className="itinerary">
      <div className="itin-total">
        <strong>{assigned.length}</strong> stops planned ·{' '}
        <strong>{formatDuration(totalSec)}</strong> / {formatDistance(totalM)} driving
        {routesLoading && <span className="loading-dot"> · routing…</span>}
      </div>

      {DAYS.map((day) => {
        const stops = assigned.filter((p) => p.day === day).sort(byOrder);
        const route = routes[day];
        const isToday = realDay === day;
        const driveSec = route ? route.duration + (ferrySecByDay[day] ?? 0) : 0;
        const driveClass = driveSec > 4.5 * 3600 ? 'drive-heavy' : driveSec > 3 * 3600 ? 'drive-warn' : '';
        const schedule = scheduleByDay?.[day] ?? null;
        const flags = [...new Set(stops.map((p) => p.country).filter(Boolean))]
          .map((c) => COUNTRY_FLAG[c as Country] ?? '')
          .join('');
        return (
          <div key={day} className={`itin-day${isToday ? ' today' : ''}`}>
            <div className={`itin-day-head${isToday ? ' today' : ''}`} style={{ borderColor: dayColor(day) }}>
              <span className="itin-day-num" style={{ background: dayColor(day) }}>
                {day}
              </span>
              <span className="itin-day-date">{dayDateLabel(day)}</span>
              {isToday && <span className="itin-today-badge">today</span>}
              {flags && <span className="itin-day-flags">{flags}</span>}
              {route && (
                <span className={`itin-day-route${driveClass ? ` ${driveClass}` : ''}`}>
                  {driveClass === 'drive-heavy' ? '⚠️ ' : ''}
                  {formatDuration(driveSec)}
                  {ferrySecByDay[day] ? ' ⛴' : ''} · {formatDistance(route.distance)}
                </span>
              )}
              {schedule && (
                <span className={`itin-day-clock ${schedule.overSec > 0 ? 'late' : 'slack'}`}>
                  finish {formatClock(schedule.finishSec)} ·{' '}
                  {schedule.overSec > 0
                    ? `+${formatDuration(schedule.overSec)} late`
                    : `${formatDuration(schedule.slackSec)} slack`}
                </span>
              )}
              {route && (
                <button
                  className="itin-sleep-btn"
                  title="Find sleep spots along this day's route"
                  onClick={() => onFindSleep(day)}
                >
                  🛏
                </button>
              )}
            </div>
            {DAY_HINTS[day] && (
              <div className="itin-day-hint">
                {DAY_HINTS[day].icon} {DAY_HINTS[day].text}
              </div>
            )}
            {dayNotes?.[day] && (
              <div className="itin-day-note">
                📝 {dayNotes[day]}
              </div>
            )}
            {schedule && schedule.overSec > 0 && schedule.recovery.length > 0 && (
              <div className="itin-day-recovery">
                Catch-up (approx): skip {formatRecoveryNames(schedule.recovery[0].names)} to recover{' '}
                {formatDuration(schedule.recovery[0].freedSec)}
              </div>
            )}
            {stops.some((p) => p.bestTime) && (
              <div className="itin-time-tips">
                {stops
                  .filter((p) => p.bestTime)
                  .map((p) => {
                    const hint = stopHint(p.bestTime);
                    if (!hint) return null;
                    return (
                      <div key={p.id} className="itin-time-tip">
                        ⏰ <strong>{p.name}:</strong> {hint}
                      </div>
                    );
                  })}
              </div>
            )}
            {stops.length === 0 ? (
              <p className="itin-empty">no stops</p>
            ) : (
              <ol className="itin-stops">
                {stops.map((p, i) => (
                  <li
                    key={p.id}
                    className={`${selectedId === p.id ? 'selected' : ''}${p.category === 'campsite' || p.category === 'accommodation' ? ' itin-sleep-stop' : ''}`}
                    onClick={() => onSelect(p)}
                  >
                    <span
                      className="dot"
                      style={{ background: CATEGORY_COLORS[p.category] }}
                    />
                    <span className="place-name">
                      {(p.category === 'campsite' || p.category === 'accommodation') && (
                        <span className="itin-sleep-icon" title="Sleep option">🛏</span>
                      )}
                      {p.name}
                    </span>
                    {schedule?.entries[i] && (
                      <span className="itin-stop-clock">
                        {formatClock(schedule.entries[i].arriveSec)}–{formatClock(schedule.entries[i].departSec)}
                      </span>
                    )}
                    <span className="itin-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        disabled={i === 0}
                        onClick={() => onMove(p.id, 'up')}
                        title="Move earlier"
                      >
                        ↑
                      </button>
                      <button
                        disabled={i === stops.length - 1}
                        onClick={() => onMove(p.id, 'down')}
                        title="Move later"
                      >
                        ↓
                      </button>
                      <button onClick={() => onAssignDay(p.id, null)} title="Remove from day">
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        );
      })}

      <div className="itin-backlog">
        <h3>Backlog · shortlisted, no day ({backlog.length})</h3>
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
      </div>
    </div>
  );
}
