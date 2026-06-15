/**
 * Essentials panel — a plain, shared pre-trip to-do list plus a one-tap
 * "cache all routes for offline" action. Tasks are stored in localStorage so
 * the list works (and ticks stick) with no signal.
 */
import { useState } from 'react';

const TASKS_KEY = 'balkans-trip-tasks';
// Retired preset ids — cleared on load so the current list below re-seeds in
// their place. User-added tasks (ids `u<timestamp>`) are never touched.
const LEGACY_TASK_IDS = new Set([
  'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14',
  'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13', 'c14',
]);

interface Task { id: string; text: string; done: boolean }

// Short, scannable actions. Full detail lives in the Plan stops + booking-guide.
const PRESET_TASKS: Task[] = [
  { id: 't1', text: 'Cross-border letter + green card (BiH + ME) from Sicily By Car', done: false },
  { id: 't2', text: 'Travel insurance for all 4 — covers BiH/ME + rafting, canyoning, cliff-jumps', done: false },
  { id: 't3', text: 'Book Tara rafting (D7) — raftingtara.com', done: false },
  { id: 't4', text: 'Book Biokovo toll-road slot (D2, ~06:30) — shop.pp-biokovo.hr', done: false },
  { id: 't5', text: 'Book Cetina canyoning (D2)', done: false },
  { id: 't6', text: 'Book GO2FLY paragliding (D11)', done: false },
  { id: 't7', text: 'Book Dubrovnik sea kayak (D13 morning)', done: false },
  { id: 't8', text: 'Pre-buy Mljet ferry online (D3) + agree the miss-it plan', done: false },
  { id: 't9', text: 'Buy Krka timed-entry tickets (D1) — np-krka.hr', done: false },
  { id: 't10', text: 'Regional eSIM (HR+BA+ME) + "Cache routes for offline" on every phone', done: false },
  { id: 't11', text: 'Cash: €100–150 small bills + some BAM for Bosnia', done: false },
  { id: 't12', text: 'Buy stove gas in Zadar (D1 — can’t fly with it)', done: false },
  { id: 't13', text: 'DEET + a warm layer for Žabljak nights', done: false },
];

function loadTasks(): Task[] {
  try {
    const a = JSON.parse(localStorage.getItem(TASKS_KEY) ?? 'null');
    if (Array.isArray(a) && a.length > 0) {
      const filtered = a.filter(
        (t): t is Task =>
          !!t && typeof t === 'object' &&
          typeof t.id === 'string' && typeof t.text === 'string' &&
          !LEGACY_TASK_IDS.has(t.id),
      );
      if (filtered.length !== a.length) saveTasks(filtered);
      if (filtered.length > 0) return filtered;
    }
  } catch {}
  return PRESET_TASKS;
}
function saveTasks(t: Task[]) {
  try { localStorage.setItem(TASKS_KEY, JSON.stringify(t)); } catch {}
}

interface Props {
  onClose: () => void;
  /** Pre-fetch every day's route into the offline cache (for dead zones). */
  onPrepOffline?: () => void;
  /** True while offline route prep is running. */
  prepping?: boolean;
}

export default function Essentials({ onClose, onPrepOffline, prepping = false }: Props) {
  const [tasks, setTasksState] = useState<Task[]>(loadTasks);
  const [draft, setDraft] = useState('');
  function setTasks(next: Task[]) { setTasksState(next); saveTasks(next); }
  function toggleTask(id: string) {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }
  function deleteTask(id: string) {
    setTasks(tasks.filter(t => t.id !== id));
  }
  function addTask() {
    const text = draft.trim();
    if (!text) return;
    setTasks([...tasks, { id: `u${Date.now()}`, text, done: false }]);
    setDraft('');
  }
  const doneCount = tasks.filter(t => t.done).length;

  return (
    <div className="essentials">
      <div className="ess-top">
        <h2>✅ To-do</h2>
        <button className="ess-close" onClick={onClose} title="Close">✕</button>
      </div>
      <p className="ess-sub">Shared checklist · {doneCount}/{tasks.length} done · works offline</p>

      <ul className="ess-tasks">
        {tasks.map(t => (
          <li key={t.id} className={`ess-task ${t.done ? 'done' : ''}`}>
            <label className="ess-task-label">
              <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} />
              <span className="ess-task-text">{t.text}</span>
            </label>
            <button className="ess-task-del" onClick={() => deleteTask(t.id)} aria-label="Delete task">✕</button>
          </li>
        ))}
      </ul>

      <div className="ess-task-add">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a task…"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTask(); } }}
        />
        <button onClick={addTask}>＋ Add</button>
      </div>

      {doneCount > 0 && (
        <button className="ess-task-clear" onClick={() => setTasks(tasks.filter(t => !t.done))}>
          Clear {doneCount} done
        </button>
      )}

      {onPrepOffline && (
        <button className="ess-prep-offline" onClick={onPrepOffline} disabled={prepping}>
          {prepping ? '📥 Caching routes…' : '📥 Cache all routes for offline'}
        </button>
      )}
    </div>
  );
}
