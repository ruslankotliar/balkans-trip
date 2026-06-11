/**
 * Lightweight identity prompt (collaboration layer). The 4 friends' names are
 * unknown, so it's a free-text name, stored in localStorage. No passwords.
 * Shown on first use; also reachable later to edit the name.
 */
import { useState } from 'react';

interface Props {
  /** Current name when editing (empty on first use). */
  current?: string | null;
  onSave: (name: string) => void;
  /** Only offered when editing (first-use has no cancel — we want a name). */
  onCancel?: () => void;
}

export default function WhoAreYou({ current, onSave, onCancel }: Props) {
  const [name, setName] = useState(current ?? '');
  const trimmed = name.trim();

  return (
    <div className="import-overlay" role="dialog" aria-modal="true">
      <div className="import-modal who-modal">
        <h2>Who are you?</h2>
        <p className="import-help">
          Your name shows on your 👍/👎 and comments so the other 3 know who voted.
          No password — just pick a name. You can change it later.
        </p>
        <input
          className="who-input"
          type="text"
          autoFocus
          placeholder="Your name…"
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && trimmed) onSave(trimmed);
          }}
        />
        <div className="import-actions">
          <button className="import-replace" disabled={!trimmed} onClick={() => onSave(trimmed)}>
            {current ? 'Save name' : "That's me"}
          </button>
          {onCancel && (
            <button className="import-cancel" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
