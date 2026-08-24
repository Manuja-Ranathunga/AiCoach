import { useState } from 'react';
import './SessionConfig.css';
import { clampTargetReps } from '../core/targetReps';
import { COUNTDOWN_SECONDS_OPTIONS, IDLE_TIMEOUT_OPTIONS_MS, isValidCountdownSeconds, isValidIdleTimeoutMs } from '../core/sessionOptions';

function formatIdleTimeoutLabel(ms) {
  return `${ms / 1000}s`;
}

// Shown between the alignment checklist passing and the countdown: lets
// the user set the target rep count, countdown length, and idle timeout
// for the set about to start. Purely presentational, same shape as
// SetupFlow's steps — local input state, validated/clamped on confirm,
// handed up via onConfirm so CameraView can stash it in refs (both for the
// detection loop/Countdown to read and as next time's defaults — see
// CameraView's comment on targetRepsRef).
function SessionConfig({ defaults, onConfirm }) {
  const [targetReps, setTargetReps] = useState(String(defaults.targetReps));
  const [countdownSeconds, setCountdownSeconds] = useState(defaults.countdownSeconds);
  const [idleTimeoutMs, setIdleTimeoutMs] = useState(defaults.idleTimeoutMs);

  const handleConfirm = () => {
    onConfirm({
      targetReps: clampTargetReps(targetReps),
      countdownSeconds: isValidCountdownSeconds(countdownSeconds) ? countdownSeconds : defaults.countdownSeconds,
      idleTimeoutMs: isValidIdleTimeoutMs(idleTimeoutMs) ? idleTimeoutMs : defaults.idleTimeoutMs,
    });
  };

  return (
    <div className="session-config">
      <div className="session-config-panel">
        <h2>Set up your set</h2>

        <label className="session-config-field">
          <span className="session-config-label">Target reps</span>
          <span className="session-config-detail">Ends the set automatically once you hit this many valid reps.</span>
          <input
            type="number"
            className="session-config-input"
            value={targetReps}
            onChange={(event) => setTargetReps(event.target.value)}
          />
        </label>

        <label className="session-config-field">
          <span className="session-config-label">Countdown</span>
          <span className="session-config-detail">How long the 3-2-1 before starting lasts.</span>
          <select
            className="session-config-select"
            value={countdownSeconds}
            onChange={(event) => setCountdownSeconds(Number(event.target.value))}
          >
            {COUNTDOWN_SECONDS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} secs
              </option>
            ))}
          </select>
        </label>

        <label className="session-config-field">
          <span className="session-config-label">Inactivity timeout</span>
          <span className="session-config-detail">Auto-ends the set after standing still this long between reps.</span>
          <select
            className="session-config-select"
            value={idleTimeoutMs}
            onChange={(event) => setIdleTimeoutMs(Number(event.target.value))}
          >
            {IDLE_TIMEOUT_OPTIONS_MS.map((option) => (
              <option key={option} value={option}>
                {formatIdleTimeoutLabel(option)}
              </option>
            ))}
          </select>
        </label>

        <div className="session-config-nav">
          <button className="session-config-primary-button" onClick={handleConfirm}>
            Start Set
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionConfig;
