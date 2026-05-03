import { Icon } from './Icons.jsx';
import DefectActions from './DefectActions.jsx';
import { formatDefectType } from '../lib/pinMappers.js';

function fmtSev(sev) {
  if (!sev) return '';
  return sev === 'resolved' ? 'resolved' : sev.toUpperCase();
}

export default function MapFocusPopup({
  open,
  mode,
  data,
  onClose,
  pin,
  resolved,
  pendingAction,
  onOpenDispatch,
  onAcknowledge,
  onResolve,
  onReopen,
}) {
  if (!open || !data) return null;

  const isDefect = mode === 'defect';
  // `data` is the snapshot taken at the moment the modal was opened.
  // `pin` is the live row from the realtime feed. For severity-aware
  // visuals (wrapper class, header tag, status row) we MUST use the live
  // values — otherwise after Reopen the modal stays green/RESOLVED while
  // the underlying pin is back to new/acknowledged/dispatched.
  const livePin = isDefect && pin?.id === data.id ? pin : null;
  const liveSev = livePin?.sev ?? data.sev;
  const liveStatus = livePin?.status ?? data.status;
  const liveSeverityNum = livePin?.severityNum ?? data.severityNum;

  return (
    <div
      className="map-focus-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`map-focus-modal ${isDefect ? 'defect' : 'camera'} ${isDefect ? `pin-popup-${liveSev}` : ''}`}>
        <div className={`map-focus-head ${isDefect ? 'with-sev' : ''}`}>
          {isDefect ? (
            <div className="map-focus-title-combined">
              <div className="map-focus-title-row">
                <span className="map-focus-title-sev">{fmtSev(liveSev)}</span>
                <span className="map-focus-title-type">{formatDefectType(data.type)}</span>
              </div>
              <div className="map-focus-title-sub">
                {data.id} · MP {data.mp} · line {data.line} · conf {data.conf}
              </div>
            </div>
          ) : (
            <div>
              <div className="title">{`Live camera ${data.id}`}</div>
              <div className="source-info">{`${data.label} · ${data.source}`}</div>
            </div>
          )}
          <div className="spacer" />
          <button className="icon-btn" onClick={onClose}><Icon name="i-x" /></button>
        </div>

        {isDefect ? (
          <div className="map-focus-defect-layout">
            <div className="map-focus-media">
              {data.imageUrl ? (
                <img src={data.imageUrl} alt={`${data.id} defect`} />
              ) : (
                <div className="map-focus-media-empty">
                  No image — missing or empty <span className="mono">image_path</span> on this pin, or could not
                  build a public URL (check <span className="mono">PUBLIC_SUPABASE_URL</span> in{' '}
                  <span className="mono">frontend/.env</span> and restart dev server).
                </div>
              )}
            </div>
            <div className="map-focus-meta">
              <div className="map-focus-row"><label>Line</label><span>{data.line}</span></div>
              {liveSeverityNum != null && (
                <div className="map-focus-row"><label>Severity score</label><span>{liveSeverityNum} / 10</span></div>
              )}
              <div className="map-focus-row"><label>Confidence</label><span>{data.conf}</span></div>
              <div className="map-focus-row"><label>Milepost</label><span>{data.mp}</span></div>
              <div className="map-focus-row"><label>Captured</label><span>{data.capturedAt}</span></div>
              <div className="map-focus-row">
                <label>Coordinates</label>
                <span>{data.lat.toFixed(6)}°, {data.lon.toFixed(6)}°</span>
              </div>
              {liveStatus && (
                <div className="map-focus-row"><label>Status</label><span>{liveStatus}</span></div>
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
              {(onAcknowledge || onResolve || onOpenDispatch || onReopen) && (
                <div className="map-focus-actions">
                  <DefectActions
                    pin={livePin ?? data}
                    resolved={resolved}
                    pendingAction={pendingAction}
                    onOpenDispatch={onOpenDispatch}
                    onAcknowledge={onAcknowledge}
                    onResolve={onResolve}
                    onReopen={onReopen}
                  />
                </div>
              )}
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
