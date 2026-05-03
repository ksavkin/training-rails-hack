import { Icon } from './Icons.jsx';

function fmtSev(sev) {
  if (!sev) return '';
  return sev === 'resolved' ? 'resolved' : sev.toUpperCase();
}

export default function MapFocusPopup({ open, mode, data, onClose }) {
  if (!open || !data) return null;

  const isDefect = mode === 'defect';

  return (
    <div
      className="map-focus-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`map-focus-modal ${isDefect ? 'defect' : 'camera'}`}>
        <div className="map-focus-head">
          <div>
            <div className="title">{isDefect ? `Defect ${data.id}` : `Live camera ${data.id}`}</div>
            <div className="source-info">
              {isDefect
                ? `MP ${data.mp} · line ${data.line} · conf ${data.conf}`
                : `${data.label} · ${data.source}`}
            </div>
          </div>
          <div className="spacer" />
          <button className="icon-btn" onClick={onClose}><Icon name="i-x" /></button>
        </div>

        {isDefect ? (
          <div className="map-focus-defect-layout">
            <div className="map-focus-media">
              <img src={data.imageUrl} alt={`${data.id} defect`} />
            </div>
            <div className="map-focus-meta">
              <span className={`sev-badge ${data.sev}`}>{fmtSev(data.sev)}</span>
              <h3>{data.type}</h3>
              <div className="map-focus-row"><label>Captured</label><span>{data.capturedAt}</span></div>
              <div className="map-focus-row"><label>Coordinate</label><span>{data.lat.toFixed(4)}N, {Math.abs(data.lon).toFixed(4)}W</span></div>
              <div className="map-focus-row"><label>Milepoint</label><span>{data.mp}</span></div>
            </div>
          </div>
        ) : (
          <div className="map-focus-video">
            <video src={data.streamUrl} controls autoPlay muted playsInline />
          </div>
        )}
      </div>
    </div>
  );
}
