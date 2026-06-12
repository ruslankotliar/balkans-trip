import { Suspense, lazy, useEffect, useState } from 'react';
import type { CommentRow, Tally, VoteValue } from '../collab';
import { CATEGORY_COLORS, COUNTRY_NAMES, STATUSES } from '../constants';
import { bookingLink, deriveLinks, navUrl } from '../links';
import type { PlaceWithOverride } from '../store';
import type { Status } from '../types';
import { estimateBaseStopMinutes, estimateStopMinutes, formatMinutes, parseDurationMinutes } from '../schedule';
import { DAYS, dayColor, dayDateLabel } from '../trip';

const CollabBlock = lazy(() => import('./CollabBlock'));

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
  // Collaboration (votes + comments)
  person: string | null;
  myVote: VoteValue | 0;
  tally: Tally | undefined;
  comments: CommentRow[];
  onNeedName: () => void;
  onVote: (vote: VoteValue) => void;
  onComment: (body: string) => void;
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
  person,
  myVote,
  tally,
  comments,
  onNeedName,
  onVote,
  onComment,
}: Props) {
  if (!place) return null;
  const p = place;
  const links = deriveLinks(p.sources);
  const booking = bookingLink(links);
  // The primary button lives at the top; don't repeat it in the chip list.
  const chipLinks = links.filter((l) => l !== booking);
  const [timeDraft, setTimeDraft] = useState('');
  const [timeMsg, setTimeMsg] = useState<string | null>(null);

  useEffect(() => {
    setTimeDraft(p.timeMinutes != null ? String(p.timeMinutes) : p.timeNeeded ?? '');
    setTimeMsg(null);
  }, [p.id, p.timeMinutes, p.timeNeeded]);

  function saveTimeDraft() {
    const raw = timeDraft.trim();
    if (!raw) {
      onTimeMinutes(p.id, null);
      setTimeMsg('Time estimate cleared');
      return;
    }
    const minutes = parseDurationMinutes(raw);
    if (minutes == null) {
      setTimeMsg('Use 45m, 1h 30m, 90, or half day');
      return;
    }
    onTimeMinutes(p.id, minutes);
    setTimeMsg(`Set to ${formatMinutes(minutes)}`);
  }

  const autoEstimate = estimateBaseStopMinutes(p);
  const activeEstimate = estimateStopMinutes(p);
  const activeEstimateSource =
    activeEstimate.source === 'override' ? 'manual' : activeEstimate.source;

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
        {p.rating ? ` · ${'★'.repeat(p.rating)}` : ''}
        {p.userAdded ? ' · ✎ added by you' : ''}
      </p>

      {/* ---- Above-the-fold actions: navigate + book (always reachable without scrolling) ---- */}
      <div className="detail-top-actions">
        <a className="detail-nav-btn" href={navUrl(p.lat, p.lng)} target="_blank" rel="noreferrer">
          🗺 Navigate
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

      {/* ---- Description: what it is + why it matters (most useful content on-road) ---- */}
      <p className="detail-desc">{p.description}</p>
      {p.communityNotes && <p className="community">"{p.communityNotes}"</p>}
      {p.bestTime && <p className="meta">Best time: <TelText text={p.bestTime} /></p>}
      {p.facilities && <p className="meta">Facilities: {p.facilities}</p>}
      {p.tags && p.tags.length > 0 && (
        <p className="tag-row">
          {p.tags.map((t) => (
            <span key={t} className="tag">
              #{t}
            </span>
          ))}
        </p>
      )}

      <details className="detail-time-box" open={!tripMode}>
        <summary>
          <span>Timing</span>
          <span className="detail-time-summary">
            {formatMinutes(activeEstimate.minutes)} · {activeEstimateSource}
            {p.timeMinutes != null && <span className="detail-time-note"> override active</span>}
          </span>
        </summary>
        <div className="detail-time-body">
          <div className="detail-time-row">
            <span className="detail-time-label">
              Auto: {formatMinutes(autoEstimate.minutes)}
            </span>
            <span className="detail-time-source">{activeEstimateSource}</span>
          </div>
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
                  setTimeMsg('Override cleared');
                }}
              >
                Reset
              </button>
            )}
          </div>
          <div className="detail-time-foot">
            Used by Today, Itinerary, and route previews to recalculate the clock.
          </div>
          {timeMsg && <div className="detail-time-msg">{timeMsg}</div>}
        </div>
      </details>

      {/* ---- Group votes (always visible); comments collapsed to save space ---- */}
      <Suspense fallback={<p className="loading-dot">Loading comments…</p>}>
        <CollabBlock
          placeId={p.id}
          person={person}
          myVote={myVote}
          tally={tally}
          comments={comments}
          onNeedName={onNeedName}
          onVote={onVote}
          onComment={onComment}
        />
      </Suspense>

      {/* ---- Planning / editing controls are tucked behind one disclosure. ---- */}
      <details className="detail-plan" open={!tripMode}>
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

          {!tripMode && (
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
          )}

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

      <div className="detail-links">
        {chipLinks.length > 0 && (
          <div className="link-chips">
            {chipLinks.map((l) => (
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
        <a className="nav-link" href={navUrl(p.lat, p.lng)} target="_blank" rel="noreferrer">
          Navigate ↗ <span className="nav-link-sub">(Google Maps)</span>
        </a>
      </div>
    </div>
  );
}
