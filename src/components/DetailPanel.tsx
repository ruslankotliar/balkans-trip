import CollabBlock from './CollabBlock';
import type { CommentRow, Tally, VoteValue } from '../collab';
import { CATEGORY_COLORS, COUNTRY_NAMES, STATUSES } from '../constants';
import { bookingLink, deriveLinks, navUrl } from '../links';
import type { PlaceWithOverride } from '../store';
import type { Status } from '../types';
import { DAYS, dayColor, dayDateLabel } from '../trip';

interface Props {
  place: PlaceWithOverride | null;
  /** On-the-road mode: hide research vocabulary (statuses), bigger targets. */
  tripMode?: boolean;
  onClose: () => void;
  onStatus: (id: string, status: Status) => void;
  onAssignDay: (id: string, day: number | null) => void;
  onNote: (id: string, note: string) => void;
  /** Present only for user-added places: opens the edit form. */
  onEdit?: () => void;
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

export default function DetailPanel({
  place,
  tripMode = false,
  onClose,
  onStatus,
  onAssignDay,
  onNote,
  onEdit,
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
        {p.timeNeeded ? ` · ${p.timeNeeded}` : ''}
        {p.rating ? ` · ${'★'.repeat(p.rating)}` : ''}
        {p.userAdded ? ' · ✎ added by you' : ''}
      </p>

      {onEdit && (
        <button className="detail-edit" onClick={onEdit}>
          ✎ Edit / move / delete
        </button>
      )}

      {booking && (
        <a
          className={`book-btn kind-${booking.kind}`}
          href={booking.url}
          target="_blank"
          rel="noreferrer"
          title="Book / View listing"
        >
          {booking.kind === 'campsite' ? '⛺' : '🔖'} {booking.label} ↗
        </a>
      )}

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
        Trip day
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
      {p.day && (
        <span className="day-pill" style={{ background: dayColor(p.day) }}>
          Day {p.day}
        </span>
      )}

      <p className="detail-desc">{p.description}</p>
      {p.communityNotes && <p className="community">“{p.communityNotes}”</p>}
      {p.bestTime && <p className="meta">Best time: {p.bestTime}</p>}
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

      <label className="field-label">
        My note
        <textarea
          className="note-area"
          placeholder="Add a personal note…"
          value={p.note ?? ''}
          onChange={(e) => onNote(p.id, e.target.value)}
        />
      </label>

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
