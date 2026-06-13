import { useMemo, useState } from 'react';
import { CATEGORY_COLORS } from '../constants';
import type { PlaceWithOverride } from '../store';
import type { Country, Status } from '../types';

const COUNTRY_FLAG: Record<Country, string> = { HR: '🇭🇷', BA: '🇧🇦', ME: '🇲🇪' };
const COUNTRY_ORDER: Record<Country, number> = { HR: 0, BA: 1, ME: 2 };

type CountryF = Country | 'all';
const CATEGORY_PRIORITY: Record<string, number> = {
  activity: 0,
  hike: 0,
  nature: 0,
  sight: 0,
  viewpoint: 0,
  campsite: 1,
  accommodation: 1,
  beach: 2,
  food: 2,
  nightlife: 2,
  town: 2,
  other: 2,
};

interface Props {
  places: PlaceWithOverride[];
  onStatus: (id: string, status: Status) => void;
  onExit: () => void;
  onSelect: (p: PlaceWithOverride) => void;
  selectedId: string | null;
}

export default function Review({ places, onStatus, onExit, onSelect, selectedId }: Props) {
  const [country, setCountry] = useState<CountryF>('all');

  const queue = useMemo(
    () =>
      places
        .filter((p) => (p.status === 'candidate' || p.status === 'backup') && (country === 'all' || p.country === country))
        .sort((a, b) =>
          COUNTRY_ORDER[a.country] - COUNTRY_ORDER[b.country] ||
          CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category] ||
          a.name.localeCompare(b.name),
        ),
    [places, country],
  );

  const reviewCount = queue.length;

  return (
    <div className="triage-panel">
      <div className="triage-header">
        <span className="triage-title">Triage</span>
        <span className="triage-remaining">{reviewCount} to review</span>
        <button className="triage-close" onClick={onExit}>✕ Done</button>
      </div>

      <div className="triage-filters">
        <select value={country} onChange={(e) => setCountry(e.target.value as CountryF)}>
          <option value="all">All countries</option>
          <option value="HR">🇭🇷 Croatia</option>
          <option value="BA">🇧🇦 Bosnia</option>
          <option value="ME">🇲🇪 Montenegro</option>
        </select>
      </div>

      {queue.length === 0 ? (
        <div className="triage-empty">
          <p>All reviewed for this filter!</p>
          <button onClick={onExit}>← Back to places</button>
        </div>
      ) : (
        <ul className="triage-list">
          {queue.map((p) => (
            <li
              key={p.id}
              className={`triage-item${selectedId === p.id ? ' selected' : ''}${p.status === 'backup' ? ' triage-backup' : ''}`}
              onClick={() => onSelect(p)}
            >
              <div className="triage-item-row">
                <span className="triage-flag">{COUNTRY_FLAG[p.country]}</span>
                <span className="triage-dot" style={{ background: CATEGORY_COLORS[p.category] }} />
                <span className="triage-name">{p.name}</span>
                {p.rating && (
                  <span className="triage-stars">{'★'.repeat(p.rating)}</span>
                )}
              </div>
              {p.bestTime && (
                <p className="triage-time">{p.bestTime}</p>
              )}
              <p className="triage-desc">{p.description}</p>
              {p.communityNotes && (
                <blockquote className="triage-notes">{p.communityNotes.slice(0, 160)}{p.communityNotes.length > 160 ? '…' : ''}</blockquote>
              )}
              <div className="triage-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="triage-btn triage-shortlist"
                  onClick={() => onStatus(p.id, 'shortlist')}
                >
                  ✓ Shortlist
                </button>
                <button
                  className={`triage-btn triage-backup-btn ${p.status === 'backup' ? 'on' : ''}`}
                  onClick={() => onStatus(p.id, 'backup')}
                >
                  📋 Backup
                </button>
                <button
                  className="triage-btn triage-reject"
                  onClick={() => onStatus(p.id, 'rejected')}
                >
                  ✗ Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
