import { useEffect, useState } from 'react';
import { Icon } from './Icons.jsx';

export default function DispatchModal({ open, onClose }) {
  const [pending, setPending] = useState(true);
  const [smsState, setSmsState] = useState('idle'); // idle | sending | sent

  useEffect(() => {
    if (!open) return;
    setPending(true);
    setSmsState('idle');
    const t = setTimeout(() => setPending(false), 1200);
    return () => clearTimeout(t);
  }, [open]);

  const handleConfirm = () => {
    setSmsState('sending');
    setTimeout(() => setSmsState('sent'), 1500);
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
            AI is generating a work order and SMS for the dispatch crew.
          </div>

          {pending && (
            <div className="dispatch-pending">
              <div className="spinner" />
              <span>Generating work order via Claude Haiku...</span>
            </div>
          )}

          {!pending && (
            <div className="work-order-preview">
              <span className="label">ORDER ID</span>WO-2026-04891
              {'\n'}<span className="label">PRIORITY</span>P1 · URGENT
              {'\n'}<span className="label">DEFECT</span>Transverse crack · severity 9/10
              {'\n'}<span className="label">LOCATION</span>Corvallis–Albany · MP 24+340 · L1
              {'\n'}<span className="label">GPS</span>44.5638°N, 123.2794°W
              {'\n'}<span className="label">CREW</span>Maintenance team Albany
              {'\n'}<span className="label">ETA</span>~25 min
              {'\n'}<span className="label">EQUIPMENT</span>Rail welder, grinder, gauge tools
            </div>
          )}

          {smsState === 'sent' && (
            <div className="sms-preview">
              <div className="sms-preview-head">
                <Icon name="i-phone" style={{ verticalAlign: 'middle', width: 12, height: 12 }} />
                {' '}SMS sent to +1 (541) ***-4291
              </div>
              <div className="sms-text">
                URGENT: Transverse crack at MP 24+340 (Corvallis–Albany line, L1). Severity 9. GPS 44.5638°N, 123.2794°W. Bring rail welder. WO-2026-04891.
              </div>
            </div>
          )}

          <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button
              className={`btn ${smsState === 'sent' ? 'success' : 'danger'}`}
              onClick={handleConfirm}
              disabled={smsState !== 'idle' || pending}
            >
              {smsState === 'idle' && (<><Icon name="i-send" />Dispatch & send SMS</>)}
              {smsState === 'sending' && (<><div className="spinner" />Sending...</>)}
              {smsState === 'sent' && (<><Icon name="i-check" />SMS sent</>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
