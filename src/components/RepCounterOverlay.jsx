import './RepCounterOverlay.css';

// Large, always-visible rep count + current state name. The state label
// is mainly for debugging the state machine while squatting in front of
// the camera, where the 'd' debug panel is awkward to read at a glance.
function RepCounterOverlay({ repCount, state, onReset }) {
  return (
    <div className="rep-counter-overlay">
      <div className="rep-count">{repCount}</div>
      <div className="rep-state">{state}</div>
      <button className="rep-reset-button" onClick={onReset}>
        Reset
      </button>
    </div>
  );
}

export default RepCounterOverlay;
