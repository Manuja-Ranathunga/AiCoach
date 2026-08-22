import './RepCounterOverlay.css';

// Big, always-visible rep counter: validReps is the headline number,
// totalAttempts sits smaller beneath it. pulseKey changes only when a
// VALID rep just completed (see CameraView.jsx) — keying the number span
// on it remounts the element and replays the scale-up CSS animation,
// including for reps that finish back-to-back.
function RepCounterOverlay({ validReps, totalAttempts, pulseKey, onReset }) {
  return (
    <div className="rep-counter-overlay">
      <div key={pulseKey ?? 'idle'} className={`rep-count${pulseKey ? ' rep-count-pulse' : ''}`}>
        {validReps}
      </div>
      <div className="rep-count-attempts">{totalAttempts} attempts</div>
      <button className="rep-reset-button" onClick={onReset}>
        Reset
      </button>
    </div>
  );
}

export default RepCounterOverlay;
