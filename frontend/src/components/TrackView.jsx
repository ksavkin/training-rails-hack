import { useState } from 'react';
import { Icon } from './Icons.jsx';

const TICKS = [
  { left: 0, label: 'MP 0 · Corvallis', major: true, end: true },
  { left: 10, label: 'MP 3' },
  { left: 20, label: 'MP 6' },
  { left: 33, label: 'MP 10', major: true },
  { left: 43, label: 'MP 13' },
  { left: 50, label: 'MP 15' },
  { left: 60, label: 'MP 18' },
  { left: 66, label: 'MP 20', major: true },
  { left: 80, label: 'MP 24' },
  { left: 90, label: 'MP 27' },
  { left: 100, label: 'MP 30 · Albany', major: true, end: true }
];

const STRIP_PINS = [
  { left: 6, sev: 'low', text: 'surface scratch · MP 1+760' },
  { left: 12, sev: 'med', text: 'loose fastener · MP 3+580' },
  { left: 18, sev: 'low', text: 'vegetation · MP 5+940' },
  { left: 25, sev: 'med', text: 'ballast fouling · MP 7+750' },
  { left: 35, sev: 'high', text: 'head check pattern · MP 10+540' },
  { left: 42, sev: 'med', text: 'joint bolt loose · MP 12+880' },
  { left: 48, sev: 'med', text: 'surface wear · MP 14+200' },
  { left: 55, sev: 'high', text: 'surface wear cluster · MP 16+650' },
  { left: 64, sev: 'med', text: 'missing fastener · MP 19+340' },
  { left: 70, sev: 'low', text: 'spike pulled · MP 21+200' },
  { left: 75, sev: 'med', text: 'tie wear · MP 22+580' },
  { left: 81, sev: 'crit', text: '⚠ transverse crack · MP 24+340 · ACTIVE', active: true },
  { left: 86, sev: 'high', text: 'corrugation · MP 25+880' },
  { left: 92, sev: 'med', text: 'gauge widening · MP 27+720' },
  { left: 96, sev: 'low', text: 'surface scratch · MP 28+940' }
];

const TABLE_ROWS = [
  { id: 'DEF-04891', type: 'Transverse crack', mp: '24+340 · L1', sev: ['9 · CRIT', 'crit'], conf: 0.87, time: '14:23:11', status: ['NEW', 'new'], dev: 'JET-001', clickable: true },
  { id: 'DEF-04892', type: 'Lateral misalignment', mp: '29+120 · L1', sev: ['8 · CRIT', 'crit'], conf: 0.91, time: '14:36:02', status: ['NEW', 'new'], dev: 'JET-001' },
  { id: 'DEF-04887', type: 'Defective fishplate', mp: '25+440 · R2', sev: ['7 · HIGH', 'high'], conf: 0.84, time: '14:14:55', status: ['DISPATCHED', 'disp'], dev: 'JET-001' },
  { id: 'DEF-04885', type: 'Surface wear cluster', mp: '16+650 · L1+R1', sev: ['7 · HIGH', 'high'], conf: 0.79, time: '14:21:48', status: ['ACK', 'ack'], dev: 'JET-001' },
  { id: 'DEF-04881', type: 'Head check pattern', mp: '10+540 · L1', sev: ['6 · HIGH', 'high'], conf: 0.83, time: '14:12:14', status: ['RESOLVED', 'resolved'], dev: 'JET-001' },
  { id: 'DEF-04879', type: 'Corrugation', mp: '25+880 · R1', sev: ['6 · HIGH', 'high'], conf: 0.78, time: '13:58:33', status: ['ACK', 'ack'], dev: 'JET-001' },
  { id: 'DEF-04877', type: 'Gauge widening +9mm', mp: '27+720', sev: ['5 · MED', 'med'], conf: 0.71, time: '13:51:08', status: ['NEW', 'new'], dev: 'JET-001' },
  { id: 'DEF-04875', type: 'Joint bolt loose', mp: '12+880 · R1', sev: ['4 · MED', 'med'], conf: 0.81, time: '13:44:22', status: ['ACK', 'ack'], dev: 'JET-001' }
];

const FILTER_CHIPS = [
  { sev: 'crit', label: '2 critical', active: true },
  { sev: 'high', label: '5 high', active: true },
  { sev: 'med', label: '12 med', active: true },
  { sev: 'low', label: '23 low', active: false },
  { sev: '', label: 'resolved (7)', active: false }
];

export default function TrackView({ active, onOpenDetail }) {
  const [chips, setChips] = useState(FILTER_CHIPS.map((c) => c.active));

  return (
    <section className={`page ${active ? 'active' : ''}`}>
      <div className="page-head">
        <div>
          <h1 className="page-title">Track view</h1>
          <div className="page-sub mono">CORVALLIS–ALBANY · 30 KM · LAST PASS T-422 · 14:23 UTC</div>
        </div>
        <div className="page-actions">
          <select className="btn" style={{ padding: '0 12px' }}>
            <option>Corvallis–Albany · 30 km</option>
            <option>Portland–Eugene · 198 km</option>
            <option>Salem–Bend · 232 km</option>
            <option>Seattle–Tacoma · 51 km</option>
          </select>
          <button className="btn ghost"><Icon name="i-export" />Export route report</button>
        </div>
      </div>

      <div className="track-strip-wrap">
        <div className="track-strip-head">
          <h3>Defects along route</h3>
          <div className="filter-row">
            {FILTER_CHIPS.map((c, i) => (
              <button
                key={i}
                className={`filter-chip ${chips[i] ? 'active' : ''} ${c.sev}`}
                onClick={() => setChips((s) => s.map((v, j) => (j === i ? !v : v)))}
              >
                {c.sev && <span className={`dot ${c.sev}`} />}
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="track-strip">
          <div className="track-line" />
          {TICKS.map((t, i) => (
            <span key={i}>
              <div
                className={`track-tick ${t.major ? 'track-tick-major' : ''}`}
                style={{ left: `${t.left}%` }}
              />
              <div
                className={`track-label ${t.end ? 'track-label-end' : ''}`}
                style={{ left: `${t.left}%` }}
              >
                {t.label}
              </div>
            </span>
          ))}
          {STRIP_PINS.map((p, i) => (
            <div
              key={i}
              className={`track-pin ${p.sev}`}
              style={{ left: `${p.left}%` }}
              onClick={onOpenDetail}
            >
              <div className="track-pin-dot" />
              <span className="track-pin-tooltip">{p.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th><th>Type</th><th>MP</th><th>Sev</th><th>Conf</th><th>Detected</th><th>Status</th><th>Device</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_ROWS.map((r) => (
              <tr
                key={r.id}
                onClick={r.clickable ? onOpenDetail : undefined}
              >
                <td className="id-cell">{r.id}</td>
                <td><strong>{r.type}</strong></td>
                <td className="km-cell">{r.mp}</td>
                <td><span className={`sev-badge ${r.sev[1]}`}>{r.sev[0]}</span></td>
                <td>
                  <div className="conf-cell">
                    {r.conf}
                    <div className="bar"><div className="bar-f" style={{ width: `${r.conf * 100}%` }} /></div>
                  </div>
                </td>
                <td className="km-cell">{r.time}</td>
                <td><span className={`status-pill ${r.status[1]}`}>{r.status[0]}</span></td>
                <td className="km-cell">{r.dev}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
