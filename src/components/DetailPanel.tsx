import { useEffect, useState } from 'react';
import { CATEGORY_COLORS, COUNTRY_NAMES, STATUSES } from '../constants';
import { bookingLink, deriveLinks, navUrl } from '../links';
import type { PlaceWithOverride } from '../store';
import type { Status } from '../types';
import { parseDurationMinutes } from '../schedule';
import { DAYS, dayColor, dayDateLabel } from '../trip';
import { excerptText, normalizeText } from '../text';

interface Props {
  place: PlaceWithOverride | null;
  /** On-the-road mode: hide research vocabulary (statuses), bigger targets. */
  tripMode?: boolean;
  onClose: () => void;
  onStatus: (id: string, status: Status) => void;
  onAssignDay: (id: string, day: number | null) => void;
  onNote: (id: string, note: string) => void;
  onTimeMinutes: (id: string, minutes: number | null) => void;
  /** Present only for user-added places: opens the edit form. */
  onEdit?: () => void;
  /** Trip-mode: whether this place is marked visited. */
  isDone?: boolean;
  /** Trip-mode: toggle the visited state. */
  onToggleDone?: (id: string) => void;
  // Nearby finder
  nearbyActive: boolean;
  nearbyRadius: number;
  nearbyCount: number;
  onToggleNearby: () => void;
  onNearbyRadius: (km: number) => void;
}

/** Render inline phone numbers (+XX ...) as tappable tel: links. */
function TelText({ text }: { text: string }) {
  const parts = text.split(/(\+\d[\d\s]{6,14}\d)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^\+\d[\d\s]{6,14}\d$/.test(part) ? (
          <a key={i} className="hint-tel" href={`tel:${part.replace(/\s/g, '')}`}>
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default function DetailPanel({
  place,
  tripMode = false,
  onClose,
  onStatus,
  onAssignDay,
  onNote,
  onTimeMinutes,
  onEdit,
  isDone = false,
  onToggleDone,
  nearbyActive,
  nearbyRadius,
  nearbyCount,
  onToggleNearby,
  onNearbyRadius,
}: Props) {
  if (!place) return null;
  const p = place;
  const links = deriveLinks(p.sources);
  const booking = bookingLink(links);
  const [timeDraft, setTimeDraft] = useState('');
  const [timeMsg, setTimeMsg] = useState<string | null>(null);
  const description = normalizeText(p.description);
  const communityNotes = normalizeText(p.communityNotes);
  const summary = excerptText(description || communityNotes, 230);

  useEffect(() => {
    setTimeDraft(p.timeMinutes != null ? String(p.timeMinutes) : p.timeNeeded ?? '');
    setTimeMsg(null);
  }, [p.id, p.timeMinutes, p.timeNeeded]);

  function saveTimeDraft() {
    const raw = timeDraft.trim();
    if (!raw) {
      onTimeMinutes(p.id, null);
      setTimeMsg('Duration cleared');
      return;
    }
    const minutes = parseDurationMinutes(raw);
    if (minutes == null) {
      setTimeMsg('Use 45m, 1h 30m, 90, or half day');
      return;
    }
    onTimeMinutes(p.id, minutes);
    setTimeMsg('Duration saved');
  }

  return (
    <div className="detail-panel">
      <button className="detail-close" onClick={onClose} title="Close">
        ✕
      </button>
      <h2>{p.name}</h2>
      <p className="meta">
        <span className="dot" style={{ background: CATEGORY_COLORS[p.category] }} />
        {p.category} · {COUNTRY_NAMES[p.country]}
        {p.cost ? ` · ${p.cost}` : ''}
        {p.userAdded ? ' · ✎ added by you' : ''}
      </p>

      {/* ---- Above-the-fold actions: navigate + book (always reachable without scrolling) ---- */}
      <div className="detail-top-actions">
        <a className="detail-nav-btn" href={navUrl(p.lat, p.lng)} target="_blank" rel="noreferrer">
          🗺 Google Maps
        </a>
        {booking && (
          <a
            className={`book-btn kind-${booking.kind} detail-book-inline`}
            href={booking.url}
            target="_blank"
            rel="noreferrer"
            title="Book / View listing"
          >
            {booking.kind === 'campsite' ? '⛺' : '🔖'} {booking.label} ↗
          </a>
        )}
        {tripMode && onToggleDone && (
          <button
            className={`detail-visited-btn ${isDone ? 'on' : ''}`}
            onClick={() => onToggleDone(p.id)}
          >
            {isDone ? '✓ Visited' : 'Mark visited'}
          </button>
        )}
      </div>

      {links.filter((l) => l !== booking).length > 0 && (
        <div className="detail-source-links">
          {links
            .filter((l) => l !== booking)
            .map((l) => (
              <a
                key={l.url}
                className={`link-chip kind-${l.kind}`}
                href={l.url}
                target="_blank"
                rel="noreferrer"
              >
                {l.label} ↗
              </a>
            ))}
        </div>
      )}

      {/* ---- Short preview first; the full copy stays behind one disclosure. ---- */}
      {summary && (
        <p className="detail-desc">
          <span className="detail-desc-label">Quick take:</span> {summary}
        </p>
      )}
      {(description || communityNotes || p.bestTime || p.facilities) && (
        <details className="detail-facts">
          <summary>More details</summary>
          <div className="detail-facts-body">
            {description && <p className="detail-body-copy">{description}</p>}
            {communityNotes && <p className="community detail-body-copy">{communityNotes}</p>}
            {p.bestTime && (
              <p className="meta">
                Best time: <TelText text={p.bestTime} />
              </p>
            )}
            {p.facilities && <p className="meta">Facilities: {p.facilities}</p>}
          </div>
        </details>
      )}

      {!tripMode && (
        <>
          <details className="detail-time-box">
            <summary>
              <span>Duration</span>
              <span className="detail-time-summary">
                {p.timeMinutes != null ? 'manual' : 'set a duration'}
              </span>
            </summary>
            <div className="detail-time-body">
              <div className="detail-time-edit">
                <input
                  className="time-input"
                  type="text"
                  inputMode="text"
                  value={timeDraft}
                  onChange={(e) => setTimeDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveTimeDraft();
                    }
                  }}
                  placeholder="1h 30m, 45m, half day"
                />
                <button className="detail-time-set" onClick={saveTimeDraft}>
                  Set
                </button>
                {p.timeMinutes != null && (
                  <button
                    className="detail-time-clear"
                    onClick={() => {
                      onTimeMinutes(p.id, null);
                      setTimeDraft(p.timeNeeded ?? '');
                      setTimeMsg('Duration cleared');
                    }}
                  >
                    Reset
                    </button>
                )}
              </div>
              <div className="detail-time-foot">
                Manual duration used by Today and the plan.
              </div>
              {timeMsg && <div className="detail-time-msg">{timeMsg}</div>}
            </div>
          </details>

          {/* ---- Plan / editing controls are tucked behind one disclosure. ---- */}
          <details className="detail-plan" open>
            <summary>
              <span>Plan this place</span>
              <span className="detail-plan-summary">
                {p.status}
                {p.day ? ` · D${p.day}` : ' · unassigned'}
              </span>
            </summary>
            <div className="detail-plan-body">
              {onEdit && (
                <button className="detail-edit" onClick={onEdit}>
                  ✎ Edit / move / delete
                </button>
              )}

              <div className="status-buttons">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    className={p.status === s ? `on badge-${s}` : ''}
                    onClick={() => onStatus(p.id, s)}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <label className="field-label">
                {p.day ? (
                  <span>
                    Trip day{' '}
                    <span className="day-pill" style={{ background: dayColor(p.day) }}>
                      Day {p.day}
                    </span>
                  </span>
                ) : (
                  'Trip day'
                )}
                <select
                  value={p.day ?? ''}
                  onChange={(e) =>
                    onAssignDay(p.id, e.target.value === '' ? null : Number(e.target.value))
                  }
                >
                  <option value="">— unassigned —</option>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      Day {d} · {dayDateLabel(d)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-label">
                My note
                <textarea
                  className="note-area"
                  placeholder="Add a personal note…"
                  value={p.note ?? ''}
                  onChange={(e) => onNote(p.id, e.target.value)}
                />
              </label>
            </div>
          </details>
        </>
      )}

      {tripMode && (
        <div className="nearby-box">
          <button
            className={`nearby-toggle ${nearbyActive ? 'on' : ''}`}
            onClick={onToggleNearby}
          >
            {nearbyActive ? '✓ ' : ''}Find sleep nearby
          </button>
          {nearbyActive && (
            <div className="nearby-controls">
              <label>
                Within {nearbyRadius} km
                <input
                  type="range"
                  min={5}
                  max={30}
                  step={1}
                  value={nearbyRadius}
                  onChange={(e) => onNearbyRadius(Number(e.target.value))}
                />
              </label>
              <span className="nearby-count">
                {nearbyCount} campsite/stay{nearbyCount === 1 ? '' : 's'} within {nearbyRadius} km
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
