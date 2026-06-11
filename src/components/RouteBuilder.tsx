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
  /** User-pinned ordered anchors (visited in this order between start and end). */
  anchorIds: string[];
  onToggleAnchor: (id: string) => void;
  onMoveAnchor: (id: string, dir: 'up' | 'down') => void;
  onBuild: () => void;
  building: boolean;
  error: string | null;
  trip: TripResult | null;
  /** Input places aligned to trip.order indices. */
  tripPlaces: PlaceWithOverride[];
  /** Manual ferry hours for the leg between two places (0 = none). */
  getLegFerry: (idA: string, idB: string) => number;
  onSetLegFerry: (idA: string, idB: string, hours: number) => void;
  maxHours: number;
  onMaxHours: (h: number) => void;
  onApplyToDays: () => void;
  split: { days: number; overDays: { day: number; sec: number }[] } | null;
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
  anchorIds,
  onToggleAnchor,
  onMoveAnchor,
  onBuild,
  building,
  error,
  trip,
  tripPlaces,
  getLegFerry,
  onSetLegFerry,
  maxHours,
  onMaxHours,
  onApplyToDays,
  split,
  onFocus,
  onFindSleep,
}: Props) {
  const chosen = candidates.filter((p) => selectedIds.has(p.id));
  const byId = new Map(candidates.map((p) => [p.id, p]));
  const anchors = anchorIds.map((id) => byId.get(id)).filter(Boolean) as PlaceWithOverride[];
  const shortlistedCount = candidates.filter((p) => p.status === 'shortlist').length;

  // Sort candidates: shortlisted first, then backup, then others — each group by rating desc.
  const STATUS_ORDER: Record<string, number> = { shortlist: 0, backup: 1, candidate: 2, rejected: 3 };
  const sortedCandidates = [...candidates].sort((a, b) => {
    const sd = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    return sd !== 0 ? sd : (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name);
  });
  const ordered = trip
    ? (trip.order.map((i) => tripPlaces[i]).filter(Boolean) as PlaceWithOverride[])
    : [];

  // Totals incl. manual ferry hours.
  const ferryTotalSec = ordered
    .slice(0, -1)
    .reduce((s, p, i) => s + getLegFerry(p.id, ordered[i + 1].id) * 3600, 0);

  // Per-segment totals (when anchors split the route).
  const segStarts = trip?.segStarts ?? [0];
  const segments =
    trip && segStarts.length > 1
      ? segStarts.map((startPos, s) => {
          const endPos = segStarts[s + 1] ?? ordered.length - 1;
          let sec = 0;
          for (let i = startPos; i < endPos; i++) {
            sec += (trip.legs[i]?.duration ?? 0) + getLegFerry(ordered[i].id, ordered[i + 1].id) * 3600;
          }
          return { from: ordered[startPos], to: ordered[endPos], sec };
        })
      : [];

  const methodLabel = trip ? trip.method ?? 'OSRM /trip heuristic (rebuild for exact solve)' : '';

  return (
    <div className="route-builder">
      <p className="rb-intro">
        Tick stops below → set start &amp; end → <strong>Build route</strong>. Solves optimal
        driving order (exact for ≤13). 📌 pins an ordered anchor.
      </p>

      <div className="rb-shortcuts">
        <button className="rb-select-all" onClick={onSelectAllShortlisted} disabled={shortlistedCount === 0}>
          ⭐ Select all shortlisted ({shortlistedCount})
        </button>
        <button onClick={onClearSelection} disabled={selectedIds.size === 0}>
          Clear ({selectedIds.size})
        </button>
      </div>

      {selectedIds.size > 0 && (
        <p className="rb-sel-count">{selectedIds.size} stop{selectedIds.size !== 1 ? 's' : ''} selected — need ≥2 to build</p>
      )}

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

      {anchors.length > 0 && (
        <div className="rb-anchors">
          <h4>📌 Anchors — visited in this order</h4>
          <ol>
            {anchors.map((p, i) => (
              <li key={p.id}>
                <span className="place-name">{p.name}</span>
                <span className="itin-actions">
                  <button disabled={i === 0} onClick={() => onMoveAnchor(p.id, 'up')} title="Earlier">
                    ↑
                  </button>
                  <button
                    disabled={i === anchors.length - 1}
                    onClick={() => onMoveAnchor(p.id, 'down')}
                    title="Later"
                  >
                    ↓
                  </button>
                  <button onClick={() => onToggleAnchor(p.id)} title="Unpin">
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ol>
          <p className="rb-anchor-hint">
            Free stops are routed into the best segment between anchors; each segment is
            optimized on its own.
          </p>
        </div>
      )}

      <button className="rb-build" onClick={onBuild} disabled={selectedIds.size < 2 || building}>
        {building
          ? 'Solving…'
          : `Build optimal route (${selectedIds.size} stop${selectedIds.size === 1 ? '' : 's'})`}
      </button>
      {error && <p className="rb-error">{error}</p>}

      {trip && ordered.length > 0 && (
        <div className="rb-result">
          <div className="rb-summary">
            <span className={`rb-method ${trip.exact ? 'exact' : 'heur'}`}>
              {trip.exact ? '✓ ' : '~ '}
              {methodLabel}
            </span>
            <br />
            <strong>{formatDuration(trip.duration + ferryTotalSec)}</strong>
            {ferryTotalSec > 0 && (
              <span className="rb-ferry-note">
                {' '}
                (incl. ⛴ {formatDuration(ferryTotalSec)})
              </span>
            )}{' '}
            / {formatDistance(trip.distance)} total
          </div>

          {segments.length > 1 && (
            <ul className="rb-segments">
              {segments.map((s, i) => (
                <li key={i}>
                  {s.from?.name} → {s.to?.name} · {formatDuration(s.sec)}
                </li>
              ))}
            </ul>
          )}

          <ol className="rb-stops">
            {ordered.map((p, i) => {
              const next = ordered[i + 1];
              const ferry = next ? getLegFerry(p.id, next.id) : 0;
              const isAnchor = segStarts.includes(i) || i === ordered.length - 1;
              return (
                <li key={p.id}>
                  <div className="rb-stop" onClick={() => onFocus(p)}>
                    <span className="rb-num">{i + 1}</span>
                    <span className="dot" style={{ background: CATEGORY_COLORS[p.category] }} />
                    <span className="place-name">{p.name}</span>
                    {isAnchor && segStarts.length > 1 && <span title="Anchor">📌</span>}
                  </div>
                  {next && trip.legs[i] && (
                    <div className="rb-leg">
                      ↓ {formatDuration(trip.legs[i].duration + ferry * 3600)} ·{' '}
                      {formatDistance(trip.legs[i].distance)}
                      {ferry > 0 && <span className="rb-ferry-note"> · incl ⛴ {ferry}h</span>}
                      <label className="rb-ferry" onClick={(e) => e.stopPropagation()}>
                        ⛴
                        <input
                          type="number"
                          min={0}
                          max={12}
                          step={0.5}
                          value={ferry || ''}
                          placeholder="0"
                          onChange={(e) => onSetLegFerry(p.id, next.id, Number(e.target.value))}
                        />
                        h
                      </label>
                    </div>
                  )}
                </li>
              );
            })}
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
            {split && (
              <p className={`rb-days-note ${split.days > 13 ? 'warn' : ''}`}>
                {split.days > 13
                  ? `⚠ Needs ${split.days} days — more than the 13-day trip. Raise the limit or drop stops.`
                  : `Splits into ${split.days} day${split.days === 1 ? '' : 's'}.`}
              </p>
            )}
            {split?.overDays.map((d) => (
              <p key={d.day} className="rb-days-note warn">
                ⚠ Day {d.day} has {formatDuration(d.sec)} driving — over the {maxHours}h/day
                limit (a single leg exceeds it).
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="rb-list">
        {sortedCandidates.map((p, i) => {
          const prevStatus = i > 0 ? sortedCandidates[i - 1].status : null;
          const showGroupHeader = p.status !== prevStatus;
          const groupLabel =
            p.status === 'shortlist' ? '⭐ Shortlisted' :
            p.status === 'backup' ? '📋 Backup' :
            p.status === 'candidate' ? '🔍 Candidates' : p.status;
          return (
            <div key={p.id}>
              {showGroupHeader && (
                <div className="rb-group-label">{groupLabel}</div>
              )}
              <label className={`rb-item ${selectedIds.has(p.id) ? 'on' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(p.id)}
                  onChange={() => onToggleSelect(p.id)}
                />
                <span className="dot" style={{ background: CATEGORY_COLORS[p.category] }} />
                <span className="place-name">{p.name}</span>
                {selectedIds.has(p.id) && (
                  <button
                    className={`rb-pin ${anchorIds.includes(p.id) ? 'on' : ''}`}
                    title={anchorIds.includes(p.id) ? 'Unpin anchor' : 'Pin as ordered anchor'}
                    onClick={(e) => {
                      e.preventDefault();
                      onToggleAnchor(p.id);
                    }}
                  >
                    📌
                  </button>
                )}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
