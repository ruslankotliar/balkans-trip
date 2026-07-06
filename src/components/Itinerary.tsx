import { useState } from 'react';
import { CATEGORY_COLORS, GROUP_OF } from '../constants';
import { formatClock, formatTimeRange, type DaySchedule } from '../schedule';
import type { PlaceWithOverride } from '../store';
import type { DayRoutes } from '../useDayRoutes';
import { DAYS, dayColor, dayDateLabel, formatDistance, formatDuration, haversineKm } from '../trip';

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
  onRemoveGroup?: (groupId: string) => void;
  onGroupTabChange?: (groupId: string, idx: number, placeId: string) => void;
  /** Day clock per day, derived from the current route + stop times. */
  scheduleByDay?: Record<number, DaySchedule | null>;
  /** Per-day start/end hour (+ pace) for the schedule clock; undefined = defaults 08:00–21:00. */
  dayConfig?: Record<number, { startHour?: number; endHour?: number; pace?: number }>;
  /** Patch a day's start/end hour (decimal, e.g. 6.5 = 06:30; >24 = past midnight); undefined value resets. */
  onSetDayCfg?: (day: number, patch: { startHour?: number; endHour?: number }) => void;
  /** Selected option index per optionGroup ID; controls which option shows in the itinerary row. */
  optGroupSel?: Record<string, number>;
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


const byOrder = (a: PlaceWithOverride, b: PlaceWithOverride) =>
  (a.dayOrder ?? 0) - (b.dayOrder ?? 0) || a.name.localeCompare(b.name);

// Rough straight-line km → drive minutes on winding Balkan roads (road ≈ 1.35×
// straight-line at ~55 km/h). An estimate, not routing — shown with a "~".
const EST_MIN_PER_KM = 1.5;
function formatDriveEst(km: number): string {
  const min = Math.max(1, Math.round(km * EST_MIN_PER_KM));
  if (min < 60) return `~${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `~${h}h${String(m).padStart(2, '0')}` : `~${h}h`;
}
const RADIUS_CHOICES = [20, 30, 45, 60, 90, 120];

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

// Option-group rendering types
type SingleSlot = { type: 'single'; entry: AgendaEntry; slotIdx: number };
type GroupSlot  = { type: 'group';  groupId: string; options: AgendaEntry[]; slotIdx: number };
type RenderSlot = SingleSlot | GroupSlot;

function buildRenderSlots(entries: AgendaEntry[]): RenderSlot[] {
  const slots: RenderSlot[] = [];
  let i = 0;
  while (i < entries.length) {
    const gid = entries[i].place.optionGroup;
    if (!gid) {
      slots.push({ type: 'single', entry: entries[i], slotIdx: slots.length });
      i++;
    } else {
      const options: AgendaEntry[] = [];
      while (i < entries.length && entries[i].place.optionGroup === gid) {
        options.push(entries[i]);
        i++;
      }
      slots.push({ type: 'group', groupId: gid, options, slotIdx: slots.length });
    }
  }
  return slots;
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
  onRemoveGroup,
  onGroupTabChange,
  scheduleByDay,
  dayConfig,
  onSetDayCfg,
  optGroupSel: optGroupSelProp = {},
}: Props) {
  // Adjustable search radius for "options nearby today", in estimated drive-minutes.
  const [optRadiusMin, setOptRadiusMin] = useState(45);
  const optGroupSel = optGroupSelProp;

  const assigned = places.filter((p) => p.day && p.status !== 'rejected');
  const backlog = places
    .filter((p) => !p.day && p.status === 'shortlist')
    .sort((a, b) => a.name.localeCompare(b.name));

  const stops = assigned.filter((p) => p.day === day).sort(byOrder);

  // Ready-to-go OPTIONS near this day: prepared "things to do" option pins
  // (extra/backup, no committed day) within the chosen drive-radius of the day's
  // stops. Excludes SLEEP (beds) and LOGISTICS (ferry ports, borders, ER/clinics)
  // — those belong on the map / Essentials, not in a "what else can we do" menu.
  const dayAnchors = stops.filter((p) => p.lat != null && p.lng != null);
  const optRadiusKm = optRadiusMin / EST_MIN_PER_KM;
  const nearbyOptions =
    dayAnchors.length === 0
      ? []
      : places
          .filter(
            (p) =>
              (p.status === 'extra' || p.status === 'candidate' || p.status === 'backup') &&
              p.day == null &&
              GROUP_OF[p.category] !== 'sleep' &&
              GROUP_OF[p.category] !== 'logistics' &&
              p.lat != null,
          )
          .map((p) => ({
            p,
            km: Math.min(...dayAnchors.map((a) => haversineKm(a.lat, a.lng, p.lat, p.lng))),
          }))
          .filter((x) => x.km <= optRadiusKm)
          .sort((a, b) => a.km - b.km)
          .slice(0, 40);

  const route = routes[day];
  const isToday = realDay === day;
  const driveSec = route ? route.duration + (ferrySecByDay[day] ?? 0) : 0;
  const schedule = scheduleByDay?.[day] ?? null;
  const shortlistStops = stops.filter((p) => p.status === 'shortlist');
  const scheduleEntries: AgendaEntry[] = schedule?.entries?.length
    ? schedule.entries
    : shortlistStops.map((place) => ({
        place,
        arriveSec: null,
        departSec: null,
      }));
  const renderSlots = buildRenderSlots(scheduleEntries);
  const getActiveEntry = (slot: RenderSlot): AgendaEntry =>
    slot.type === 'single'
      ? slot.entry
      : slot.options[Math.min(optGroupSel[slot.groupId] ?? 0, slot.options.length - 1)];

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
            {renderSlots.map((slot) => {
              const activeEntry = getActiveEntry(slot);
              const prevSlot = slot.slotIdx > 0 ? renderSlots[slot.slotIdx - 1] : null;
              const prevEntry = prevSlot ? getActiveEntry(prevSlot) : null;
              const legSec =
                prevEntry && activeEntry.arriveSec != null && prevEntry.departSec != null
                  ? activeEntry.arriveSec - prevEntry.departSec
                  : null;
              const hint = bestTimeHint(activeEntry.place.bestTime);
              const timeRange =
                activeEntry.arriveSec != null && activeEntry.departSec != null
                  ? formatTimeRange(activeEntry.arriveSec, activeEntry.departSec)
                  : 'Unscheduled';

              const isGroup = slot.type === 'group';
              const groupSlot = isGroup ? (slot as GroupSlot) : null;
              const activeIdx = isGroup
                ? Math.min(optGroupSel[groupSlot!.groupId] ?? 0, groupSlot!.options.length - 1)
                : 0;
              const key = isGroup ? `grp-${slot.groupId}` : `${day}-${activeEntry.place.id}`;
              const isSelected = isGroup
                ? groupSlot!.options.some((e) => e.place.id === selectedId)
                : selectedId === activeEntry.place.id;
              return (
                <div key={key} className="itin-stop-entry">
                  {legSec != null && legSec > 0 && (
                    <div className="itin-leg">↓ {formatDuration(legSec)} drive</div>
                  )}
                  <button
                    type="button"
                    className={`itin-stop-row${isSelected ? ' selected' : ''}${isGroup ? ' has-options' : ''}`}
                    onClick={() => onSelect(activeEntry.place)}
                  >
                    <span className="itin-stop-step" style={{ background: dayColor(day) }}>
                      {slot.slotIdx + 1}
                    </span>
                    <span className="itin-stop-main">
                      <span className="itin-stop-name">
                        {activeEntry.place.pick && <span className="pick-star" title="Recommended pick">★ </span>}
                        {activeEntry.place.name}
                      </span>
                      {hint && <span className="itin-stop-hint">{hint}</span>}
                      {activeEntry.place.note && <span className="itin-stop-note">🕘 {activeEntry.place.note}</span>}
                    </span>
                    <span className={`itin-stop-time${activeEntry.arriveSec == null ? ' muted' : ''}`}>
                      {timeRange}
                    </span>
                  </button>
                  {isGroup && groupSlot!.options.length > 1 && (
                    <div className="itin-opt-tabs">
                      {groupSlot!.options.map((entry, i) => {
                        const label =
                          entry.place.optionTabLabel ??
                          entry.place.name.replace(/[—–(,].*/, '').trim().slice(0, 16);
                        return (
                          <button
                            key={entry.place.id}
                            type="button"
                            className={`itin-opt-tab${i === activeIdx ? ' active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onGroupTabChange?.(groupSlot!.groupId, i, entry.place.id);
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {isSelected && (
                    <div className="itin-stop-actions">
                      <button
                        type="button"
                        disabled={slot.slotIdx === 0}
                        onClick={() => onMove(activeEntry.place.id, 'up')}
                        title="Move earlier"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={slot.slotIdx === renderSlots.length - 1}
                        onClick={() => onMove(activeEntry.place.id, 'down')}
                        title="Move later"
                      >
                        ↓
                      </button>
                      {isGroup ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onAssignDay(activeEntry.place.id, null)}
                            title="Remove this option from day"
                          >
                            ➖
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveGroup?.(groupSlot!.groupId)}
                            title="Remove all options from day"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAssignDay(activeEntry.place.id, null)}
                          title="Remove from day"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {nearbyOptions.length > 0 && (
        <details className="itin-nearby">
          <summary>✨ Options nearby today ({nearbyOptions.length}) · spare time / if you want more</summary>
          <div className="itin-nearby-hint">
            Researched options within a ~{optRadiusMin >= 60 ? `${Math.floor(optRadiusMin / 60)}h${optRadiusMin % 60 ? optRadiusMin % 60 : ''}` : `${optRadiusMin} min`} drive of today's
            stops — pick one on the spot instead of googling. Tap to open.{' '}
            <label className="itin-nearby-radius">
              within{' '}
              <select
                value={optRadiusMin}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setOptRadiusMin(Number(e.target.value))}
              >
                {RADIUS_CHOICES.map((m) => (
                  <option key={m} value={m}>
                    {m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? m % 60 : ''}`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ul className="place-list">
            {nearbyOptions.map(({ p, km }) => (
              <li
                key={p.id}
                className={selectedId === p.id ? 'selected' : ''}
                onClick={() => onSelect(p)}
              >
                <span className="dot" style={{ background: CATEGORY_COLORS[p.category] }} />
                {p.pick && <span className="pick-star" title="Recommended pick">★</span>}
                <span className="place-name">{p.name}</span>
                <span className="itin-nearby-cat">{p.category}</span>
                <span className="itin-nearby-km" title="estimated drive time (straight-line based)">{formatDriveEst(km)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {backlog.length > 0 && (
        <details className="itin-backlog">
          <summary>⚠ Shortlisted but no day yet ({backlog.length}) — give each a day or make it an option</summary>
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
        </details>
      )}
    </div>
  );
}
