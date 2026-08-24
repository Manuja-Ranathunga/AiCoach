import { useState } from 'react';
import './TargetRepsSetup.css';
import { MIN_TARGET_REPS, MAX_TARGET_REPS, clampTargetReps } from '../core/targetReps';

// Shown between the alignment checklist passing and the countdown. Purely
// presentational, same shape as SetupFlow's steps: local input state,
// clamped on confirm, handed up via onConfirm so CameraView can stash it
// in targetRepsRef (both for the detection loop's target-reached check and
// as next time's default — see its comment).
function TargetRepsSetup({ defaultTarget, onConfirm }) {
  const [value, setValue] = useState(String(defaultTarget));

  const handleConfirm = () => {
    onConfirm(clampTargetReps(value));
  };

  return (
    <div className="target-reps-setup">
      <div className="target-reps-panel">
        <h2>Set your target</h2>
        <p className="target-reps-detail">The set ends automatically once you hit this many valid reps.</p>
        <input
          type="number"
          className="target-reps-input"
          min={MIN_TARGET_REPS}
          max={MAX_TARGET_REPS}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <div className="target-reps-nav">
          <button className="target-reps-primary-button" onClick={handleConfirm}>
            Start Set
          </button>
        </div>
      </div>
    </div>
  );
}

export default TargetRepsSetup;
