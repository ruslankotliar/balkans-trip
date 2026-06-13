/**
 * Add-place form (feature A) — Google Maps link first, with map tap and raw
 * coordinates as fallback inputs. Used for BOTH adding a new user place and
 * EDITING an existing one. Storage + merge live in App; this is just the form
 * + the three coordinate parsers.
 */
import { useEffect, useState } from 'react';
import { CATEGORY_COLORS } from '../constants';
import { DAYS, dayDateLabel } from '../trip';
import type { Category, Place } from '../types';

/** Mode 2: parse a pasted "lat, lng" (tolerates "," ", " or " " separators). */
export function parseLatLng(input: string): [number, number] | null {
  const m = input
    .trim()
    .match(/^(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = +m[1];
  const lng = +m[2];
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

/** True for goo.gl / maps.app.goo.gl SHORT links (no inline coordinates). */
export function isShortMapsLink(url: string): boolean {
  return /(?:^|\/\/)(?:[a-z.]*\.)?goo\.gl\//i.test(url) || /maps\.app\.goo\.gl/i.test(url);
}

export interface ParsedUrl {
  coords: [number, number] | null;
  /** A name lifted from /place/<Name>/ in the path, if any. */
  name?: string;
  /** Set when the input is a short link we cannot resolve offline. */
  short?: boolean;
}

/**
 * Mode 3: parse an EXPANDED Google Maps URL, client-side & offline. Prefers the
 * place's true !3d<lat>!4d<lng> over the viewport-center @lat,lng. Short links
 * (goo.gl) carry no coordinates → flagged so the UI can instruct the user.
 */
export function parseMapsUrl(url: string): ParsedUrl {
  const trimmed = url.trim();
  if (isShortMapsLink(trimmed)) return { coords: null, short: true };
  const d = trimmed.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  const at = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const coords: [number, number] | null = d
    ? [+d[1], +d[2]]
    : at
      ? [+at[1], +at[2]]
      : null;
  let name: string | undefined;
  const pm = trimmed.match(/\/place\/([^/@]+)/);
  if (pm) {
    try {
      name = decodeURIComponent(pm[1].replace(/\+/g, ' ')).trim();
    } catch {
      /* leave name undefined on a bad escape */
    }
  }
  return { coords, name };
}

// Rough trip bounding box (HR/BA/ME corridor) — warn outside, never block.
const TRIP_BOX = { latMin: 41, latMax: 46, lngMin: 15, lngMax: 20 };
function outsideTripBox(lat: number, lng: number): boolean {
  return (
    lat < TRIP_BOX.latMin ||
    lat > TRIP_BOX.latMax ||
    lng < TRIP_BOX.lngMin ||
    lng > TRIP_BOX.lngMax
  );
}

const CATEGORIES_ORDERED: Category[] = [
  'sight',
  'viewpoint',
  'beach',
  'hike',
  'activity',
  'nature',
  'town',
  'campsite',
  'accommodation',
  'food',
  'nightlife',
  'other',
];

type InputMode = 'map' | 'coords' | 'url';

export interface DraftPlace {
  name: string;
  category: Category;
  lat: number | null;
  lng: number | null;
  day: number | null;
  note: string;
}

interface Props {
  /** A point captured by tapping the map (lat/lng), or null while waiting. */
  tappedPoint: { lat: number; lng: number } | null;
  /** Current GPS fix, for the "use my location" shortcut. */
  gpsFix: { lat: number; lng: number } | null;
  /** When editing, the place being edited (prefills name/category/lat/lng). */
  editing?: Place | null;
  /** Current override values for the edited place (day/note live in overrides). */
  editingDay?: number | null;
  editingNote?: string;
  onSave: (draft: DraftPlace) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function AddPlace({
  tappedPoint,
  gpsFix,
  editing,
  editingDay,
  editingNote,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [name, setName] = useState(editing?.name ?? '');
  const [category, setCategory] = useState<Category>(editing?.category ?? 'other');
  const [lat, setLat] = useState<number | null>(editing?.lat ?? null);
  const [lng, setLng] = useState<number | null>(editing?.lng ?? null);
  const [day, setDay] = useState<number | null>(editingDay ?? null);
  const [note, setNote] = useState(editingNote ?? '');
  const [coordsText, setCoordsText] = useState('');
  const [urlText, setUrlText] = useState('');
  const [parseMsg, setParseMsg] = useState<string | null>(null);

  // A map tap drops the pin: capture its coords.
  useEffect(() => {
    if (inputMode === 'map' && tappedPoint) {
      setLat(tappedPoint.lat);
      setLng(tappedPoint.lng);
      setParseMsg(
        outsideTripBox(tappedPoint.lat, tappedPoint.lng)
          ? '⚠ That point looks outside the trip area — double-check it.'
          : null,
      );
    }
  }, [tappedPoint, inputMode]);

  function applyCoords(la: number, ln: number, msg?: string | null) {
    setLat(la);
    setLng(ln);
    setParseMsg(
      msg ??
        (outsideTripBox(la, ln)
          ? '⚠ Those coordinates look outside the trip area — double-check them.'
          : null),
    );
  }

  function handleParseCoords() {
    const parsed = parseLatLng(coordsText);
    if (!parsed) {
      setParseMsg('Could not read that — paste like "42.123, 18.456".');
      return;
    }
    applyCoords(parsed[0], parsed[1]);
  }

  function handleParseUrl() {
    const res = parseMapsUrl(urlText);
    if (res.short) {
      setParseMsg(
        'Short Google links can’t be read offline. Open it in Google Maps, then ' +
          'Share → "Copy link" and paste the long link — or just paste the coordinates.',
      );
      return;
    }
    if (!res.coords) {
      setParseMsg('No coordinates found in that link. Paste an expanded Google Maps URL, or the coords.');
      return;
    }
    if (res.name && !name.trim()) setName(res.name);
    applyCoords(res.coords[0], res.coords[1]);
  }

  function useMyLocation() {
    if (!gpsFix) {
      setParseMsg('No GPS fix yet — tap the 📍 locate button first.');
      return;
    }
    applyCoords(gpsFix.lat, gpsFix.lng);
  }

  const canSave = name.trim().length > 0 && lat != null && lng != null;

  function handleSave() {
    if (!canSave || lat == null || lng == null) return;
    onSave({
      name: name.trim(),
      category,
      lat,
      lng,
      day,
      note: note.trim(),
    });
  }

  return (
    <div className="addplace">
      <div className="addplace-top">
        <h2>{editing ? 'Edit place' : '+ Add place'}</h2>
        <button className="addplace-close" onClick={onClose} title="Close">
          ✕
        </button>
      </div>

      {!editing && (
        <div className="addplace-modes">
          <button className={inputMode === 'url' ? 'on' : ''} onClick={() => setInputMode('url')}>
            Paste Google link
          </button>
          <button className={inputMode === 'coords' ? 'on' : ''} onClick={() => setInputMode('coords')}>
            Paste lat,lng
          </button>
          <button className={inputMode === 'map' ? 'on' : ''} onClick={() => setInputMode('map')}>
            Tap the map
          </button>
        </div>
      )}

      {!editing && inputMode === 'map' && (
        <div className="addplace-hint">
          📍 Tap the map where it is. {gpsFix && (
            <button className="addplace-gps" onClick={useMyLocation}>
              use my location
            </button>
          )}
        </div>
      )}

      {!editing && inputMode === 'coords' && (
        <div className="addplace-input-row">
          <input
            type="text"
            inputMode="decimal"
            placeholder="42.123, 18.456"
            value={coordsText}
            onChange={(e) => setCoordsText(e.target.value)}
          />
          <button onClick={handleParseCoords}>Set</button>
        </div>
      )}

      {!editing && inputMode === 'url' && (
        <div className="addplace-input-row">
          <input
            type="text"
            placeholder="Paste a Google Maps link…"
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
          />
          <button onClick={handleParseUrl}>Read</button>
        </div>
      )}

      {parseMsg && <p className="addplace-msg">{parseMsg}</p>}

      {lat != null && lng != null && (
        <p className="addplace-coords">
          📌 {lat.toFixed(5)}, {lng.toFixed(5)}
          {editing && ' (tap the map to move it)'}
        </p>
      )}

      <label className="field-label">
        Name *
        <input
          className="addplace-name"
          type="text"
          placeholder="What is it?"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <label className="field-label">
        Category
        <div className="addplace-cats">
          {CATEGORIES_ORDERED.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip ${category === c ? 'on' : ''}`}
              style={{ borderColor: CATEGORY_COLORS[c] }}
              onClick={() => setCategory(c)}
            >
              <span className="dot" style={{ background: CATEGORY_COLORS[c] }} />
              {c}
            </button>
          ))}
        </div>
      </label>

      <label className="field-label">
        Assign to day (optional)
        <select
          value={day ?? ''}
          onChange={(e) => setDay(e.target.value === '' ? null : Number(e.target.value))}
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
        Note (optional)
        <textarea
          className="note-area"
          placeholder="Why it’s worth it / who recommended it…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <div className="addplace-actions">
        <button className="addplace-save" disabled={!canSave} onClick={handleSave}>
          {editing ? 'Save changes' : 'Add place'}
        </button>
        {editing && onDelete && (
          <button className="addplace-delete" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
