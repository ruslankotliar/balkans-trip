/**
 * Essentials panel — a fully-offline, editable shared pre-trip to-do list plus
 * a one-tap "cache all routes for offline" action. Tasks are stored in
 * localStorage so the list works (and edits stick) with no signal.
 */
import { useLayoutEffect, useRef, useState } from 'react';

// ---- Pre-trip checklist ------------------------------------------------

const TASKS_KEY = 'balkans-trip-tasks';
// Old auto-seeded preset ids (p1–p14) are retired here so stale tasks clear on
// load and the corrected list below seeds in their place (user-added tasks,
// which use `u<timestamp>` / `c…` ids, are untouched).
const LEGACY_TASK_IDS = new Set([
  'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7',
  'p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14',
]);

interface Task { id: string; text: string; done: boolean }

// Lean, plan-accurate booking + prep list. Every booking item matches a real
// committed activity + its correct date (see research/booking-guide.md).
const PRESET_TASKS: Task[] = [
  { id: 'c1', text: 'Call Sicily By Car (+385 23 646 547) — confirm BiH+ME cross-border permission, get the letter', done: false },
  { id: 'c2', text: 'Buy Krka NP timed-entry tickets online (D1 Jun 16) — np-krka.hr; the swim is at Skradin, not in the park', done: false },
  { id: 'c3', text: 'Book Biokovo NP toll-road car entry (D2 Jun 17, ~06:30) — shop.pp-biokovo.hr, ~20 cars/hr', done: false },
  { id: 'c4', text: 'Book Cetina CANYONING (D2 Jun 17 AM) — Zadvarje/Gubavica (jumps + 55m rappel); rafting = backup', done: false },
  { id: 'c5', text: 'Book Tara rafting (D7 Jun 22) — office@raftingtara.com / +381 64 420 1956', done: false },
  { id: 'c6', text: 'Book GO2FLY tandem paragliding Brajići→Bečići (D11 Jun 26, late afternoon) — Budva', done: false },
  { id: 'c7', text: 'Book Dubrovnik sea kayak Walls & Lokrum (D13 Jun 28, AM) — clear for the 20:40 flight', done: false },
  { id: 'c8', text: 'Mljet ferry: buy Prapratno→Sobra ticket ONLINE (D3 Jun 18), catch the 20:30 LAST sailing. Return Sobra→Prapratno D4: 06/09/12/16/19:30, no car reservation — queue early', done: false },
  { id: 'c10', text: 'Cash: €100–150 small bills + exchange some to BAM for Bosnia', done: false },
  { id: 'c11', text: 'Travel insurance for all 4 covering BiH+ME + rafting/canyoning/cliff-jumping + medical evac', done: false },
  { id: 'c12', text: 'Regional eSIM (covers HR+BA+ME) + tap "Cache all routes for offline" below on every phone', done: false },
  { id: 'c13', text: 'DEET repellent (Skadar) + a warm layer (Žabljak nights 5–10°C) — second-hand/cheap', done: false },
  { id: 'c14', text: 'Buy stove gas canisters in Zadar on D1 (can’t fly with them)', done: false },
];

function loadTasks(): Task[] {
  try {
    const a = JSON.parse(localStorage.getItem(TASKS_KEY) ?? 'null');
    if (Array.isArray(a) && a.length > 0) {
      const filtered = a.filter(
        (t): t is Task =>
          !!t &&
          typeof t === 'object' &&
          typeof t.id === 'string' &&
          typeof t.text === 'string' &&
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

/** Auto-growing, wrapping text field so a long task is fully readable (no truncation). */
function TaskText({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      className="ess-task-input"
      value={value}
      rows={1}
      onChange={(e) => onChange(e.target.value)}
    />
  );
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
  function editTask(id: string, text: string) {
    setTasks(tasks.map(t => t.id === id ? { ...t, text } : t));
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
        <button className="ess-close" onClick={onClose} title="Close">
          ✕
        </button>
      </div>
      <p className="ess-sub">
        Shared pre-trip checklist — {doneCount}/{tasks.length} done. Saved on each phone, works offline.
      </p>

      <div className="ess-tasks">
        {tasks.map(t => (
          <div key={t.id} className={`ess-task ${t.done ? 'done' : ''}`}>
            <button
              className={`ess-task-check ${t.done ? 'on' : ''}`}
              onClick={() => toggleTask(t.id)}
              title={t.done ? 'Mark not done' : 'Mark done'}
            >
              {t.done ? '✓' : '○'}
            </button>
            <TaskText value={t.text} onChange={(text) => editTask(t.id, text)} />
            <button className="ess-task-del" onClick={() => deleteTask(t.id)} title="Delete task">
              ✕
            </button>
          </div>
        ))}
      </div>

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
