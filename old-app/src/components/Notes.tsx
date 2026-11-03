import { useMemo, useState, type MouseEvent } from 'react';
import { renderMarkdown } from '../markdown';
import type { TripNote } from '../notes';

/** [[Page]] names in the vault that differ from the tab label here. */
const ALIASES: Record<string, string> = {
  'september 2026 - albania': 'bookings',
};

interface Props {
  notes: TripNote[];
}

/**
 * The trip's own pages (Plan, Packing, Food...) as tabs, rendered from the
 * bundled markdown - so the plan is on the phone with no signal.
 */
export default function Notes({ notes }: Props) {
  const [idx, setIdx] = useState(0);
  const findIdx = (name: string) => {
    const key = name.trim().toLowerCase();
    const title = ALIASES[key] ?? key;
    return notes.findIndex((n) => n.title.toLowerCase() === title);
  };
  const html = useMemo(() => {
    const note = notes[idx];
    if (!note) return '';
    return renderMarkdown(note.body, (name) => {
      const i = findIdx(name);
      return i >= 0 ? `#note-${i}` : null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, notes]);

  function onClick(e: MouseEvent<HTMLDivElement>) {
    const a = (e.target as HTMLElement).closest('a.md-wiki') as HTMLAnchorElement | null;
    if (!a) return;
    const m = a.getAttribute('href')?.match(/^#note-(\d+)$/);
    if (!m) return;
    e.preventDefault();
    setIdx(Number(m[1]));
    (e.currentTarget as HTMLDivElement).scrollTop = 0;
  }

  if (notes.length === 0) return <p className="itin-empty">No notes for this trip.</p>;

  return (
    <div className="notes">
      <div className="notes-tabs">
        {notes.map((n, i) => (
          <button key={n.title} type="button" className={i === idx ? 'on' : ''} onClick={() => setIdx(i)}>
            {n.title}
          </button>
        ))}
      </div>
      <div className="notes-body md" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
