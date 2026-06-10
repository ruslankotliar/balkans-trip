import { CATEGORY_COLORS } from '../constants';
import type { PlaceWithOverride } from '../store';
import type { DayRoutes } from '../useDayRoutes';
import {
  DAYS,
  dayColor,
  dayDateLabel,
  formatDistance,
  formatDuration,
} from '../trip';

interface Props {
  places: PlaceWithOverride[];
  routes: DayRoutes;
  routesLoading: boolean;
  /** Manual ferry seconds per day (only days that have any). */
  ferrySecByDay: Record<number, number>;
  selectedId: string | null;
  onSelect: (p: PlaceWithOverride) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onAssignDay: (id: string, day: number | null) => void;
  onFindSleep: (day: number) => void;
}

const byOrder = (a: PlaceWithOverride, b: PlaceWithOverride) =>
  (a.dayOrder ?? 0) - (b.dayOrder ?? 0) || a.name.localeCompare(b.name);

export default function Itinerary({
  places,
  routes,
  routesLoading,
  ferrySecByDay,
  selectedId,
  onSelect,
  onMove,
  onAssignDay,
  onFindSleep,
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
        return (
          <div key={day} className="itin-day">
            <div className="itin-day-head" style={{ borderColor: dayColor(day) }}>
              <span className="itin-day-num" style={{ background: dayColor(day) }}>
                {day}
              </span>
              <span className="itin-day-date">{dayDateLabel(day)}</span>
              {route && (
                <span className="itin-day-route">
                  {formatDuration(route.duration + (ferrySecByDay[day] ?? 0))}
                  {ferrySecByDay[day] ? ' ⛴' : ''} · {formatDistance(route.distance)}
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
            {stops.length === 0 ? (
              <p className="itin-empty">no stops</p>
            ) : (
              <ol className="itin-stops">
                {stops.map((p, i) => (
                  <li
                    key={p.id}
                    className={selectedId === p.id ? 'selected' : ''}
                    onClick={() => onSelect(p)}
                  >
                    <span
                      className="dot"
                      style={{ background: CATEGORY_COLORS[p.category] }}
                    />
                    <span className="place-name">{p.name}</span>
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
