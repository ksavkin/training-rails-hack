import { Icon } from './Icons.jsx';

function fmtSev(sev) {
  if (!sev) return '';
  return sev === 'resolved' ? 'resolved' : sev.toUpperCase();
}

export default function MapFocusPopup({ open, mode, data, onClose }) {
  if (!open || !data) return null;

  const isDefect = mode === 'defect';
  const defectId = isDefect ? String(data.id).replace(/^DEF-/, 'DEFECT-') : data.id;
  const defectTitle = String(defectId).startsWith('DEFECT-') ? defectId : `Defect ${defectId}`;

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
            <div className="title">{isDefect ? defectTitle : `Live camera ${data.id}`}</div>
            <div className="source-info">
              {isDefect
                ? `Milepost ${data.mp} - Track ID ${data.line} - Confidence ${data.conf}`
                : `${data.label} · ${data.source}`}
            </div>
          </div>
          <div className="spacer" />
          <button className="icon-btn" onClick={onClose}><Icon name="i-x" /></button>
        </div>

        {isDefect ? (
          <div className="map-focus-defect-layout">
            <div className="map-focus-media">
              {data.imageUrl ? (
                <img src={data.imageUrl} alt={`${data.id} defect`} />
              ) : (
                <div className="map-focus-media-empty stream-unavailable">
                  Defect image unavailable
                </div>
              )}
            </div>
            <div className="map-focus-meta">
              <div className="map-focus-summary">
                <div>
                  <span className="map-focus-eyebrow">Defect category</span>
                  <h3>{data.type}</h3>
                </div>
                <div className={`map-focus-severity ${data.sev}`}>
                  <span>Severity: {fmtSev(data.sev)}</span>
                  {data.severityNum != null && <strong>{data.severityNum}/10</strong>}
                </div>
              </div>
              <div className="map-focus-row"><label>Track ID</label><span>{data.line}</span></div>
              {data.severityNum != null && (
                <div className="map-focus-row"><label>Severity score</label><span>{data.severityNum} / 10</span></div>
              )}
              <div className="map-focus-row"><label>Confidence</label><span>{data.conf}</span></div>
              <div className="map-focus-row"><label>Milepost</label><span>{data.mp}</span></div>
              <div className="map-focus-row"><label>Captured</label><span>{data.capturedAt}</span></div>
              <div className="map-focus-row">
                <label>Coordinates</label>
                <span>{data.lat.toFixed(6)}°, {data.lon.toFixed(6)}°</span>
              </div>
              {data.status && (
                <div className="map-focus-row"><label>Status</label><span>{data.status}</span></div>
              )}
              {data.deviceId && (
                <div className="map-focus-row"><label>Device</label><span>{data.deviceId}</span></div>
              )}
              {data.frameId != null && (
                <div className="map-focus-row"><label>Frame</label><span>{data.frameId}</span></div>
              )}
              {data.resolvedAt && (
                <div className="map-focus-row"><label>Resolved</label><span>{data.resolvedAt}</span></div>
              )}
              {data.createdAt && (
                <div className="map-focus-row"><label>Created</label><span>{data.createdAt}</span></div>
              )}
              {data.updatedAt && (
                <div className="map-focus-row"><label>Updated</label><span>{data.updatedAt}</span></div>
              )}
              {data.imagePath && (
                <div className="map-focus-row"><label>Storage path</label><span className="mono">{data.imagePath}</span></div>
              )}
              {data.notes && (
                <div className="map-focus-row"><label>Notes</label><span>{data.notes}</span></div>
              )}
            </div>
          </div>
        ) : (
          <div className="map-focus-video">
            {data.streamKind === 'unavailable' ? (
              <div className="stream-unavailable">Video stream unavailable</div>
            ) : data.streamKind === 'mjpeg' ? (
              <img src={data.streamUrl} alt={`${data.label} live stream`} />
            ) : (
              <video src={data.streamUrl} controls autoPlay muted playsInline />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

