import { useState } from 'react';
import { Icon } from './Icons.jsx';
import MiniMap from './MiniMap.jsx';
import DefectActions from './DefectActions.jsx';

const META_ROWS = [
  ['Defect type', 'transverse_crack'],
  ['Confidence', '0.87'],
  ['Milepost', '24+340'],
  ['Latitude', '44.5638°N'],
  ['Longitude', '123.2794°W'],
  ['Rail', 'L1 (left)'],
  ['Bbox', '412,380→95×120'],
  ['Device', 'JET-TX2-001'],
  ['Frame', '#184729'],
  ['Speed', '18.2 km/h'],
  ['GPS fix age', '340 ms']
];

const THUMBS = [
  { label: '184725', highlight: false },
  { label: '184727', highlight: false },
  { label: '184729', highlight: true },
  { label: '184731', highlight: false },
  { label: '184733', highlight: false }
];

export default function DefectDetail({
  active,
  pins,
  selectedPin,
  onBack,
  onOpenDispatch,
  onAcknowledge,
  onResolve,
  onReopen,
  resolved,
  pendingAction,
}) {
  const [thumb, setThumb] = useState(2);

  const pinId = selectedPin?.id ?? 'DEF-2026-04891';
  const pinStatus = selectedPin?.status ?? 'new';
  const pinTitle = selectedPin?.type
    ? `${selectedPin.type} · ${selectedPin.mp ?? ''}`.trim()
    : 'Transverse crack · railhead';
  return (
    <section className={`page ${active ? 'active' : ''}`}>
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <button className="btn ghost" style={{ height: 26, padding: '0 8px' }} onClick={onBack}>
              <Icon name="i-back" />Back
            </button>
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>{pinId}</span>
            <span className={`status-pill ${pinStatus}`}>{pinStatus.toUpperCase()}</span>
          </div>
          <h1 className="page-title">{pinTitle}</h1>
          <div className="page-sub mono">DETECTED 29 APR 14:23:11.453 UTC · CORVALLIS–ALBANY · MP 24+340 · L1</div>
        </div>
        <div className="page-actions">
          <button className="btn ghost"><Icon name="i-x" />False positive</button>
        </div>
      </div>

      <div className="defect-layout">
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="photo-stage">
            <div className="photo-toolbar">
              <span className="info">FRAME #184729 · 1920×1080 · CSI-0</span>
              <div className="spacer" />
              <button className="btn ghost" style={{ height: 26, padding: '0 8px' }}>
                <Icon name="i-fullscreen" />
              </button>
            </div>
            <div className="photo-area">
              <PhotoSvg />
              <div className="ai-tag bbox" style={{ top: '42%', left: '64%', width: '12%', height: '14%' }} />
              <div className="ai-tag bbox-label" style={{ top: '42%', left: '64%', transform: 'translateY(-100%)' }}>
                transverse_crack · 0.87
              </div>
            </div>
            <div className="photo-thumbs">
              {THUMBS.map((t, i) => (
                <div
                  key={i}
                  className={`thumb ${thumb === i ? 'active' : ''}`}
                  onClick={() => setThumb(i)}
                >
                  <svg viewBox="0 0 80 56">
                    <rect width="80" height="56" fill="#1a1612" />
                    <line x1="28" y1="0" x2="20" y2="56" stroke="#7a7570" strokeWidth="3" />
                    <line x1="54" y1="0" x2="62" y2="56" stroke="#7a7570" strokeWidth="3" />
                    {t.highlight && (
                      <rect x="50" y="22" width="10" height="10" fill="none" stroke="#ff3d54" strokeWidth="1" />
                    )}
                  </svg>
                  <span className="thumb-label">{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Location · MP 24+340 on Corvallis–Albany</span>
              <span className="panel-meta">L1 · ±2.3m GPS</span>
            </div>
            <div style={{ aspectRatio: '16 / 6', background: '#0a0d10', position: 'relative' }}>
              <MiniMap pageActive={active} pins={pins} />
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="meta-panel">
          <div className="meta-card">
            <h3>Severity score<div className="spacer" /><span className="severity-tag">CRITICAL</span></h3>
            <div className="severity-display">
              <span className="severity-num">9</span>
              <span className="severity-max">/ 10</span>
            </div>
            <div className="severity-bar">
              <div className="severity-bar-fill" style={{ width: '90%' }} />
            </div>
            <div className="severity-formula">
              <div><span>base · transverse_crack</span><strong>6.0</strong></div>
              <div><span>size_factor · bbox 0.13</span><strong>+2.4</strong></div>
              <div><span>position · railhead L1</span><strong>+0.6</strong></div>
              <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8, marginTop: 4 }}>
                <span>FINAL</span><strong>9.0</strong>
              </div>
            </div>
          </div>

          <div className="meta-card">
            <h3>AI verifier<div className="spacer" /><span className="llm-status">PASS</span></h3>
            <p className="llm-quote">
              "Visible transverse fracture across the railhead. Dark line continuous from gauge corner inward. Not a shadow or oil mark."
            </p>
          </div>

          <div className="meta-card">
            <h3>Metadata</h3>
            {META_ROWS.map(([k, v]) => (
              <div key={k} className="meta-row">
                <label>{k}</label>
                <span className="val">{v}</span>
              </div>
            ))}
          </div>

          <DefectActions
            pin={selectedPin}
            resolved={resolved}
            pendingAction={pendingAction}
            onOpenDispatch={onOpenDispatch}
            onAcknowledge={onAcknowledge}
            onResolve={onResolve}
            onReopen={onReopen}
          />
        </div>
      </div>
    </section>
  );
}

function PhotoSvg() {
  return (
    <svg className="photo-svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
      <rect width="800" height="500" fill="#1a1612" />
      <rect x="0" y="320" width="800" height="50" fill="#3d342a" opacity="0.6" />
      <rect x="0" y="395" width="800" height="60" fill="#3d342a" opacity="0.65" />
      <rect x="0" y="475" width="800" height="50" fill="#3d342a" opacity="0.7" />
      <g opacity="0.3" fill="#6b6660">
        <circle cx="80" cy="290" r="3" />
        <circle cx="140" cy="305" r="2.5" />
        <circle cx="220" cy="385" r="3" />
        <circle cx="380" cy="295" r="2" />
        <circle cx="500" cy="390" r="3" />
        <circle cx="620" cy="300" r="2" />
        <circle cx="700" cy="465" r="3" />
        <circle cx="60" cy="465" r="2" />
        <circle cx="160" cy="280" r="2" />
        <circle cx="450" cy="475" r="2.5" />
        <circle cx="730" cy="295" r="2" />
      </g>
      <path d="M 280 0 L 200 500" stroke="#7a7570" strokeWidth="22" strokeLinecap="square" />
      <path d="M 280 0 L 200 500" stroke="#a8a29e" strokeWidth="3" strokeLinecap="square" opacity="0.7" />
      <path d="M 540 0 L 620 500" stroke="#7a7570" strokeWidth="22" strokeLinecap="square" />
      <path d="M 540 0 L 620 500" stroke="#a8a29e" strokeWidth="3" strokeLinecap="square" opacity="0.7" />
      <path d="M 555 240 L 570 250 L 565 260 L 580 270 L 575 275 L 590 285" stroke="#0a0d10" strokeWidth="3" fill="none" />
      <path d="M 555 240 L 570 250 L 565 260 L 580 270 L 575 275 L 590 285" stroke="#5d4838" strokeWidth="1.2" fill="none" />
    </svg>
  );
}
