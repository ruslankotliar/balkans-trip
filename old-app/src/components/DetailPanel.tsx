import { useEffect, useState } from 'react';
import { CATEGORY_COLORS, COUNTRY_NAMES, LEG_MODES, STATUSES } from '../constants';
import { bookingLink, deriveLinks, navUrl } from '../links';
import { formatClock } from '../schedule';
import { restoredStatus, type PlaceWithOverride } from '../store';
import type { LegMode, Status } from '../types';
import { DAYS, dayColor, dayDateLabel } from '../trip';
import { normalizeText } from '../text';

interface Props {
  place: PlaceWithOverride | null;
  /** Straight-line km from the phone's last location fix, when there is one. */
  distanceKm?: number | null;
  onClose: () => void;
  onStatus: (id: string, status: Status) => void;
  onAssignDay: (id: string, day: number | null) => void;
  onFocusDay?: (day: number) => void;
  onTimeMinutes: (id: string, minutes: number | null) => void;
  /** Sets the fixed leg into this stop; null removes the user's leg. */
  onLeg: (id: string, leg: { minutes: number; mode: LegMode } | null) => void;
  /** The user set this stop's leg (a baked leg alone cannot be reset). */
  legOverridden: boolean;
  /** Minutes after midnight the stop starts at; null removes it. */
  onFixedStart: (id: string, minutes: number | null) => void;
  /** Set only for a stop the Plan list shows. */
  move?: { canUp: boolean; canDown: boolean };
  onMove: (id: string, dir: 'up' | 'down') => void;
  /** Toggle the ★ recommended-pick flag (tap the star by the title). */
  onPick: (id: string, pick: boolean) => void;
  /** Present only for user-added places: opens the edit form. */
  onEdit?: () => void;
  /** All options in the place's optionGroup (when it belongs to one). */
  groupOptions?: PlaceWithOverride[];
  /** Index of the currently shown option within groupOptions. */
  selectedGroupIdx?: number;
  /** Called when the user picks a different tab. */
  onGroupTabChange?: (idx: number) => void;
  /** Opens AddPlace pre-filled with this group ID so user can add a sibling option. */
  onAddOption?: (groupId: string) => void;
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
  distanceKm,
  onClose,
  onStatus,
  onAssignDay,
  onFocusDay,
  onTimeMinutes,
  onLeg,
  legOverridden,
  onFixedStart,
  move,
  onMove,
  onPick,
  onEdit,
  groupOptions,
  selectedGroupIdx = 0,
  onGroupTabChange,
  onAddOption,
}: Props) {
  // All hooks must run unconditionally (Rules of Hooks) — guard AFTER them.
  const [hoursDraft, setHoursDraft] = useState('');
  const [timeMsg, setTimeMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!place) return;
    setHoursDraft(place.timeMinutes != null ? String(place.timeMinutes / 60) : '');
    setTimeMsg(null);
  }, [place?.id, place?.timeMinutes]);

  const [legDraft, setLegDraft] = useState('');
  const [modeDraft, setModeDraft] = useState<LegMode>('walk');

  useEffect(() => {
    if (!place) return;
    setLegDraft(place.legMinutes != null ? String(place.legMinutes) : '');
    setModeDraft(place.legMode ?? 'walk');
  }, [place?.id, place?.legMinutes, place?.legMode, legOverridden]);

  const [atDraft, setAtDraft] = useState('');

  useEffect(() => {
    if (!place) return;
    setAtDraft(place.fixedStartMin != null ? formatClock(place.fixedStartMin * 60) : '');
  }, [place?.id, place?.fixedStartMin]);

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

  function saveLeg(mode: LegMode) {
    const stored = p.legMinutes != null ? String(p.legMinutes) : '';
    const raw = legDraft.trim();
    const min = Number(raw);
    if (!raw && legOverridden) onLeg(p.id, null);
    else if (raw && isFinite(min) && min >= 0) onLeg(p.id, { minutes: Math.round(min), mode });
    else setLegDraft(stored);
  }

  function saveAt() {
    const m = atDraft.match(/^(\d{2}):(\d{2})$/);
    if (m) onFixedStart(p.id, Number(m[1]) * 60 + Number(m[2]));
    else if (!atDraft && p.fixedStartMin != null) onFixedStart(p.id, null);
  }

  const optTabLabel = (opt: PlaceWithOverride) =>
    opt.optionTabLabel ?? opt.name.replace(/[—–(,].*/, '').trim().slice(0, 20);

  return (
    <div className="detail-panel">
      <button className="detail-close" onClick={onClose} title="Close">
        ✕
      </button>

      {(groupOptions && groupOptions.length > 1 || (place?.optionGroup && onAddOption)) && (
        <div className="detail-group-tabs-wrap">
          <div className="detail-group-tabs">
            {groupOptions?.map((opt, i) => (
              <button
                key={opt.id}
                type="button"
                className={`detail-group-tab${i === selectedGroupIdx ? ' active' : ''}`}
                onClick={() => onGroupTabChange?.(i)}
              >
                {optTabLabel(opt)}
              </button>
            ))}
            {place?.optionGroup && onAddOption && (
              <button
                type="button"
                className="detail-group-add"
                onClick={() => onAddOption(place.optionGroup!)}
                title="Add another option to this group"
              >
                +
              </button>
            )}
          </div>
        </div>
      )}

      <h2>
        <button
          type="button"
          className={`pick-toggle${p.pick ? ' on' : ''}`}
          onClick={() => onPick(p.id, !p.pick)}
          aria-pressed={p.pick ? 'true' : 'false'}
          title={p.pick ? 'Recommended pick — tap to remove the star' : 'Tap to star as a recommended pick'}
        >
          {p.pick ? '★' : '☆'}
        </button>
        {p.name}
      </h2>
      <p className="meta">
        <span className="dot" style={{ background: CATEGORY_COLORS[p.category] }} />
        {p.category} · {COUNTRY_NAMES[p.country]}
        {p.cost ? ` · ${p.cost}` : ''}
        {p.userAdded ? ' · ✎ added by you' : ''}
        {distanceKm != null && (
          <span className="detail-distance">
            {' '}· 📍 {distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km away
          </span>
        )}
      </p>

      {/* ---- Above-the-fold actions: navigate + book ---- */}
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

      {move && (
        <div className="detail-duration">
          <span className="field-label">Order in the day</span>
          <div className="detail-duration-row itin-stop-actions">
            <button type="button" disabled={!move.canUp} onClick={() => onMove(p.id, 'up')} title="Move earlier">
              ↑
            </button>
            <button type="button" disabled={!move.canDown} onClick={() => onMove(p.id, 'down')} title="Move later">
              ↓
            </button>
          </div>
        </div>
      )}

      {p.day != null && (
        <div className="detail-duration">
          <label className="field-label" htmlFor="leg-input">
            Getting here
          </label>
          <div className="detail-duration-row">
            <select
              className="time-input"
              aria-label="How you get here"
              value={modeDraft}
              onChange={(e) => {
                const mode = e.target.value as LegMode;
                setModeDraft(mode);
                if (legDraft.trim()) saveLeg(mode);
              }}
            >
              {LEG_MODES.map((m) => (
                <option key={m} value={m}>
                  {m === 'walk' ? 'on foot' : m}
                </option>
              ))}
            </select>
            <input
              id="leg-input"
              className="time-input"
              type="number"
              min="0"
              step="1"
              value={legDraft}
              onChange={(e) => setLegDraft(e.target.value)}
              onBlur={() => saveLeg(modeDraft)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
            <span className="detail-duration-unit">min</span>
            {legOverridden ? (
              <button type="button" className="itin-start-reset" onClick={() => onLeg(p.id, null)}>
                reset
              </button>
            ) : p.legMinutes == null ? (
              <span className="detail-duration-hint">empty = drive</span>
            ) : null}
          </div>
        </div>
      )}

      {p.day != null && (
        <div className="detail-duration">
          <label className="field-label" htmlFor="at-input">
            Starts at
          </label>
          <div className="detail-duration-row">
            <input
              id="at-input"
              className="time-input"
              type="time"
              value={atDraft}
              onChange={(e) => setAtDraft(e.target.value)}
              onBlur={saveAt}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
            {p.fixedStartMin != null ? (
              <button type="button" className="itin-start-reset" onClick={() => onFixedStart(p.id, null)}>
                clear
              </button>
            ) : (
              <span className="detail-duration-hint">empty = no fixed time</span>
            )}
          </div>
        </div>
      )}

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
        onClick={() => onStatus(p.id, p.status === 'rejected' ? restoredStatus(p) : 'rejected')}
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
