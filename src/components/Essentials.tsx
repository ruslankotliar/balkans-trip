/**
 * Offline ESSENTIALS panel (feature B5) — a fully-offline, big-touch accordion
 * of safety-critical content (emergency numbers, "if X happens", borders/car/
 * police tips, hospitals per zone, packing checklist, survival phrases). All
 * content is bundled (src/essentials.ts), so it works with zero signal.
 */
import { useState } from 'react';
import {
  EMERGENCY_BY_COUNTRY,
  EMERGENCY_UNIVERSAL,
  FILL_IN_CONTACTS,
  HOSPITAL_ZONES,
  IF_THEN,
  PACKING,
  PHRASES,
  QUICK_TIPS,
  type ContactLine,
} from '../essentials';

interface Props {
  onClose: () => void;
  /** Focus the map on a hospital pin by id (from contingency-places.json). */
  onShowPin?: (pinId: string) => void;
}

/** A diallable contact row: tel: link when a number is present. */
function Contact({ line }: { line: ContactLine }) {
  return (
    <div className="ess-contact">
      <span className="ess-contact-label">{line.label}</span>
      {line.tel ? (
        <a className="ess-tel" href={`tel:${line.tel}`}>
          {line.value} ↗
        </a>
      ) : (
        <span className="ess-contact-value">{line.value}</span>
      )}
    </div>
  );
}

interface SectionProps {
  id: string;
  title: string;
  openId: string | null;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

function Section({ id, title, openId, onToggle, children }: SectionProps) {
  const open = openId === id;
  return (
    <div className={`ess-section ${open ? 'open' : ''}`}>
      <button className="ess-section-head" onClick={() => onToggle(id)} aria-expanded={open}>
        <span>{title}</span>
        <span className="ess-chevron">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="ess-section-body">{children}</div>}
    </div>
  );
}

export default function Essentials({ onClose, onShowPin }: Props) {
  // Emergency open by default — it's the one-tap-when-it-matters card.
  const [openId, setOpenId] = useState<string | null>('emergency');
  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));

  return (
    <div className="essentials">
      <div className="ess-top">
        <h2>🆘 Essentials</h2>
        <button className="ess-close" onClick={onClose} title="Close">
          ✕
        </button>
      </div>
      <p className="ess-sub">Works fully offline · tap a number to dial</p>

      <Section id="emergency" title="🚨 Emergency numbers" openId={openId} onToggle={toggle}>
        <a className="ess-tel ess-tel-big" href={`tel:${EMERGENCY_UNIVERSAL.tel}`}>
          112
        </a>
        <p className="ess-112-note">{EMERGENCY_UNIVERSAL.value}</p>
        {EMERGENCY_BY_COUNTRY.map((c) => (
          <div key={c.code} className="ess-country">
            <h4>
              {c.name} <span className="ess-cc">{c.code}</span>
            </h4>
            {c.lines.map((l) => (
              <Contact key={l.label} line={l} />
            ))}
          </div>
        ))}
        <div className="ess-fillin">
          {FILL_IN_CONTACTS.map((f) => (
            <div key={f.label} className="ess-fillin-row">
              <strong>{f.label}:</strong> <span className="ess-blank">__________</span>
              <div className="ess-fillin-hint">{f.hint}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="ifthen" title="⚠️ If X happens → do Y → call Z" openId={openId} onToggle={toggle}>
        {IF_THEN.map((b) => (
          <div key={b.title} className="ess-ifthen">
            <h4>
              {b.icon} {b.title}
            </h4>
            <ol>
              {b.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        ))}
      </Section>

      <Section id="borders" title="🛂 Borders, car & police" openId={openId} onToggle={toggle}>
        {QUICK_TIPS.map((sec) => (
          <div key={sec.title} className="ess-tipsec">
            <h4>{sec.title}</h4>
            <ul>
              {sec.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section id="hospitals" title="🏥 Hospitals & pharmacies per zone" openId={openId} onToggle={toggle}>
        {HOSPITAL_ZONES.map((z) => (
          <div key={z.zone} className="ess-zone">
            <div className="ess-zone-head">
              <strong>{z.zone}</strong>
              <div className="ess-zone-actions">
                {z.tel && (
                  <a className="ess-zone-tel" href={`tel:${z.tel}`}>
                    📞
                  </a>
                )}
                {z.pinId && onShowPin && (
                  <button className="ess-zone-pin" onClick={() => onShowPin(z.pinId!)}>
                    map ↗
                  </button>
                )}
              </div>
            </div>
            <div className="ess-zone-hosp">{z.hospital}</div>
            <div className="ess-zone-where">{z.where}</div>
            <div className="ess-zone-pharm">💊 {z.pharmacy}</div>
          </div>
        ))}
      </Section>

      <Section id="packing" title="🎒 Packing checklist" openId={openId} onToggle={toggle}>
        {PACKING.map((g) => (
          <div key={g.title} className="ess-pack">
            <h4>{g.title}</h4>
            <ul>
              {g.items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section id="phrases" title="🗣 Survival phrases (HR / BA / ME)" openId={openId} onToggle={toggle}>
        <p className="ess-phrase-note">
          One Latin-script phrase covers all three (mutually intelligible). c=ts · č/ć=ch · š=sh ·
          ž=zh · j=y · lj=lly
        </p>
        {PHRASES.map((g) => (
          <div key={g.title} className="ess-phrasegrp">
            <h4>{g.title}</h4>
            {g.phrases.map((p, i) => (
              <div key={i} className="ess-phrase">
                <div className="ess-phrase-en">{p.en}</div>
                <div className="ess-phrase-loc">
                  <strong>{p.hr}</strong>
                  {p.say && <span className="ess-phrase-say"> · {p.say}</span>}
                </div>
                {p.variant && <div className="ess-phrase-var">{p.variant}</div>}
              </div>
            ))}
          </div>
        ))}
      </Section>
    </div>
  );
}
