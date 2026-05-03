import { Icon } from './Icons.jsx';

const DETECTIONS = [
  { sev: 'crit', label: 'CRIT', title: 'transverse_crack', time: 'just now', meta: 'conf 0.87 · MP 24+340 · L1', meta2: 'bbox 412,380 → 95×120', clickable: true },
  { sev: 'med', label: 'MED', title: 'surface_wear', time: 'just now', meta: 'conf 0.72 · MP 24+338 · R1', meta2: 'bbox 240,256 → 56×42' },
  { sev: 'high', label: 'HIGH', title: 'head_check', time: '2s ago', meta: 'conf 0.83 · MP 24+322 · L1' },
  { sev: 'low', label: 'LOW', title: 'vegetation', time: '8s ago', meta: 'conf 0.66 · MP 24+260' },
  { sev: 'med', label: 'MED', title: 'loose_fastener', time: '14s ago', meta: 'conf 0.78 · MP 24+180' },
  { sev: 'low', label: 'LOW', title: 'surface_scratch', time: '22s ago', meta: 'conf 0.64 · MP 24+080' }
];

export default function LiveFeed({ active, onOpenDetail }) {
  return (
    <section className={`page ${active ? 'active' : ''}`}>
      <div className="page-head">
        <div>
          <h1 className="page-title">Live feed</h1>
          <div className="page-sub mono">JET-TX2-001 · T-422 · CSI-0 · 1920×1080 · STREAMING</div>
        </div>
        <div className="page-actions">
          <button className="btn ghost"><Icon name="i-fullscreen" />Fullscreen</button>
          <button className="btn"><Icon name="i-target" />Snapshot</button>
        </div>
      </div>

      <div className="feed-page-grid">
        <div className="feed-main">
          <div className="feed-large">
            <FeedSvgLarge />
            <div className="feed-bbox" style={{ top: '56%', left: '44%', width: '12%', height: '11%' }}>
              <span className="feed-bbox-label">transverse_crack · 0.87</span>
            </div>
            <div className="feed-bbox med" style={{ top: '32%', left: '32%', width: '6%', height: '5%' }}>
              <span className="feed-bbox-label">surface_wear · 0.72</span>
            </div>
            <div className="feed-hud">
              <span className="feed-hud-rec">REC</span>
              <div className="feed-hud-stats">
                <div>JET-TX2-001 · CSI-0</div>
                <div>44.5638°N · 123.2794°W</div>
                <div>MP 24+340 · v 18.2 km/h</div>
                <div>14:23:11.453 UTC</div>
              </div>
            </div>
          </div>
          <div className="feed-controls">
            <div className="stat-grp">
              <span>FPS<strong>28.4</strong></span>
              <span>Latency<strong>41ms</strong></span>
              <span>GPU<strong>72%</strong></span>
              <span>Detections<strong>2</strong></span>
              <span>Buffer<strong>0/30</strong></span>
            </div>
            <div className="spacer" />
            <span style={{ color: 'var(--text-3)' }}>|</span>
            <span>YOLOv8n · TRT FP16 · 416×416</span>
          </div>
        </div>

        <div className="feed-side">
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Live detections</span>
              <span className="panel-meta">streaming</span>
            </div>
            <div className="detection-list">
              {DETECTIONS.map((d, i) => (
                <div
                  key={i}
                  className="detection-item"
                  onClick={d.clickable ? onOpenDetail : undefined}
                >
                  <div className="detection-item-head">
                    <span className={`sev-badge ${d.sev}`}>{d.label}</span>
                    <span className="detection-item-title">{d.title}</span>
                    <span className="detection-item-time">{d.time}</span>
                  </div>
                  <div className="detection-item-meta">
                    {d.meta}
                    {d.meta2 && <><br />{d.meta2}</>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><span className="panel-title">Pipeline health</span></div>
            <div style={{ padding: '4px 0' }}>
              <div className="meta-row" style={{ padding: '8px 16px' }}><label>Capture</label><span className="val" style={{ color: 'var(--ok)' }}>8.2 ms</span></div>
              <div className="meta-row" style={{ padding: '8px 16px' }}><label>Preprocess</label><span className="val" style={{ color: 'var(--ok)' }}>3.1 ms</span></div>
              <div className="meta-row" style={{ padding: '8px 16px' }}><label>Inference</label><span className="val" style={{ color: 'var(--ok)' }}>28.7 ms</span></div>
              <div className="meta-row" style={{ padding: '8px 16px' }}><label>NMS + decode</label><span className="val" style={{ color: 'var(--ok)' }}>1.2 ms</span></div>
              <div className="meta-row" style={{ padding: '8px 16px' }}><label>Supabase POST</label><span className="val">82 ms</span></div>
              <div className="meta-row" style={{ padding: '8px 16px' }}><label>Realtime push</label><span className="val">53 ms</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeedSvgLarge() {
  return (
    <svg className="feed-bg-svg" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky-large" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1815" />
          <stop offset="50%" stopColor="#2a241e" />
          <stop offset="100%" stopColor="#1a1815" />
        </linearGradient>
        <linearGradient id="ground-large" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(120,113,108,0.5)" />
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#sky-large)" />
      <rect y="380" width="1280" height="340" fill="url(#ground-large)" />
      <line x1="380" y1="720" x2="600" y2="200" stroke="#6b6660" strokeWidth="6" />
      <line x1="900" y1="720" x2="680" y2="200" stroke="#6b6660" strokeWidth="6" />
      <line x1="350" y1="710" x2="930" y2="710" stroke="#3d342a" strokeWidth="14" opacity="0.85" />
      <line x1="400" y1="640" x2="880" y2="640" stroke="#3d342a" strokeWidth="12" opacity="0.75" />
      <line x1="445" y1="570" x2="835" y2="570" stroke="#3d342a" strokeWidth="10" opacity="0.65" />
      <line x1="485" y1="500" x2="795" y2="500" stroke="#3d342a" strokeWidth="8" opacity="0.55" />
      <line x1="520" y1="440" x2="760" y2="440" stroke="#3d342a" strokeWidth="6" opacity="0.45" />
      <line x1="550" y1="380" x2="730" y2="380" stroke="#3d342a" strokeWidth="5" opacity="0.4" />
      <line x1="575" y1="330" x2="705" y2="330" stroke="#3d342a" strokeWidth="4" opacity="0.35" />
      <g opacity="0.4" fill="#6b6660">
        <circle cx="100" cy="600" r="3" />
        <circle cx="200" cy="650" r="2" />
        <circle cx="1100" cy="620" r="3" />
        <circle cx="1180" cy="680" r="2" />
        <circle cx="50" cy="700" r="3" />
        <circle cx="1230" cy="700" r="2" />
      </g>
    </svg>
  );
}
