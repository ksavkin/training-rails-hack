import { useEffect, useState } from 'react';
import { Icon } from './Icons.jsx';
import DefectActions from './DefectActions.jsx';
import { formatDefectType } from '../lib/pinMappers.js';

function fmtSev(sev) {
  if (!sev) return '';
  return sev === 'resolved' ? 'resolved' : sev.toUpperCase();
}

// Locked enum mirrored from backend `DEFECT_TYPE_ENUM` and Jetson's
// `DEFECT_TYPE_MAP` outputs. UI dropdown + server validation use the same
// list, so a stale frontend can't land an unrecognized value.
const EDITABLE_DEFECT_TYPES = [
  'spalling',
  'transverse_crack',
  'longitudinal_crack',
  'joint_defect',
  'missing_fastener',
];

// Pin status set in which the operator may correct `defect_type`. Mirrors
// backend `PRE_TRIAGE_STATUSES`. Once a pin is acknowledged/dispatched the
// classification is locked — the pencil disappears.
const EDITABLE_STATUSES = new Set(['new', 'edited']);

// Severity dropdown bands. Operator picks a band; UI maps to a representative
// numeric value before sending. The threshold values (3/5/7/9) sit just inside
// each band's lower bound so `severityIntToSevBand` produces the matching band
// after a round-trip through the DB. Keeping the original numeric out of the
// UI on purpose: operators think in bands, not 0.1-precision floats.
const SEVERITY_BANDS = [
  { value: 'crit', label: 'CRIT', num: 9 },
  { value: 'high', label: 'HIGH', num: 7 },
  { value: 'med',  label: 'MED',  num: 5 },
  { value: 'low',  label: 'LOW',  num: 3 },
];
const SEV_BAND_TO_NUM = SEVERITY_BANDS.reduce((m, b) => { m[b.value] = b.num; return m; }, {});

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
  onEdit,
}) {
  const [editing, setEditing] = useState(false);
  const [draftType, setDraftType] = useState('');
  const [draftSev, setDraftSev] = useState('');

  // Drop edit state when modal closes or switches pins. Otherwise half-typed
  // corrections linger when the same pin id is re-opened later.
  const dataId = data?.id;
  useEffect(() => {
    if (!open || !dataId) {
      setEditing(false);
      setDraftType('');
      setDraftSev('');
    }
  }, [open, dataId]);

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
  const liveType = livePin?.type ?? data.type;

  const canEdit = isDefect && EDITABLE_STATUSES.has(liveStatus) && typeof onEdit === 'function';
  const isEditing = editing && canEdit;
  const isSaving = pendingAction === 'edit';
  const otherPending = !!pendingAction && pendingAction !== 'edit';

  // Severity band shown on the modal: live in view-mode, draft preview in
  // edit-mode. This drives the wrapper className and the in-header SEV tag,
  // so changing the dropdown re-tints the modal *before* save lands.
  const previewSev = isEditing && draftSev ? draftSev : liveSev;

  // Resolved pins use 'resolved' as their sev; SEVERITY_BANDS dropdown only
  // covers active bands. If the live sev is 'resolved' (shouldn't happen
  // since canEdit gates on pre-triage, but defensive) default the draft to
  // the operator's last numeric mapping.
  const initialDraftSev = SEV_BAND_TO_NUM[liveSev] ? liveSev : 'med';

  const startEdit = () => {
    setDraftType(liveType || EDITABLE_DEFECT_TYPES[0]);
    setDraftSev(initialDraftSev);
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setDraftType('');
    setDraftSev('');
  };
  const saveEdit = async () => {
    if (!draftType || !draftSev) return;
    const typeChanged = draftType !== liveType;
    const sevChanged = draftSev !== liveSev;
    if (!typeChanged && !sevChanged) {
      // No-op: don't burn a request flipping status to 'edited' for values
      // the pin already has.
      cancelEdit();
      return;
    }
    const payload = {};
    if (typeChanged) payload.defectType = draftType;
    if (sevChanged) payload.severity = SEV_BAND_TO_NUM[draftSev];
    const ok = await onEdit(payload);
    if (ok) cancelEdit();
    // On failure callPinAction already alerted — keep the form open so the
    // operator can retry or cancel without re-opening the pencil.
  };

  return (
    <div
      className="map-focus-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`map-focus-modal ${isDefect ? 'defect' : 'camera'} ${isDefect ? `pin-popup-${previewSev}` : ''}`}>
        <div className={`map-focus-head ${isDefect ? 'with-sev' : ''}`}>
          {isDefect ? (
            <div className="map-focus-title-combined">
              <div className="map-focus-title-row">
                {isEditing ? (
                  <span className="map-focus-title-edit">
                    <select
                      className="map-focus-sev-select"
                      value={draftSev}
                      onChange={(e) => setDraftSev(e.target.value)}
                      disabled={isSaving}
                      aria-label="Severity band"
                    >
                      {SEVERITY_BANDS.map((b) => (
                        <option key={b.value} value={b.value}>{b.label}</option>
                      ))}
                    </select>
                    <select
                      className="map-focus-type-select"
                      value={draftType}
                      onChange={(e) => setDraftType(e.target.value)}
                      disabled={isSaving}
                      autoFocus
                      aria-label="Defect type"
                    >
                      {EDITABLE_DEFECT_TYPES.map((t) => (
                        <option key={t} value={t}>{formatDefectType(t)}</option>
                      ))}
                    </select>
                    <button
                      className="btn success"
                      onClick={saveEdit}
                      disabled={isSaving || !draftType || !draftSev}
                      style={{ height: 28, padding: '0 10px' }}
                    >
                      {isSaving ? <span className="spinner" /> : <Icon name="i-check" />}
                      {isSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      className="btn ghost"
                      onClick={cancelEdit}
                      disabled={isSaving}
                      style={{ height: 28, padding: '0 10px' }}
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <>
                    <span className="map-focus-title-sev">{fmtSev(liveSev)}</span>
                    <span className="map-focus-title-type">{formatDefectType(liveType)}</span>
                    {canEdit && (
                      <button
                        className="icon-btn map-focus-edit-pencil"
                        onClick={startEdit}
                        disabled={otherPending}
                        title="Edit severity / defect type"
                        aria-label="Edit severity and defect type"
                      >
                        <Icon name="i-edit" />
                      </button>
                    )}
                  </>
                )}
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
                <div className="map-focus-media-empty stream-unavailable">
                  Defect image unavailable
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
