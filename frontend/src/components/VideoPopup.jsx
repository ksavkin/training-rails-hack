import { Icon } from './Icons.jsx';

export default function VideoPopup({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="video-popup-backdrop show"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="video-popup">
        <div className="video-popup-head">
          <div>
            <div className="title">Live · T-422 forward camera</div>
            <div className="source-info">JET-TX2-001 · CSI-0 · 1920×1080 @ 28.4 FPS</div>
          </div>
          <div className="spacer" />
          <button className="btn ghost"><Icon name="i-fullscreen" /></button>
          <button className="icon-btn" onClick={onClose}><Icon name="i-x" /></button>
        </div>
        <div className="video-popup-stage">
          <svg className="feed-bg-svg" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="sky-pop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a1815" />
                <stop offset="50%" stopColor="#2a241e" />
                <stop offset="100%" stopColor="#1a1815" />
              </linearGradient>
            </defs>
            <rect width="1280" height="720" fill="url(#sky-pop)" />
            <rect y="380" width="1280" height="340" fill="rgba(120,113,108,0.3)" />
            <line x1="380" y1="720" x2="600" y2="200" stroke="#6b6660" strokeWidth="6" />
            <line x1="900" y1="720" x2="680" y2="200" stroke="#6b6660" strokeWidth="6" />
            <line x1="350" y1="710" x2="930" y2="710" stroke="#3d342a" strokeWidth="14" opacity="0.85" />
            <line x1="400" y1="640" x2="880" y2="640" stroke="#3d342a" strokeWidth="12" opacity="0.75" />
            <line x1="445" y1="570" x2="835" y2="570" stroke="#3d342a" strokeWidth="10" opacity="0.65" />
            <line x1="485" y1="500" x2="795" y2="500" stroke="#3d342a" strokeWidth="8" opacity="0.55" />
            <line x1="520" y1="440" x2="760" y2="440" stroke="#3d342a" strokeWidth="6" opacity="0.45" />
            <line x1="550" y1="380" x2="730" y2="380" stroke="#3d342a" strokeWidth="5" opacity="0.4" />
          </svg>

          <div className="feed-bbox" style={{ top: '56%', left: '44%', width: '12%', height: '11%' }}>
            <span className="feed-bbox-label">transverse_crack · 0.87</span>
          </div>

          <div className="feed-hud">
            <span className="feed-hud-rec">REC</span>
            <div className="feed-hud-stats">
              <div>44.5638°N · 123.2794°W</div>
              <div>MP 24+340 · v 18.2 km/h</div>
              <div>FPS 28.4 · LAT 41ms</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
