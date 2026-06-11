/**
 * Per-place collaboration block for the detail panel: vote buttons + everyone's
 * tally + who voted, and a comment thread (newest first). Reads from the in-
 * memory caches App holds (which mirror localStorage), so it works offline.
 *
 * Mobile UX: vote buttons are always visible (above the fold); comments are
 * collapsed behind a toggle so the sheet stays compact.
 */
import { useState } from 'react';
import type { CommentRow, Tally, VoteValue } from '../collab';

interface Props {
  placeId: string;
  person: string | null;
  /** This person's current vote (0 = none). */
  myVote: VoteValue | 0;
  tally: Tally | undefined;
  comments: CommentRow[];
  /** Trigger the "Who are you?" prompt when the user has no name yet. */
  onNeedName: () => void;
  onVote: (vote: VoteValue) => void;
  onComment: (body: string) => void;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export default function CollabBlock({
  placeId,
  person,
  myVote,
  tally,
  comments,
  onNeedName,
  onVote,
  onComment,
}: Props) {
  const [draft, setDraft] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);

  const placeComments = comments
    .filter((c) => c.place_id === placeId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at)); // newest first

  const up = tally?.up ?? 0;
  const down = tally?.down ?? 0;

  function guard(action: () => void) {
    if (!person) {
      onNeedName();
      return;
    }
    action();
  }

  function submitComment() {
    const body = draft.trim();
    if (!body) return;
    guard(() => {
      onComment(body);
      setDraft('');
    });
  }

  return (
    <div className="collab-block">
      <div className="collab-vote-row">
        <button
          className={`collab-vote up ${myVote === 1 ? 'on' : ''}`}
          onClick={() => guard(() => onVote(1))}
          title={person ? 'I want to go here' : 'Set your name to vote'}
        >
          👍 <span className="collab-vote-count">{up}</span>
        </button>
        <button
          className={`collab-vote down ${myVote === -1 ? 'on' : ''}`}
          onClick={() => guard(() => onVote(-1))}
          title={person ? 'Not for me' : 'Set your name to vote'}
        >
          👎 <span className="collab-vote-count">{down}</span>
        </button>
      </div>

      {(up > 0 || down > 0) && (
        <div className="collab-voters">
          {up > 0 && (
            <span className="collab-voters-line">
              👍 {tally!.upPeople.join(', ')}
            </span>
          )}
          {down > 0 && (
            <span className="collab-voters-line">
              👎 {tally!.downPeople.join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Comments: collapsed by default to keep the sheet compact on phones.
          Tapping the toggle reveals the thread + input. */}
      <div className="collab-comments">
        <button
          className={`collab-comments-toggle ${commentsOpen ? 'open' : ''}`}
          onClick={() => setCommentsOpen((o) => !o)}
        >
          💬 {placeComments.length > 0
            ? `${placeComments.length} comment${placeComments.length === 1 ? '' : 's'}`
            : 'Add a comment'}
          <span className="collab-comments-chevron">{commentsOpen ? '▲' : '▼'}</span>
        </button>

        {commentsOpen && (
          <>
            <div className="collab-comment-input">
              <textarea
                className="note-area"
                placeholder={person ? 'Add a comment…' : 'Set your name to comment…'}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => {
                  if (!person) onNeedName();
                }}
              />
              <button className="collab-comment-send" disabled={!draft.trim()} onClick={submitComment}>
                Post
              </button>
            </div>

            {placeComments.length > 0 && (
              <ul className="collab-comment-list">
                {placeComments.map((c) => (
                  <li key={c.id} className={c.id.startsWith('local-') ? 'pending' : ''}>
                    <span className="collab-comment-author">{c.person}</span>
                    <span className="collab-comment-time">{timeAgo(c.created_at)}</span>
                    <div className="collab-comment-body">{c.body}</div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
