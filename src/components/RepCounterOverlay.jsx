import './RepCounterOverlay.css';

// Large, always-visible valid/attempted rep counts + current state name.
// The state label is mainly for debugging the state machine while
// squatting in front of the camera, where the 'd' debug panel is
// awkward to read at a glance. Orientation is the manual front/side
// toggle ('o') standing in for Phase 7's real camera-angle detection.
function RepCounterOverlay({ validReps, totalAttempts, state, orientation, onReset }) {
  return (
    <div className="rep-counter-overlay">
      <div className="rep-count">
        {validReps} / {totalAttempts}
      </div>
      <div className="rep-count-label">Valid / Attempts</div>
      <div className="rep-state">
        {state} · {orientation} (o to toggle)
      </div>
      <button className="rep-reset-button" onClick={onReset}>
        Reset
      </button>
    </div>
  );
}

export default RepCounterOverlay;
