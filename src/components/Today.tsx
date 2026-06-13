import { CATEGORY_COLORS } from '../constants';
import { bookingFor, navUrl } from '../links';
import type { CachedRoute, PlaceWithOverride } from '../store';
import { formatClock, type DaySchedule } from '../schedule';
import { DAY_HINTS, DAY_OPS, TRIP_DAYS, daysToTripStart, dayDateLabel, formatDuration, stopHint } from '../trip';

export interface ProximityMatch {
  place: PlaceWithOverride;
  /** straight-line km from the anchor (GPS fix or today's last stop) */
  dist: number;
}

interface Props {
  /** Day being viewed (defaults to the real current trip day). */
  day: number;
  /** The real current trip day. */
  realDay: number;
  onDay: (d: number) => void;
  /** Today's stops in visiting order. */
  stops: PlaceWithOverride[];
  route: CachedRoute | undefined;
  schedule?: DaySchedule | null;
  /** Manual ferry hours for a leg between two place ids. */
  ferryFor: (idA: string, idB: string) => number;
  done: Record<string, boolean>;
  onToggleDone: (id: string) => void;
  onSkip: (p: PlaceWithOverride) => void;
  onSelect: (p: PlaceWithOverride) => void;
  /** km from GPS fix to a point, or null when no fix yet. */
  kmFromGps: (lat: number, lng: number) => number | null;
  sleepOpen: boolean;
  onToggleSleep: () => void;
  sleepMatches: ProximityMatch[];
  nearOpen: boolean;
  onToggleNear: () => void;
  nearMatches: ProximityMatch[];
  /** What proximity is measured from: "you" (GPS) or the last stop's name. */
  anchorLabel: string | null;
  /** Open the Add-place form (feature A). */
  onAddPlace: () => void;
  /** Open the offline Essentials panel (feature B5). */
  onEssentials: () => void;
  /** Total stops assigned across all trip days (for the progress strip). */
  totalPlanned: number;
  /** How many of those stops are marked done. */
  totalDone: number;
  /** Free-text memo for this day (empty string = none). */
  dayNote: string;
  onDayNote: (text: string) => void;
}

const gmaps = (p: PlaceWithOverride) => navUrl(p.lat, p.lng);


/** Render hint text with phone numbers (+XX ...) as tappable tel: links. */
function HintText({ text }: { text: string }) {
  const parts = text.split(/(\+\d[\d\s]{6,14}\d)/g);
  return (
    <span>
      {parts.map((part, i) =>
        /^\+\d[\d\s]{6,14}\d$/.test(part) ? (
          <a key={i} className="hint-tel" href={`tel:${part.replace(/\s/g, '')}`}>
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </span>
  );
}

function MatchCards({
  matches,
  empty,
  onSelect,
}: {
  matches: ProximityMatch[];
  empty: string;
  onSelect: (p: PlaceWithOverride) => void;
}) {
  if (matches.length === 0) return <p className="today-empty">{empty}</p>;
  return (
    <div className="today-cards">
      {matches.map(({ place: p, dist }) => {
        const booking = bookingFor(p.sources);
        return (
          <div key={p.id} className="corridor-card" onClick={() => onSelect(p)}>
            <div className="corridor-card-top">
              <span className="dot" style={{ background: CATEGORY_COLORS[p.category] }} />
              <span className="place-name">{p.name}</span>
              <span className="corridor-dist">{dist.toFixed(1)} km</span>
            </div>
            <div className="card-links">
              {booking && (
                <a
                  className={`card-book kind-${booking.kind}`}
                  href={booking.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {booking.label} ↗
                </a>
              )}
              <a
                className="today-nav-link"
                href={gmaps(p)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                Navigate ↗
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Today({
  day,
  realDay,
  onDay,
  stops,
  route,
  schedule,
  ferryFor,
  done,
  onToggleDone,
  onSkip,
  onSelect,
  kmFromGps,
  sleepOpen,
  onToggleSleep,
  sleepMatches,
  nearOpen,
  onToggleNear,
  nearMatches,
  anchorLabel,
  onAddPlace,
  onEssentials,
  totalPlanned,
  totalDone,
  dayNote,
  onDayNote,
}: Props) {
  const isToday = day === realDay;
  const preTrip = realDay === -1;
  const daysLeft = preTrip ? daysToTripStart() : 0;
  const todayDone = stops.filter((p) => done[p.id]).length;
  const nextIdx = isToday ? stops.findIndex((p) => !done[p.id]) : -1;
  const next = nextIdx >= 0 ? stops[nextIdx] : null;
  // When dayPoints includes a prepended overnight stop, route.legs has one extra
  // entry at index 0 (the morning relocation leg). Offset all leg lookups by 1
  // so we show the correct scheduled-stop-to-scheduled-stop leg time.
  const legOffset = stops.length > 0
    ? Math.max(0, (route?.legs?.length ?? 0) - Math.max(0, stops.length - 1))
    : 0;
  const nextLegSec =
    next && nextIdx > 0 ? route?.legs?.[nextIdx - 1 + legOffset]?.duration : undefined;
  const nextFerryH =
    next && nextIdx > 0 ? ferryFor(stops[nextIdx - 1].id, next.id) : 0;
  const nextGpsKm = next ? kmFromGps(next.lat, next.lng) : null;
  const scheduleOverSec = schedule?.overSec ?? 0;

  return (
    <div className="today">
      <div className="today-strip">
        <button className="today-arrow" disabled={day <= 1} onClick={() => onDay(day - 1)}>
          ◀
        </button>
        <div
          className="today-strip-label"
          onClick={() => realDay >= 1 && onDay(realDay)}
        >
          <strong>Day {day}</strong> · {dayDateLabel(day)}
          {isToday ? (
            <span className="today-badge">today</span>
          ) : realDay >= 1 ? (
            <span className="today-jump">tap for today</span>
          ) : daysLeft > 0 ? (
            <span className="today-countdown">{daysLeft}d to go</span>
          ) : null}
        </div>
        {realDay >= 1 && !isToday && (
          <button className="today-jump-btn" onClick={() => onDay(realDay)} title="Jump to today">
            Today
          </button>
        )}
        <button
          className="today-arrow"
          disabled={day >= TRIP_DAYS}
          onClick={() => onDay(day + 1)}
        >
          ▶
        </button>
      </div>

      {(stops.length > 0 || totalPlanned > 0) && (
        <div className="today-progress">
          {stops.length > 0 && (
            <span>Today {todayDone}/{stops.length} done</span>
          )}
          {totalPlanned > 0 && (
            <span className="today-progress-trip"> · trip {totalDone}/{totalPlanned}</span>
          )}
        </div>
      )}

      {preTrip && daysLeft > 0 && daysLeft <= 7 && (
        <button className="today-predep-banner" onClick={onEssentials}>
          ⚡ {daysLeft}d to go — pre-departure actions needed → tap to open Essentials
        </button>
      )}

      {(DAY_HINTS[day] || DAY_OPS[day]) && (
        <details className="today-notes">
          <summary>Day notes</summary>
          {DAY_HINTS[day] && (
            <div className="today-hint">
              <span className="today-hint-icon">{DAY_HINTS[day].icon}</span>
              <HintText text={DAY_HINTS[day].text} />
            </div>
          )}
          {DAY_OPS[day] && <div className="today-ops">{DAY_OPS[day]}</div>}
        </details>
      )}

      {isToday && stops.length > 0 && (
        <div className={`today-next ${scheduleOverSec > 0 ? 'late' : ''}`}>
          {next ? (
            <>
              <span className="today-next-label">Next →</span>{' '}
              <strong onClick={() => onSelect(next)}>{next.name}</strong>
              {nextLegSec != null && (
                <span className="today-next-eta">
                  {' '}
                  · {formatDuration(nextLegSec + nextFerryH * 3600)} drive
                  {nextFerryH > 0 ? ' ⛴' : ''}
                </span>
              )}
              {nextGpsKm != null && (
                <span className="today-next-eta"> · ~{Math.round(nextGpsKm)} km from you</span>
              )}
              <a
                className="today-nav-link"
                href={gmaps(next)}
                target="_blank"
                rel="noreferrer"
              >
                Navigate ↗
              </a>
              {stopHint(next.bestTime) && (
                <div className="today-next-hint">
                  <HintText text={stopHint(next.bestTime)} />
                </div>
              )}
            </>
          ) : (
            <span>All stops done 🎉</span>
          )}
        </div>
      )}

      {schedule && (
        <details className="today-clock">
          <summary>
            <span>Day clock</span>
            <span className={`today-clock-balance ${scheduleOverSec > 0 ? 'late' : 'slack'}`}>
              {scheduleOverSec > 0
                ? `Finish ${formatClock(schedule.finishSec)} · +${formatDuration(scheduleOverSec)} late`
                : `Finish ${formatClock(schedule.finishSec)} · ${formatDuration(schedule.slackSec)} slack`}
            </span>
          </summary>
          <div className="today-clock-body">
            <div className="today-clock-row">
              <span>Start {formatClock(schedule.dayStartSec)}</span>
              <span>Finish {formatClock(schedule.finishSec)}</span>
            </div>
            <div className="today-clock-row today-clock-small">
              <span>Drive {formatDuration(schedule.driveSec)}</span>
              <span>Stops {formatDuration(schedule.staySec)}</span>
              {schedule.ferrySec > 0 && <span>Ferry {formatDuration(schedule.ferrySec)}</span>}
            </div>
          </div>
        </details>
      )}

      {stops.length === 0 ? (
        <p className="today-empty">
          No stops planned for {isToday ? 'today' : 'this day'} — open the plan to assign some,
          or just use the map.
        </p>
      ) : (
        <ol className="today-stops">
          {stops.map((p, i) => {
            const isNext = isToday && i === nextIdx;
            const isDone = !!done[p.id];
            const legSec = i > 0 ? route?.legs?.[i - 1 + legOffset]?.duration : undefined;
            const ferryH = i > 0 ? ferryFor(stops[i - 1].id, p.id) : 0;
            const entry = schedule?.entries[i];
            return (
              <li key={p.id} className={isDone ? 'done' : isNext ? 'next' : ''}>
                {entry && (
                  <div className={`today-stop-time ${entry.source === 'override' ? 'override' : ''}`}>
                    {formatClock(entry.arriveSec)} → {formatClock(entry.departSec)} ·{' '}
                    {formatDuration(entry.staySec)}
                  </div>
                )}
                {i > 0 && (legSec != null || ferryH > 0) && (
                  <div className="today-leg">
                    ↓ {formatDuration((legSec ?? 0) + ferryH * 3600)}
                    {ferryH > 0 ? ' (incl ⛴)' : ''}
                  </div>
                )}
                <div className="today-stop">
                  <button
                    className={`today-check ${isDone ? 'on' : ''}`}
                    onClick={() => onToggleDone(p.id)}
                    title={isDone ? 'Mark not done' : 'Mark done'}
                  >
                    {isDone ? '✓' : i + 1}
                  </button>
                  <span className="today-stop-name" onClick={() => onSelect(p)}>
                    <span className="dot" style={{ background: CATEGORY_COLORS[p.category] }} />
                    {p.name}
                  </span>
                  <button className="today-skip" onClick={() => onSkip(p)}>
                    skip
                  </button>
                </div>
                {!isDone && stopHint(p.bestTime) && (
                  <div className="today-stop-hint">
                    <HintText text={stopHint(p.bestTime)} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className="today-note-row">
        <textarea
          className="today-note-area"
          placeholder="Day notes — things to remember, calls to make, cash needed…"
          value={dayNote}
          onChange={(e) => onDayNote(e.target.value)}
          rows={dayNote ? Math.min(6, dayNote.split('\n').length + 1) : 2}
        />
      </div>

      <div className="today-actions">
        <button className={`today-big-btn ${sleepOpen ? 'on' : ''}`} onClick={onToggleSleep}>
          🛏 Sleep tonight
        </button>
        <button className={`today-big-btn ${nearOpen ? 'on' : ''}`} onClick={onToggleNear}>
          📍 Near me
        </button>
      </div>
      <div className="today-actions">
        <button className="today-big-btn" onClick={onAddPlace}>
          ＋ Add place
        </button>
        <button className="today-big-btn" onClick={onEssentials}>
          🆘 Essentials
        </button>
      </div>
      {(sleepOpen || nearOpen) && anchorLabel && (
        <p className="today-anchor-note">
          distances from {anchorLabel === 'you' ? 'your GPS position' : anchorLabel}
        </p>
      )}
      {sleepOpen && (
        <MatchCards
          matches={sleepMatches}
          empty="No campsites or stays within 25 km. Try the map."
          onSelect={onSelect}
        />
      )}
      {nearOpen && (
        <MatchCards
          matches={nearMatches}
          empty="Nothing shortlist-worthy within 30 km."
          onSelect={onSelect}
        />
      )}
    </div>
  );
}
