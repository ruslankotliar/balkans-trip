import { useEffect, useState } from 'react';
import { CATEGORY_COLORS, COUNTRY_NAMES, STATUSES } from '../constants';
import { bookingLink, deriveLinks, navUrl } from '../links';
import type { PlaceWithOverride } from '../store';
import type { Status } from '../types';
import { DAYS, dayColor, dayDateLabel } from '../trip';
import { normalizeText } from '../text';

interface Props {
  place: PlaceWithOverride | null;
  onClose: () => void;
  onStatus: (id: string, status: Status) => void;
  onAssignDay: (id: string, day: number | null) => void;
  onFocusDay?: (day: number) => void;
  onTimeMinutes: (id: string, minutes: number | null) => void;
  /** Present only for user-added places: opens the edit form. */
  onEdit?: () => void;
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
  onClose,
  onStatus,
  onAssignDay,
  onFocusDay,
  onTimeMinutes,
  onEdit,
}: Props) {
  // All hooks must run unconditionally (Rules of Hooks) — guard AFTER them.
  const [hoursDraft, setHoursDraft] = useState('');
  const [timeMsg, setTimeMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!place) return;
    setHoursDraft(place.timeMinutes != null ? String(place.timeMinutes / 60) : '');
    setTimeMsg(null);
  }, [place?.id, place?.timeMinutes]);

  if (!place) return null;
  const p = place;
  const links = deriveLinks(p.sources);
  const booking = bookingLink(links);
  const sourceLinks = links.filter((l) => l !== booking);
  const description = normalizeText(p.description);
  const communityNotes = normalizeText(p.communityNotes);

  function saveHours() {
    const raw = hoursDraft.trim().replace(',', '.');
    if (!raw) {
      onTimeMinutes(p.id, null);
      setTimeMsg('cleared');
      return;
    }
    const hrs = Number(raw);
    if (!isFinite(hrs) || hrs < 0) {
      setTimeMsg('enter a number of hours');
      return;
    }
    onTimeMinutes(p.id, Math.round(hrs * 60));
    setTimeMsg('saved');
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

      {/* ---- Above-the-fold actions: navigate + book ---- */}
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
      </div>

      {sourceLinks.length > 0 && (
        <div className="detail-source-links">
          {sourceLinks.map((l) => (
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

      {/* ---- All the info, shown inline (nothing hidden behind a click) ---- */}
      {description && <p className="detail-body-copy">{description}</p>}
      {communityNotes && <p className="community detail-body-copy">{communityNotes}</p>}
      {p.bestTime && (
        <p className="meta">
          🕑 <TelText text={p.bestTime} />
        </p>
      )}
      {p.facilities && <p className="meta">🚿 {p.facilities}</p>}

      {/* ---- Duration: plain hours number ---- */}
      <div className="detail-duration">
        <label className="field-label" htmlFor="dur-input">
          Hours here
        </label>
        <div className="detail-duration-row">
          <input
            id="dur-input"
            className="time-input"
            type="number"
            min="0"
            step="0.25"
            value={hoursDraft}
            onChange={(e) => setHoursDraft(e.target.value)}
            onBlur={saveHours}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="e.g. 2"
          />
          <span className="detail-duration-unit">h</span>
          {timeMsg ? (
            <span className="detail-duration-msg">{timeMsg}</span>
          ) : p.timeNeeded ? (
            <span className="detail-duration-hint">suggested: {p.timeNeeded}</span>
          ) : null}
        </div>
      </div>

      {/* ---- Planning controls: 4 primary statuses; reject is a small link ---- */}
      <div className="status-buttons">
        {STATUSES.filter((s) => s !== 'rejected').map((s) => (
          <button
            key={s}
            className={p.status === s ? `on badge-${s}` : ''}
            onClick={() => onStatus(p.id, s)}
          >
            {s}
          </button>
        ))}
      </div>
      <button
        className={`detail-reject ${p.status === 'rejected' ? 'on' : ''}`}
        onClick={() => onStatus(p.id, p.status === 'rejected' ? 'candidate' : 'rejected')}
      >
        {p.status === 'rejected' ? '↩ rejected — tap to restore' : '✕ reject this place'}
      </button>

      <label className="field-label">
        {p.day ? (
          <span>
            Day{' '}
            <span className="day-pill" style={{ background: dayColor(p.day) }}>
              Day {p.day}
            </span>
          </span>
        ) : (
          'Day'
        )}
        <select
          value={p.day ?? ''}
          onChange={(e) => {
            const nextDay = e.target.value === '' ? null : Number(e.target.value);
            onAssignDay(p.id, nextDay);
            if (nextDay != null) onFocusDay?.(nextDay);
          }}
        >
          <option value="">— not in the plan —</option>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              Day {d} · {dayDateLabel(d)}
            </option>
          ))}
        </select>
      </label>

      {onEdit && (
        <button className="detail-edit" onClick={onEdit}>
          ✎ Edit / move / delete
        </button>
      )}
    </div>
  );
}
