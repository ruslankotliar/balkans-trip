/**
 * Essentials panel — one-tap "cache all routes for offline" action.
 * The to-do checklist was removed (never used in practice).
 */
interface Props {
  onClose: () => void;
  /** Pre-fetch every day's route into the offline cache (for dead zones). */
  onPrepOffline?: () => void;
  /** True while offline route prep is running. */
  prepping?: boolean;
}

export default function Essentials({ onClose, onPrepOffline, prepping = false }: Props) {
  return (
    <div className="essentials">
      <div className="ess-top">
        <h2>Offline</h2>
        <button className="ess-close" onClick={onClose} title="Close">✕</button>
      </div>
      <p className="ess-sub">Cache all day routes for dead zones (mountains, canyons).</p>

      {onPrepOffline && (
        <button className="ess-prep-offline" onClick={onPrepOffline} disabled={prepping}>
          {prepping ? '📥 Caching routes…' : '📥 Cache all routes for offline'}
        </button>
      )}
    </div>
  );
}
