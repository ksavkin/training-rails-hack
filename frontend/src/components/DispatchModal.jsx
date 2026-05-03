import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons.jsx';

export default function DispatchModal({ open, pin, apiUrl, apiToken, onClose }) {
  const [smsState, setSmsState] = useState('idle'); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState(null);
  const [sentInfo, setSentInfo] = useState(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setSmsState('idle');
    setErrorMsg(null);
    setSentInfo(null);
    inFlightRef.current = false;
  }, [open]);

  const handleConfirm = async () => {
    // Synchronous re-entry guard. setSmsState is async; two rapid clicks can
    // both pass the disabled check before React rerenders the button. The ref
    // is updated synchronously, so the second click bails out here.
    if (inFlightRef.current) return;
    if (!pin?.id) {
      setErrorMsg('No pin selected');
      setSmsState('error');
      return;
    }
    inFlightRef.current = true;
    setSmsState('sending');
    setErrorMsg(null);
    try {
      const payload = {
        pin_id: pin.id,
        lat: pin.lat,
        lon: pin.lon,
        severity: pin.severityNum ?? pin.severity,
        timestamp: pin.capturedAt ?? new Date().toISOString(),
      };
      const headers = { 'Content-Type': 'application/json' };
      if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
      const res = await fetch(`${apiUrl}/dispatch`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        // Backend returns FastAPI-style JSON like {"detail": "Pin ... is in status ..."}.
        // Extract the human-readable detail; fall back to the raw payload.
        let friendly = text;
        try {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === 'object' && parsed.detail) {
            friendly = typeof parsed.detail === 'string'
              ? parsed.detail
              : JSON.stringify(parsed.detail);
          }
        } catch {
          // not JSON — keep raw
        }
        setErrorMsg(friendly || `HTTP ${res.status}`);
        setSmsState('error');
        return;
      }
      const data = await res.json();
      setSentInfo({ to: data.to, sid: data.message_sid });
      setSmsState('sent');
    } catch (err) {
      setErrorMsg(err.message || 'Network error');
      setSmsState('error');
    } finally {
      inFlightRef.current = false;
    }
  };

  if (!open) return null;

  return (
    <div
      className="dispatch-modal-backdrop show"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="dispatch-modal">
        <div className="dispatch-modal-head">
          <Icon name="i-send" style={{ color: 'var(--crit)' }} />
          <h3>Dispatch crew</h3>
          <div style={{ flex: 1 }} />
          <button className="icon-btn" onClick={onClose}><Icon name="i-x" /></button>
        </div>

        <div className="dispatch-modal-body">
          <div style={{ fontSize: 13, color: 'var(--text-1)', marginBottom: 14 }}>
            Send a real SMS to the maintenance operator and mark this pin as dispatched.
          </div>

          <div className="work-order-preview">
            <span className="label">PIN ID</span>{pin?.id ?? '—'}
            {'\n'}<span className="label">PRIORITY</span>{pin?.severityNum >= 8 ? 'P1 · URGENT' : 'P2'}
            {'\n'}<span className="label">DEFECT</span>{pin?.type ?? 'unknown'} · severity {pin?.severityNum ?? pin?.severity ?? '—'}/10
            {'\n'}<span className="label">LOCATION</span>{pin?.mp ?? '—'}
            {'\n'}<span className="label">GPS</span>{pin?.lat?.toFixed?.(4) ?? '—'}°N, {pin?.lon?.toFixed?.(4) ?? '—'}°W
          </div>

          {smsState === 'sent' && sentInfo && (
            <div className="sms-preview">
              <div className="sms-preview-head">
                <Icon name="i-phone" style={{ verticalAlign: 'middle', width: 12, height: 12 }} />
                {' '}SMS sent to {sentInfo.to}
              </div>
              <div className="sms-text" style={{ fontSize: 11, color: 'var(--text-2)' }}>
                Twilio SID: {sentInfo.sid}
              </div>
            </div>
          )}

          {smsState === 'error' && errorMsg && (
            <div className="sms-preview error">
              <div className="sms-preview-head">Failed</div>
              <div className="sms-text">{errorMsg}</div>
            </div>
          )}

          <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button
              className={`btn ${smsState === 'sent' ? 'success' : 'danger'}`}
              onClick={handleConfirm}
              disabled={!pin?.id || smsState === 'sending' || smsState === 'sent'}
            >
              {smsState === 'idle' && (<><Icon name="i-send" />Dispatch & send SMS</>)}
              {smsState === 'sending' && (<><div className="spinner" />Sending...</>)}
              {smsState === 'sent' && (<><Icon name="i-check" />SMS sent</>)}
              {smsState === 'error' && (<><Icon name="i-send" />Retry</>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
