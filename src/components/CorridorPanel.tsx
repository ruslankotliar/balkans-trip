import { CATEGORY_COLORS } from '../constants';
import { bookingFor, navUrl } from '../links';
import type { PlaceWithOverride } from '../store';

export interface CorridorMatch {
  place: PlaceWithOverride;
  /** km from the route polyline */
  dist: number;
  /** index of the nearest stop-to-stop leg */
  leg: number;
}

interface Props {
  label: string;
  stops: PlaceWithOverride[];
  radius: number;
  onRadius: (km: number) => void;
  matches: CorridorMatch[];
  selectedId: string | null;
  onSelect: (p: PlaceWithOverride) => void;
  onClose: () => void;
}

function legLabel(stops: PlaceWithOverride[], leg: number): string {
  const a = stops[leg];
  const b = stops[leg + 1];
  if (!a) return 'Along route';
  if (!b) return `Near ${a.name}`;
  return `${a.name} → ${b.name}`;
}

export default function CorridorPanel({
  label,
  stops,
  radius,
  onRadius,
  matches,
  selectedId,
  onSelect,
  onClose,
}: Props) {
  // Group matches by leg, keeping leg order; sort each group by distance.
  const legs = new Map<number, CorridorMatch[]>();
  for (const m of matches) {
    (legs.get(m.leg) ?? legs.set(m.leg, []).get(m.leg)!).push(m);
  }
  const legKeys = [...legs.keys()].sort((a, b) => a - b);

  return (
    <div className="corridor-panel">
      <div className="corridor-head">
        <h3>🛏 Sleep along {label}</h3>
        <button className="corridor-back" onClick={onClose}>
          ← back
        </button>
      </div>

      <label className="corridor-slider">
        Within {radius} km of the route · {matches.length} found
        <input
          type="range"
          min={2}
          max={20}
          step={1}
          value={radius}
          onChange={(e) => onRadius(Number(e.target.value))}
        />
      </label>

      {matches.length === 0 ? (
        <p className="corridor-empty">
          No campsites or accommodation within {radius} km of this route. Widen the
          corridor, or add more stays in the data.
        </p>
      ) : (
        legKeys.map((leg) => {
          const items = legs.get(leg)!.sort((a, b) => a.dist - b.dist);
          return (
            <div key={leg} className="corridor-leg">
              <h4>{legLabel(stops, leg)}</h4>
              {items.map(({ place: p, dist }) => {
                const booking = bookingFor(p.sources);
                return (
                  <div
                    key={p.id}
                    className={`corridor-card ${selectedId === p.id ? 'selected' : ''}`}
                    onClick={() => onSelect(p)}
                  >
                    <div className="corridor-card-top">
                      <span
                        className="dot"
                        style={{ background: CATEGORY_COLORS[p.category] }}
                      />
                      <span className="place-name">{p.name}</span>
                      {p.rating ? <span>{'★'.repeat(p.rating)}</span> : null}
                      <span className="corridor-dist">{dist.toFixed(1)} km off</span>
                    </div>
                    {p.cost && <div className="corridor-cost">💶 {p.cost}</div>}
                    {p.facilities && <div className="corridor-fac">🚿 {p.facilities}</div>}
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
                        className="nav-link"
                        href={navUrl(p.lat, p.lng)}
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
        })
      )}
    </div>
  );
}
