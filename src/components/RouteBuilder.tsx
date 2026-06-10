import { CATEGORY_COLORS } from '../constants';
import type { PlaceWithOverride, TripResult } from '../store';
import { formatDistance, formatDuration } from '../trip';

interface Props {
  candidates: PlaceWithOverride[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAllShortlisted: () => void;
  onClearSelection: () => void;
  startId: string | null;
  endId: string | null;
  onStart: (id: string | null) => void;
  onEnd: (id: string | null) => void;
  onBuild: () => void;
  building: boolean;
  error: string | null;
  trip: TripResult | null;
  /** Input places aligned to trip.order indices. */
  tripPlaces: PlaceWithOverride[];
  maxHours: number;
  onMaxHours: (h: number) => void;
  onApplyToDays: () => void;
  daysNeeded: number | null;
  onFocus: (p: PlaceWithOverride) => void;
  onFindSleep: () => void;
}

export default function RouteBuilder({
  candidates,
  selectedIds,
  onToggleSelect,
  onSelectAllShortlisted,
  onClearSelection,
  startId,
  endId,
  onStart,
  onEnd,
  onBuild,
  building,
  error,
  trip,
  tripPlaces,
  maxHours,
  onMaxHours,
  onApplyToDays,
  daysNeeded,
  onFocus,
  onFindSleep,
}: Props) {
  const chosen = candidates.filter((p) => selectedIds.has(p.id));
  const ordered = trip ? trip.order.map((i) => tripPlaces[i]).filter(Boolean) : [];

  return (
    <div className="route-builder">
      <p className="rb-intro">
        Tick stops, pick a start &amp; end, then let OSRM solve the optimal driving order.
      </p>

      <div className="rb-shortcuts">
        <button onClick={onSelectAllShortlisted}>Select all shortlisted</button>
        <button onClick={onClearSelection} disabled={selectedIds.size === 0}>
          Clear ({selectedIds.size})
        </button>
      </div>

      {selectedIds.size >= 2 && (
        <div className="rb-endpoints">
          <label className="field-label">
            Start
            <select value={startId ?? ''} onChange={(e) => onStart(e.target.value || null)}>
              <option value="">auto (northernmost)</option>
              {chosen.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            End
            <select value={endId ?? ''} onChange={(e) => onEnd(e.target.value || null)}>
              <option value="">auto (southernmost)</option>
              {chosen.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <button
        className="rb-build"
        onClick={onBuild}
        disabled={selectedIds.size < 2 || building}
      >
        {building
          ? 'Solving…'
          : `Build optimal route (${selectedIds.size} stop${selectedIds.size === 1 ? '' : 's'})`}
      </button>
      {error && <p className="rb-error">{error}</p>}

      {trip && ordered.length > 0 && (
        <div className="rb-result">
          <div className="rb-summary">
            Optimal order · <strong>{formatDuration(trip.duration)}</strong> /{' '}
            {formatDistance(trip.distance)} total
          </div>
          <ol className="rb-stops">
            {ordered.map((p, i) => (
              <li key={p.id}>
                <div className="rb-stop" onClick={() => onFocus(p)}>
                  <span className="rb-num">{i + 1}</span>
                  <span
                    className="dot"
                    style={{ background: CATEGORY_COLORS[p.category] }}
                  />
                  <span className="place-name">{p.name}</span>
                </div>
                {i < ordered.length - 1 && trip.legs[i] && (
                  <div className="rb-leg">
                    ↓ {formatDuration(trip.legs[i].duration)} ·{' '}
                    {formatDistance(trip.legs[i].distance)}
                  </div>
                )}
              </li>
            ))}
          </ol>

          <div className="rb-apply">
            <label>
              Max driving / day: <strong>{maxHours}h</strong>
              <input
                type="range"
                min={1}
                max={8}
                step={0.5}
                value={maxHours}
                onChange={(e) => onMaxHours(Number(e.target.value))}
              />
            </label>
            <button className="rb-apply-btn" onClick={onApplyToDays}>
              Apply order to days
            </button>
            <button className="rb-corridor-btn" onClick={onFindSleep}>
              🛏 Find sleep along this route
            </button>
            {daysNeeded != null && (
              <p className={`rb-days-note ${daysNeeded > 13 ? 'warn' : ''}`}>
                {daysNeeded > 13
                  ? `⚠ Needs ${daysNeeded} days — more than the 13-day trip. Raise the limit or drop stops.`
                  : `Splits into ${daysNeeded} day${daysNeeded === 1 ? '' : 's'}.`}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="rb-list">
        {candidates.map((p) => (
          <label key={p.id} className={`rb-item ${selectedIds.has(p.id) ? 'on' : ''}`}>
            <input
              type="checkbox"
              checked={selectedIds.has(p.id)}
              onChange={() => onToggleSelect(p.id)}
            />
            <span className="dot" style={{ background: CATEGORY_COLORS[p.category] }} />
            <span className="place-name">{p.name}</span>
            <span className={`badge badge-${p.status}`}>{p.status}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
