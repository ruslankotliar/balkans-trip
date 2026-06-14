/**
 * Essentials panel — a fully-offline, editable shared pre-trip to-do list,
 * a one-tap "cache all routes for offline" action, PLUS the on-the-road safety
 * sheet (emergency numbers, what-do-I-do contingencies, hospital-by-zone, the
 * driving/border/money rules and survival phrases). All of it is bundled static
 * data (src/essentials.ts) so it works with no signal in a canyon.
 */
import { useState, type ReactNode } from 'react';
import {
  EMERGENCY_UNIVERSAL,
  EMERGENCY_BY_COUNTRY,
  FILL_IN_CONTACTS,
  IF_THEN,
  QUICK_TIPS,
  HOSPITAL_ZONES,
  PACKING,
  PHRASES,
} from '../essentials';

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
  { id: 'c9', text: 'Self-rent boat plan: HR no licence under 5m/~5kW; ME small boats — arrange in Kotor/Budva/Cavtat', done: false },
  { id: 'c10', text: 'Cash: €100–150 small bills + exchange some to BAM for Bosnia', done: false },
  { id: 'c11', text: 'Download OsmAnd offline maps for BiH + ME', done: false },
  { id: 'c12', text: 'DEET repellent (Skadar) + a warm layer (Žabljak nights 5–10°C) — second-hand/cheap', done: false },
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
  onShowPin,
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

  // ---- Offline safety sheet (accordion; Emergency open by default) ----
  const [openSecs, setOpenSecs] = useState<Set<string>>(() => new Set(['emergency']));
  const toggleSec = (id: string) =>
    setOpenSecs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="essentials">
      <div className="ess-top">
        <h2>🧭 Essentials</h2>
        <button className="ess-close" onClick={onClose} title="Close">
          ✕
        </button>
      </div>
      <p className="ess-sub">Shared checklist + offline safety sheet — works with no signal.</p>

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

      {/* ---- Offline safety sheet ---- */}
      <Section id="emergency" title="🆘 Emergency numbers" open={openSecs.has('emergency')} onToggle={toggleSec}>
        <a className="ess-tel-big" href={`tel:${EMERGENCY_UNIVERSAL.tel}`}>{EMERGENCY_UNIVERSAL.label}</a>
        <p className="ess-112-note">{EMERGENCY_UNIVERSAL.value}</p>
        {EMERGENCY_BY_COUNTRY.map(c => (
          <div className="ess-country" key={c.code}>
            <h4>{c.name} <span className="ess-cc">{c.code}</span></h4>
            {c.lines.map(l => (
              <div className="ess-contact" key={l.label}>
                <span className="ess-contact-label">{l.label}</span>
                {l.tel
                  ? <a className="ess-tel" href={`tel:${l.tel}`}>{l.value}</a>
                  : <span className="ess-contact-value">{l.value}</span>}
              </div>
            ))}
          </div>
        ))}
        <div className="ess-fillin">
          {FILL_IN_CONTACTS.map(f => (
            <div className="ess-fillin-row" key={f.label}>
              <strong>{f.label}:</strong> <span className="ess-blank">______________</span>
              <div className="ess-fillin-hint">{f.hint}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="ifthen" title="🧯 If this happens…" open={openSecs.has('ifthen')} onToggle={toggleSec}>
        {IF_THEN.map(it => (
          <div className="ess-ifthen" key={it.title}>
            <h4>{it.icon} {it.title}</h4>
            <ol>{it.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </div>
        ))}
      </Section>

      <Section id="hospitals" title="🏥 Hospitals by zone" open={openSecs.has('hospitals')} onToggle={toggleSec}>
        {HOSPITAL_ZONES.map(z => (
          <div className="ess-zone" key={z.zone}>
            <div className="ess-zone-head">
              <strong>{z.zone}</strong>
              <div className="ess-zone-actions">
                {z.tel && <a className="ess-zone-tel" href={`tel:${z.tel}`} title="Call">📞</a>}
                {z.pinId && onShowPin && (
                  <button className="ess-zone-pin" onClick={() => onShowPin(z.pinId!)}>📍 Map</button>
                )}
              </div>
            </div>
            <div className="ess-zone-hosp">{z.hospital}</div>
            <div className="ess-zone-where">{z.where}</div>
            <div className="ess-zone-pharm">💊 {z.pharmacy}</div>
          </div>
        ))}
      </Section>

      <Section id="driving" title="🚗 Driving, borders & money" open={openSecs.has('driving')} onToggle={toggleSec}>
        {/* The "Book before Jun 16" section is intentionally skipped here — the
            checklist above is the maintained, plan-accurate booking list. */}
        {QUICK_TIPS.filter(s => !s.title.startsWith('⚡ Book before')).map(sec => (
          <div className="ess-tipsec" key={sec.title}>
            <h4>{sec.title}</h4>
            <ul>{sec.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
            {sec.links && (
              <div className="ess-tip-links">
                {sec.links.map(l => (
                  <a className="ess-tip-link" key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
                ))}
              </div>
            )}
          </div>
        ))}
      </Section>

      <Section id="phrases" title="🗣️ Survival phrases" open={openSecs.has('phrases')} onToggle={toggleSec}>
        {PHRASES.map(g => (
          <div className="ess-phrasegrp" key={g.title}>
            <h4>{g.title}</h4>
            {g.phrases.map((p, i) => (
              <div className="ess-phrase" key={i}>
                <div className="ess-phrase-en">{p.en}</div>
                <div className="ess-phrase-loc">
                  {p.hr}{p.say && <span className="ess-phrase-say"> · {p.say}</span>}
                </div>
                {p.variant && <div className="ess-phrase-var">{p.variant}</div>}
              </div>
            ))}
          </div>
        ))}
      </Section>

      <Section id="packing" title="🎒 Packing" open={openSecs.has('packing')} onToggle={toggleSec}>
        {PACKING.map(g => (
          <div className="ess-pack" key={g.title}>
            <h4>{g.title}</h4>
            <ul>{g.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
          </div>
        ))}
      </Section>
    </div>
  );
}

interface SectionProps {
  id: string;
  title: string;
  open: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
}

function Section({ id, title, open, onToggle, children }: SectionProps) {
  return (
    <section className={`ess-section ${open ? 'open' : ''}`}>
      <button className="ess-section-head" onClick={() => onToggle(id)}>
        <span>{title}</span>
        <span className="ess-chevron">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="ess-section-body">{children}</div>}
    </section>
  );
}
