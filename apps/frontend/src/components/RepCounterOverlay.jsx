import './RepCounterOverlay.css';

// Big, always-visible rep counter: validReps is the headline number,
// totalAttempts sits smaller beneath it. pulseKey changes only when a
// VALID rep just completed (see CameraView.jsx) — keying the number span
// on it remounts the element and replays the scale-up CSS animation,
// including for reps that finish back-to-back.
function RepCounterOverlay({ validReps, totalAttempts, pulseKey, onReset, onEndSet }) {
  return (
    <div className="rep-counter-overlay">
      <div key={pulseKey ?? 'idle'} className={`rep-count${pulseKey ? ' rep-count-pulse' : ''}`}>
        {validReps}
      </div>
      <div className="rep-count-attempts">{totalAttempts} attempts</div>
      <div className="rep-counter-buttons">
        <button className="rep-end-set-button" onClick={onEndSet}>
          End Set
        </button>
        <button className="rep-reset-button" onClick={onReset}>
          Reset
        </button>
      </div>
    </div>
  );
}

export default RepCounterOverlay;
