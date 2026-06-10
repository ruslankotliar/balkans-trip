import { CATEGORY_COLORS, COUNTRY_NAMES, STATUSES } from '../constants';
import type { PlaceWithOverride } from '../store';
import type { Status } from '../types';
import { DAYS, dayColor, dayDateLabel } from '../trip';

interface Props {
  place: PlaceWithOverride | null;
  onClose: () => void;
  onStatus: (id: string, status: Status) => void;
  onAssignDay: (id: string, day: number | null) => void;
  onNote: (id: string, note: string) => void;
  // Nearby finder
  nearbyActive: boolean;
  nearbyRadius: number;
  nearbyCount: number;
  onToggleNearby: () => void;
  onNearbyRadius: (km: number) => void;
}

export default function DetailPanel({
  place,
  onClose,
  onStatus,
  onAssignDay,
  onNote,
  nearbyActive,
  nearbyRadius,
  nearbyCount,
  onToggleNearby,
  onNearbyRadius,
}: Props) {
  if (!place) return null;
  const p = place;

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
      </p>

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
        {p.sources && p.sources.length > 0 && (
          <span className="sources">
            Sources:{' '}
            {p.sources.map((s, i) => (
              <a key={s} href={s} target="_blank" rel="noreferrer">
                [{i + 1}]
              </a>
            ))}
          </span>
        )}
        <a
          href={`https://www.google.com/maps?q=${p.lat},${p.lng}`}
          target="_blank"
          rel="noreferrer"
        >
          Open in Google Maps ↗
        </a>
      </div>
    </div>
  );
}
