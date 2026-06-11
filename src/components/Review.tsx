import { useState } from 'react';
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet';
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
type CategoryGroup = 'all' | 'sleep' | 'accommodation' | 'campsite' | 'activity' | 'eat' | 'nature';

interface Props {
  places: PlaceWithOverride[];
  onStatus: (id: string, status: Status) => void;
  onExit: () => void;
  onShowOnMap: (p: PlaceWithOverride) => void;
}

export default function Review({ places, onStatus, onExit }: Props) {
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('all');
  const [statusQueue, setStatusQueue] = useState<StatusQueue>('candidates');
  const [categoryGroup, setCategoryGroup] = useState<CategoryGroup>('accommodation');
  const [index, setIndex] = useState(0);

  const CAT_GROUP: Record<CategoryGroup, (c: string) => boolean> = {
    all: () => true,
    sleep: (c) => c === 'accommodation' || c === 'campsite',
    accommodation: (c) => c === 'accommodation',
    campsite: (c) => c === 'campsite',
    activity: (c) => c === 'activity' || c === 'hike' || c === 'beach',
    eat: (c) => c === 'food' || c === 'nightlife',
    nature: (c) => c === 'nature' || c === 'sight' || c === 'viewpoint' || c === 'town',
  };

  const queue = places.filter((p) => {
    if (p.status === 'rejected') return false;
    if (countryFilter !== 'all' && p.country !== countryFilter) return false;
    if (!CAT_GROUP[categoryGroup](p.category)) return false;
    if (statusQueue === 'candidates') return p.status === 'candidate';
    if (statusQueue === 'backup') return p.status === 'backup';
    return p.status === 'candidate' || p.status === 'backup';
  });

  const total = queue.length;
  const clampedIndex = Math.min(index, Math.max(0, total - 1));
  const place = queue[clampedIndex] ?? null;

  function advance() {
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
      {/* LEFT PANEL: filters + card */}
      <div className="review-left">
        <div className="review-header">
          <button className="review-exit" onClick={onExit}>
            ✕ Exit
          </button>
          <div className="review-filters">
            <select
              value={categoryGroup}
              onChange={(e) => { setCategoryGroup(e.target.value as CategoryGroup); handleFilterChange(); }}
            >
              <option value="accommodation">🛏 Accommodation</option>
              <option value="campsite">⛺ Campsites</option>
              <option value="sleep">🛌 Sleep (both)</option>
              <option value="activity">🏄 Activities</option>
              <option value="eat">🍽 Food / Nightlife</option>
              <option value="nature">🏛 Sights / Towns</option>
              <option value="all">All</option>
            </select>
            <select
              value={countryFilter}
              onChange={(e) => { setCountryFilter(e.target.value as CountryFilter); handleFilterChange(); }}
            >
              <option value="all">All countries</option>
              <option value="HR">🇭🇷 Croatia</option>
              <option value="BA">🇧🇦 Bosnia</option>
              <option value="ME">🇲🇪 Montenegro</option>
            </select>
            <select
              value={statusQueue}
              onChange={(e) => { setStatusQueue(e.target.value as StatusQueue); handleFilterChange(); }}
            >
              <option value="candidates">Candidates</option>
              <option value="backup">Backup</option>
              <option value="all">All non-rejected</option>
            </select>
          </div>
        </div>

        <div className="review-body">
          {total === 0 ? (
            <div className="review-done">
              <p>All {queueLabel} reviewed{countryFilter !== 'all' ? ` for ${countryFilter}` : ''}!</p>
              <button className="review-exit-btn" onClick={onExit}>Back to map</button>
            </div>
          ) : (
            <>
              <div className="review-progress">
                {clampedIndex > 0 && (
                  <button className="review-back" onClick={handleBack}>← Back</button>
                )}
                <span className="review-counter">{clampedIndex + 1} / {total} {queueLabel}</span>
              </div>

              {place && (
                <div className="review-card">
                  <div className="review-card-title">
                    <span className="review-flag">{COUNTRY_FLAG[place.country]}</span>
                    <h2>{place.name}</h2>
                    <span className="review-cat-badge" style={{ background: CATEGORY_COLORS[place.category] }}>
                      {place.category}
                    </span>
                  </div>

                  {place.sources && place.sources[0] && (
                    <div className="review-links">
                      <a className="review-listing-link" href={place.sources[0]} target="_blank" rel="noopener noreferrer">
                        Open listing ↗
                      </a>
                    </div>
                  )}

                  {place.rating && (
                    <p className="review-rating">{'★'.repeat(place.rating)}{'☆'.repeat(5 - place.rating)}</p>
                  )}

                  {(place.cost || place.timeNeeded || place.bestTime) && (
                    <p className="review-meta">
                      {place.cost && <span>💶 {place.cost}</span>}
                      {place.cost && place.timeNeeded && ' · '}
                      {place.timeNeeded && <span>⏱ {place.timeNeeded}</span>}
                      {(place.cost || place.timeNeeded) && place.bestTime && ' · '}
                      {place.bestTime && <span>🕐 {place.bestTime}</span>}
                    </p>
                  )}

                  {place.facilities && (
                    <p className="review-facilities">🚿 {place.facilities}</p>
                  )}

                  {place.tags && place.tags.length > 0 && (() => {
                    const PRIORITY_TAGS: Record<string, string> = {
                      'book-ahead': '📅 book ahead',
                      'full-day': '🕐 full day',
                      'off-route': '🔀 off-route',
                      'hard-hike': '⛰ hard hike',
                      'monday-only': '📅 monday only',
                      'coord-approx': '📍 coords approx',
                      'user-saved': '📌 user saved',
                      'deep-south': '🔽 deep south',
                    };
                    const shown = place.tags!.filter(t => PRIORITY_TAGS[t]);
                    return shown.length > 0 ? (
                      <div className="review-tags">
                        {shown.map(t => <span key={t} className="review-tag">{PRIORITY_TAGS[t]}</span>)}
                      </div>
                    ) : null;
                  })()}

                  <p className="review-desc">{place.description}</p>

                  {place.communityNotes && (
                    <blockquote className="review-community">"{place.communityNotes}"</blockquote>
                  )}

                  <div className="review-actions">
                    <button className="review-btn review-shortlist" onClick={handleShortlist}>✓ Shortlist</button>
                    <button className="review-btn review-skip" onClick={handleSkip}>Skip</button>
                    <button className="review-btn review-reject" onClick={handleReject}>✗ Reject</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: full map */}
      {place ? (
        <MapContainer
          key={place.id}
          className="review-map-full"
          center={[place.lat, place.lng]}
          zoom={10}
          scrollWheelZoom
          zoomControl
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <CircleMarker
            center={[place.lat, place.lng]}
            radius={12}
            pathOptions={{ color: '#fff', weight: 3, fillColor: CATEGORY_COLORS[place.category], fillOpacity: 1 }}
          />
        </MapContainer>
      ) : (
        <div className="review-map-full review-map-empty" />
      )}
    </div>
  );
}
