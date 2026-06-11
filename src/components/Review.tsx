import { useState } from 'react';
import { CATEGORY_COLORS } from '../constants';
import type { PlaceWithOverride } from '../store';
import type { Country, Status } from '../types';

const COUNTRY_FLAG: Record<Country, string> = {
  HR: '🇭🇷',
  BA: '🇧🇦',
  ME: '🇲🇪',
};

type CountryFilter = Country | 'all';
type StatusQueue = 'candidates' | 'backup' | 'all';

interface Props {
  places: PlaceWithOverride[];
  onStatus: (id: string, status: Status) => void;
  onExit: () => void;
}

export default function Review({ places, onStatus, onExit }: Props) {
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('all');
  const [statusQueue, setStatusQueue] = useState<StatusQueue>('candidates');
  const [index, setIndex] = useState(0);

  // Build queue based on filters
  const queue = places.filter((p) => {
    if (p.status === 'rejected') return false;
    if (countryFilter !== 'all' && p.country !== countryFilter) return false;
    if (statusQueue === 'candidates') return p.status === 'candidate';
    if (statusQueue === 'backup') return p.status === 'backup';
    // 'all' = candidates + backup (non-shortlisted, non-rejected)
    return p.status === 'candidate' || p.status === 'backup';
  });

  const total = queue.length;
  const clampedIndex = Math.min(index, Math.max(0, total - 1));
  const place = queue[clampedIndex] ?? null;

  function advance() {
    // If we just acted on the last item, stay at the same index (which will
    // now point to the next place, or show "done" if the queue is exhausted).
    setIndex((i) => Math.min(i, total - 2 < 0 ? 0 : total - 2));
  }

  function handleShortlist() {
    if (!place) return;
    onStatus(place.id, 'shortlist');
    advance();
  }

  function handleSkip() {
    if (!place) return;
    setIndex((i) => (i + 1 < total ? i + 1 : i));
  }

  function handleReject() {
    if (!place) return;
    onStatus(place.id, 'rejected');
    advance();
  }

  function handleBack() {
    setIndex((i) => Math.max(0, i - 1));
  }

  function handleFilterChange() {
    // Reset index when filters change to avoid out-of-bounds
    setIndex(0);
  }

  const queueLabel =
    statusQueue === 'candidates'
      ? 'candidates'
      : statusQueue === 'backup'
        ? 'backup'
        : 'non-shortlisted';

  return (
    <div className="review-overlay">
      {/* Header + filters */}
      <div className="review-header">
        <button className="review-exit" onClick={onExit}>
          ✕ Exit review
        </button>
        <div className="review-filters">
          <select
            value={countryFilter}
            onChange={(e) => {
              setCountryFilter(e.target.value as CountryFilter);
              handleFilterChange();
            }}
          >
            <option value="all">All countries</option>
            <option value="HR">🇭🇷 Croatia</option>
            <option value="BA">🇧🇦 Bosnia</option>
            <option value="ME">🇲🇪 Montenegro</option>
          </select>
          <select
            value={statusQueue}
            onChange={(e) => {
              setStatusQueue(e.target.value as StatusQueue);
              handleFilterChange();
            }}
          >
            <option value="candidates">Candidates</option>
            <option value="backup">Backup</option>
            <option value="all">All non-rejected</option>
          </select>
        </div>
      </div>

      {/* Card area */}
      <div className="review-body">
        {total === 0 ? (
          <div className="review-done">
            <p>All {queueLabel} reviewed{countryFilter !== 'all' ? ` for ${countryFilter}` : ''}!</p>
            <button className="review-exit-btn" onClick={onExit}>
              Back to map
            </button>
          </div>
        ) : (
          <>
            <div className="review-progress">
              {clampedIndex > 0 && (
                <button className="review-back" onClick={handleBack}>
                  ← Back
                </button>
              )}
              <span className="review-counter">
                {clampedIndex + 1} / {total} {queueLabel}
              </span>
            </div>

            {place && (
              <div className="review-card">
                <div className="review-card-title">
                  <span className="review-flag">{COUNTRY_FLAG[place.country]}</span>
                  <h2>{place.name}</h2>
                  <span
                    className="review-cat-badge"
                    style={{ background: CATEGORY_COLORS[place.category] }}
                  >
                    {place.category}
                  </span>
                </div>

                {place.rating && (
                  <p className="review-rating">{'★'.repeat(place.rating)}{'☆'.repeat(5 - place.rating)}</p>
                )}

                {(place.cost || place.timeNeeded) && (
                  <p className="review-meta">
                    {place.cost && <span>💶 {place.cost}</span>}
                    {place.cost && place.timeNeeded && ' · '}
                    {place.timeNeeded && <span>⏱ {place.timeNeeded}</span>}
                  </p>
                )}

                <p className="review-desc">{place.description}</p>

                {place.communityNotes && (
                  <blockquote className="review-community">"{place.communityNotes}"</blockquote>
                )}

                <div className="review-actions">
                  <button className="review-btn review-shortlist" onClick={handleShortlist}>
                    ✓ Shortlist
                  </button>
                  <button className="review-btn review-skip" onClick={handleSkip}>
                    Skip
                  </button>
                  <button className="review-btn review-reject" onClick={handleReject}>
                    ✗ Reject
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
