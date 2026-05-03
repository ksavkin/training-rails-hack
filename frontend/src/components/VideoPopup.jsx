import { CAMERAS } from '../data/railData.js';
import { Icon } from './Icons.jsx';

export default function VideoPopup({ open, onClose }) {
  if (!open) return null;

  const camera = CAMERAS[0];

  return (
    <div
      className="video-popup-backdrop show"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="video-popup">
        <div className="video-popup-head">
          <div>
            <div className="title">Live · {camera.label}</div>
            <div className="source-info">{camera.source}</div>
          </div>
          <div className="spacer" />
          <button className="btn ghost"><Icon name="i-fullscreen" /></button>
          <button className="icon-btn" onClick={onClose}><Icon name="i-x" /></button>
        </div>
        <div className="video-popup-stage">
          {camera.streamKind === 'unavailable' ? (
            <div className="stream-unavailable">Video stream unavailable</div>
          ) : camera.streamKind === 'mjpeg' ? (
            <img className="feed-live-img" src={camera.streamUrl} alt={`${camera.label} live stream`} />
          ) : (
            <video className="feed-live-img" src={camera.streamUrl} controls autoPlay muted playsInline />
          )}

          <div className="feed-hud">
            <span className="feed-hud-rec">REC</span>
            <div className="feed-hud-stats">
              <div>JET-TX2-001 · CSI-0</div>
              <div>Live forward inspection camera</div>
              <div>{camera.streamKind === 'mjpeg' ? 'MJPEG stream' : camera.source}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
