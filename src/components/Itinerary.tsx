import { useState } from 'react';
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
  /** Day clock per day, derived from the current route + stop times. */
  scheduleByDay?: Record<number, DaySchedule | null>;
  /** Per-day start/end hour (+ pace) for the schedule clock; undefined = defaults 08:00–21:00. */
  dayConfig?: Record<number, { startHour?: number; endHour?: number; pace?: number }>;
  /** Patch a day's start/end hour (decimal, e.g. 6.5 = 06:30; >24 = past midnight); undefined value resets. */
  onSetDayCfg?: (day: number, patch: { startHour?: number; endHour?: number }) => void;
}

/** Decimal hour (6.5, or 26 for 02:00 next day) → "HH:MM" for a time input. */
function hourToHHMM(h: number): string {
  const total = Math.round((((h % 24) + 24) % 24) * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
/** "HH:MM" → decimal hour, or undefined when blank. */
function hhmmToHour(v: string): number | undefined {
  const m = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return undefined;
  return Number(m[1]) + Number(m[2]) / 60;
}

// ── Big-highlight classifier (for the activity-mix tracker) ──
// Only the MAJOR highlights worth balancing across days — the booked / time /
// money / effort ones. Everything quick/free/ambient (eating, swimming,
// cliff-jumping, snorkeling, viewpoints, town/sightseeing, plain nature,
// scenic drives, dams) is deliberately NOT tracked. Gated by CATEGORY (so a
// drive/dam/viewpoint named "...Canyon..." isn't counted) and matched on the
// NAME only (ids + tags are too noisy and cause false hits).
function activityType(p: PlaceWithOverride): string | null {
  if (p.category === 'nightlife') return 'nightlife';
  if (p.category === 'hike') return 'hiking'; // summits / canyon hikes = real effort
  const n = p.name.toLowerCase();
  if (p.category === 'food') {
    if (/\bwine\b|vinarij|winery|vineyard/.test(n)) return 'wine tasting';
    if (/peka|cooking class|cook[ -]your[ -]own/.test(n)) return 'cooking';
    return null; // a meal = ambient
  }
  if (p.category !== 'activity') return null; // nature/beach/sight/viewpoint/town/other/sleeps
  // category 'activity' → subtype; check SPECIFIC activities before the generic
  // "canyon" (so "Tara Canyon rafting"/"Cetina Canyon Zipline" classify right).
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
  if (/canyon/.test(n)) return 'canyoning'; // generic fallback, after the specifics
  return null; // unrecognized 'activity' (e.g. a scenic toll road) → not tracked
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
  dayConfig,
  onSetDayCfg,
}: Props) {
  const [mixOpen, setMixOpen] = useState(false);
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

  // Trip-wide mix of the BIG highlights (the booked/time/money/effort ones)
  // over the COMMITTED (shortlist) stops — keeps variety in view, flags the
  // same highlight on back-to-back days, and flags days stacking 2+ of them.
  const { mix, heavyDays } = (() => {
    const byType = new Map<string, { count: number; days: Set<number> }>();
    const perDay = new Map<number, number>();
    for (const p of assigned) {
      // Count everything COMMITTED to a day (anything with a day that isn't an
      // `extra` area-option or rejected) — not just status==='shortlist', since
      // a few in-route stops carry candidate/backup status after moves.
      if (!p.day || p.status === 'extra' || p.status === 'rejected') continue;
      const t = activityType(p);
      if (!t) continue;
      const e = byType.get(t) ?? { count: 0, days: new Set<number>() };
      e.count += 1;
      e.days.add(p.day);
      byType.set(t, e);
      perDay.set(p.day, (perDay.get(p.day) ?? 0) + 1);
    }
    const mix = [...byType.entries()]
      .map(([type, e]) => {
        const days = [...e.days].sort((a, b) => a - b);
        return { type, count: e.count, days, adjacent: days.some((d, i) => i > 0 && d - days[i - 1] === 1) };
      })
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
    const heavyDays = [...perDay.entries()].filter(([, n]) => n >= 2).map(([d]) => d).sort((a, b) => a - b);
    return { mix, heavyDays };
  })();

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

      {mix.length > 0 && (() => {
        const adj = mix.filter((m) => m.adjacent).length;
        const w: string[] = [];
        if (adj) w.push(`${adj} back-to-back`);
        if (heavyDays.length) w.push(`${heavyDays.length} stacked`);
        return (
          <button type="button" className="itin-mix-bar" onClick={() => setMixOpen(true)}>
            <span className="itin-mix-bar-label">🎯 Big highlights · {mix.length}</span>
            {w.length > 0 && <span className="itin-mix-bar-warn">⚠ {w.join(', ')}</span>}
            <span className="itin-mix-bar-open">view ▸</span>
          </button>
        );
      })()}

      {mixOpen && (
        <div className="mix-overlay" role="dialog" aria-modal="true" onClick={() => setMixOpen(false)}>
          <div className="mix-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="mix-dialog-head">
              <strong>🎯 Big-highlight mix</strong>
              <button type="button" className="mix-dialog-close" onClick={() => setMixOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <p className="mix-dialog-sub">
              Big (book/€/half-day) activities you've committed across the trip — keep variety, avoid back-to-back
              repeats. Tap a day to jump there.
            </p>
            {heavyDays.length > 0 && (
              <div className="itin-mix-heavy">
                ⚠ Days stacking 2+ big highlights (hard to fit a half-day each):{' '}
                {heavyDays.map((dd) => (
                  <button
                    key={dd}
                    type="button"
                    className={`itin-mix-day${dd === day ? ' cur' : ''}`}
                    onClick={() => {
                      onDay(dd);
                      setMixOpen(false);
                    }}
                  >
                    {dd}
                  </button>
                ))}
              </div>
            )}
            <ul className="itin-mix-list">
              {mix.map((m) => (
                <li key={m.type} className={m.adjacent ? 'adjacent' : ''}>
                  <span className="itin-mix-type">{m.type}</span>
                  <span className="itin-mix-count">×{m.count}</span>
                  <span className="itin-mix-days">
                    {m.days.map((dd) => (
                      <button
                        key={dd}
                        type="button"
                        className={`itin-mix-day${dd === day ? ' cur' : ''}`}
                        onClick={() => {
                          onDay(dd);
                          setMixOpen(false);
                        }}
                        title={`Go to day ${dd}`}
                      >
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
        </div>
      )}

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

        {onSetDayCfg && (
          <div className="itin-start">
            <label>
              Start{' '}
              <input
                type="time"
                value={hourToHHMM(dayConfig?.[day]?.startHour ?? (schedule ? schedule.dayStartSec / 3600 : 8))}
                onChange={(e) => onSetDayCfg(day, { startHour: hhmmToHour(e.target.value) })}
              />
            </label>
            <label>
              · wrap by{' '}
              <input
                type="time"
                value={hourToHHMM(dayConfig?.[day]?.endHour ?? (schedule ? schedule.plannedEndSec / 3600 : 21))}
                onChange={(e) => {
                  let h = hhmmToHour(e.target.value);
                  const start = dayConfig?.[day]?.startHour ?? (schedule ? schedule.dayStartSec / 3600 : 8);
                  if (h != null && h <= start) h += 24; // wrap-time at/earlier than start = after midnight
                  onSetDayCfg(day, { endHour: h });
                }}
              />
            </label>
            {(dayConfig?.[day]?.startHour != null || dayConfig?.[day]?.endHour != null) && (
              <button
                type="button"
                className="itin-start-reset"
                onClick={() => onSetDayCfg(day, { startHour: undefined, endHour: undefined })}
              >
                reset
              </button>
            )}
          </div>
        )}

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
                      {entry.place.note && <span className="itin-stop-note">🕘 {entry.place.note}</span>}
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
