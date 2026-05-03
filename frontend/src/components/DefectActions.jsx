import { Icon } from './Icons.jsx';

/**
 * Action buttons for a defect pin.
 *
 * Active pin (status in {new, edited, acknowledged, dispatched}):
 *   - Dispatch crew now
 *   - Acknowledge (only valid from pre-triage: 'new' or 'edited')
 *   - Mark as resolved
 *
 * Resolved pin (status='resolved'):
 *   - Reopen — sends pin back to its prior active status
 *
 * Used by MapFocusPopup as the single source of pin actions.
 *
 * `pendingAction`: name of the in-flight mutation ('acknowledge' | 'resolve'
 * | 'reopen' | 'edit' | null). The matching button shows an inline spinner;
 * all others are disabled to prevent racing requests.
 */
export default function DefectActions({
  pin,
  resolved,
  pendingAction,
  onOpenDispatch,
  onAcknowledge,
  onResolve,
  onReopen,
}) {
  const pinStatus = pin?.status ?? 'new';
  // Pre-triage: pin still represents raw or human-corrected detection data,
  // not yet acted on. Mirrors backend PRE_TRIAGE_STATUSES. Acknowledge is
  // gated on this, since acking from {acknowledged, dispatched} makes no
  // sense.
  const isPreTriage = pinStatus === 'new' || pinStatus === 'edited';
  const isResolved = resolved || pinStatus === 'resolved';
  const anyPending = !!pendingAction;
  const enabled = !!pin && !anyPending;

  if (isResolved) {
    const reopening = pendingAction === 'reopen';
    return (
      <div className="meta-card">
        <h3>Actions</h3>
        <div className="actions-stack">
          <button
            className="btn"
            onClick={onReopen}
            disabled={!enabled || !onReopen}
          >
            {reopening ? <span className="spinner" /> : <Icon name="i-refresh" />}
            {reopening ? 'Reopening…' : 'Reopen'}
          </button>
        </div>
      </div>
    );
  }

  const acking = pendingAction === 'acknowledge';
  const resolving = pendingAction === 'resolve';

  return (
    <div className="meta-card">
      <h3>Actions</h3>
      <div className="actions-stack">
        <button
          className="btn danger"
          onClick={onOpenDispatch}
          disabled={!enabled}
        >
          <Icon name="i-send" />Dispatch crew now
        </button>
        <button
          className="btn"
          onClick={onAcknowledge}
          disabled={!enabled || !isPreTriage}
        >
          {acking ? <span className="spinner" /> : <Icon name="i-eye" />}
          {acking
            ? 'Acknowledging…'
            : pinStatus === 'acknowledged'
              ? 'Acknowledged'
              : 'Acknowledge (low priority)'}
        </button>
        <button
          className="btn success"
          onClick={onResolve}
          disabled={!enabled}
        >
          {resolving ? <span className="spinner" /> : <Icon name="i-check" />}
          {resolving ? 'Resolving…' : 'Mark as resolved'}
        </button>
      </div>
    </div>
  );
}
