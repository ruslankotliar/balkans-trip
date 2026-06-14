/**
 * Checklist panel — a fully-offline, editable shared pre-trip to-do list,
 * plus a one-tap "cache all routes for offline" action.
 */
import { useState } from 'react';

// ---- Pre-trip checklist ------------------------------------------------

const TASKS_KEY = 'balkans-trip-tasks';
const LEGACY_TASK_IDS = new Set([
  'p10',
  'p11',
  'p12',
  'p13',
  'p14',
]);

interface Task { id: string; text: string; done: boolean }

const PRESET_TASKS: Task[] = [
  { id: 'p1', text: 'Call Sicily By Car (+385 23 646 547) — confirm BiH + ME permission, get letter', done: false },
  { id: 'p2', text: 'Book Tara rafting Jun 23 — office@raftingtara.com or +381 64 420 1956', done: false },
  { id: 'p3', text: 'Book Biokovo Skywalk Jun 18 — shop.pp-biokovo.hr (20-car/hour cap)', done: false },
  { id: 'p4', text: 'Book Cetina canyoning Jun 17 — canyoning-cetina.com', done: false },
  { id: 'p5', text: 'Buy mosquito repellent (DEET) — essential for Ada Bojana + Skadar Lake', done: false },
  { id: 'p6', text: 'Pack warm layer — Žabljak nights 5–10°C', done: false },
  { id: 'p7', text: 'Cash ready: €100–150 small bills + exchange some to BAM (Bosnia)', done: false },
  { id: 'p8', text: 'Download offline maps — OsmAnd for BiH + ME before leaving', done: false },
  { id: 'p9', text: 'Check Mljet ferry time at jadrolinija.hr — queue Prapratno 90min early Jun 20', done: false },
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

interface Props {
  onClose: () => void;
  /** Trip mode defaults the accordion to the most urgent on-road section. */
  tripMode?: boolean;
  /** Focus the map on a hospital pin by id (from contingency-places.json). */
  onShowPin?: (pinId: string) => void;
  /** Pre-fetch every day's route into the offline cache (for dead zones). */
  onPrepOffline?: () => void;
  /** True while offline route prep is running. */
  prepping?: boolean;
}

export default function Essentials({
  onClose,
  onPrepOffline,
  prepping = false,
}: Props) {
  // ---- Editable, shared checklist ----
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
        <h2>✅ Checklist</h2>
        <button className="ess-close" onClick={onClose} title="Close">
          ✕
        </button>
      </div>
      <p className="ess-sub">Shared to-do — tick it off, edit inline, add your own.</p>

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
            <input
              className="ess-task-input"
              value={t.text}
              onChange={(e) => editTask(t.id, e.target.value)}
            />
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
