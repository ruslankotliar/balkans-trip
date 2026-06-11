/**
 * Share-plan UI (feature B1): a "Share plan" action that builds a #plan=…
 * link, and an import prompt shown when the app loads with a #plan= hash.
 * 100% static — the plan rides in the URL hash, no server.
 */
import { useState } from 'react';

interface ShareButtonProps {
  /** Builds the share link (App serializes {overrides, userPlaces}). */
  makeLink: () => string;
}

/** The "Share plan" button + the generated link / copy affordance. */
export function ShareButton({ makeLink }: ShareButtonProps) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function share() {
    const url = makeLink();
    setLink(url);
    setCopied(false);
    void navigator.clipboard
      ?.writeText(url)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  }

  return (
    <div className="shareplan">
      <button className="export" onClick={share}>
        🔗 Share plan (copy link)
      </button>
      {link && (
        <div className="shareplan-out">
          <p className="shareplan-status">
            {copied ? '✓ Link copied — paste it in your group chat.' : 'Link ready — copy it below.'}
          </p>
          <textarea className="shareplan-link" readOnly value={link} onFocus={(e) => e.target.select()} />
        </div>
      )}
    </div>
  );
}

interface ImportPromptProps {
  /** How many places' overrides + user places are in the incoming plan. */
  summary: { overrides: number; userPlaces: number };
  onMerge: () => void;
  onReplace: () => void;
  onCancel: () => void;
}

/** Modal shown when the app opens with a #plan= hash. */
export function ImportPrompt({ summary, onMerge, onReplace, onCancel }: ImportPromptProps) {
  return (
    <div className="import-overlay" role="dialog" aria-modal="true">
      <div className="import-modal">
        <h2>Import shared plan?</h2>
        <p>
          This link carries <strong>{summary.overrides}</strong> place edit
          {summary.overrides === 1 ? '' : 's'} and <strong>{summary.userPlaces}</strong> added place
          {summary.userPlaces === 1 ? '' : 's'}.
        </p>
        <p className="import-help">
          <strong>Merge</strong> applies them on top of your plan (incoming wins where they overlap).{' '}
          <strong>Replace</strong> swaps your plan for this one.
        </p>
        <div className="import-actions">
          <button className="import-merge" onClick={onMerge}>
            Merge
          </button>
          <button className="import-replace" onClick={onReplace}>
            Replace
          </button>
          <button className="import-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
