import './RepCounterOverlay.css';

// Big, always-visible rep counter: validReps is the headline number,
// totalAttempts sits smaller beneath it. pulseKey changes only when a
// VALID rep just completed (see CameraView.jsx) — keying the number span
// on it remounts the element and replays the scale-up CSS animation,
// including for reps that finish back-to-back. setNumber (sessionSets
// already tracked by CameraView, plus the one in progress) is display
// only — there's no fixed number of sets planned to show it "of".
function RepCounterOverlay({ validReps, totalAttempts, setNumber, pulseKey, onReset, onEndSet }) {
  return (
    <div className="rep-counter-overlay">
      {setNumber != null && <div className="rep-counter-set-label">Set {setNumber}</div>}
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
