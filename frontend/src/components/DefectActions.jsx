import { Icon } from './Icons.jsx';

/**
 * Action buttons for a defect pin.
 *
 * Active pin (status in {new, acknowledged, dispatched}):
 *   - Dispatch crew now
 *   - Acknowledge (only valid from 'new')
 *   - Mark as resolved
 *
 * Resolved pin (status='resolved'):
 *   - Reopen — sends pin back to its prior active status
 *
 * Reused by DefectDetail (full page) and MapFocusPopup (overlay).
 *
 * `pendingAction`: name of the in-flight mutation ('acknowledge' | 'resolve'
 * | 'reopen' | null). The matching button shows an inline spinner; all
 * others are disabled to prevent racing requests.
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
  const isNew = pinStatus === 'new';
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
          disabled={!enabled || !isNew}
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
