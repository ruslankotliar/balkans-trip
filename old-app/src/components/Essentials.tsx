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
  /** Progress line while prepping ("map tiles 120/900"). */
  status?: string;
}

export default function Essentials({ onClose, onPrepOffline, prepping = false, status = '' }: Props) {
  return (
    <div className="essentials">
      <div className="ess-top">
        <h2>Offline</h2>
        <button className="ess-close" onClick={onClose} title="Close">✕</button>
      </div>
      <p className="ess-sub">
        One tap on wifi: every day's road route, the map tiles along the routes and around
        the stops, and today's forecast - so the app works with no signal.
      </p>

      {onPrepOffline && (
        <button className="ess-prep-offline" onClick={onPrepOffline} disabled={prepping}>
          {prepping ? `📥 ${status || 'working…'}` : '📥 Cache routes, map and forecast'}
        </button>
      )}
      <p className="ess-sub">Then add the app to the home screen. The plan pages are in Notes and always offline.</p>
    </div>
  );
}
