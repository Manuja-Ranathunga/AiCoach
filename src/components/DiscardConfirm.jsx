import './DiscardConfirm.css';

// Shown when the user tries to end a set with fewer than 3 reps — almost
// certainly a mis-trigger (accidental "End Set" press, or the 20s idle
// auto-end firing before they really started) rather than a real set
// worth a summary. Discarding clears the false start and keeps the
// camera/session running; keeping it just closes this and does nothing.
function DiscardConfirm({ repCount, onDiscard, onKeepGoing }) {
  return (
    <div className="discard-confirm-overlay">
      <div className="discard-confirm-panel">
        <p className="discard-confirm-title">
          End set with only {repCount} rep{repCount === 1 ? '' : 's'}?
        </p>
        <p className="discard-confirm-body">That's probably not a real set — want to discard it and keep going?</p>
        <div className="discard-confirm-actions">
          <button className="discard-confirm-keep" onClick={onKeepGoing}>
            Keep Going
          </button>
          <button className="discard-confirm-discard" onClick={onDiscard}>
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

export default DiscardConfirm;
