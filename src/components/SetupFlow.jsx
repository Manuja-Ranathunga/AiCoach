import { useState } from 'react';
import './SetupFlow.css';

const EXERCISES = [{ id: 'squat', name: 'Squat' }];

const VIEW_OPTIONS = [
  { id: 'front', label: 'Front-on', detail: 'Checks knee position + depth' },
  { id: 'side', label: 'Side-on', detail: 'Checks torso lean + depth' },
];

const CHECK_LABELS = {
  full_body_visible: 'Full body visible',
  within_frame_bounds: 'Within frame',
  body_size: 'Good distance',
  stability: 'Holding still',
  lighting: 'Good lighting',
};

const DETECTED_TO_VIEW = { FRONT_ON: 'front', SIDE_ON: 'side' };

// Steps 1-3 of setup: exercise, camera view, live alignment. Step 4 (the
// countdown) is a separate reusable component — see Countdown.jsx —
// started by the parent once onStart fires. Purely presentational: all
// the actual measuring happens in core/setupChecks.js and
// core/orientationDetector.js, fed in as props every frame.
function SetupFlow({ liveChecks, orientationResult, onStart, onSkip }) {
  const [step, setStep] = useState(1);
  const [exercise, setExercise] = useState('squat');
  const [view, setView] = useState(null);

  const allChecksPassed = liveChecks.length > 0 && liveChecks.every((check) => check.passed);

  const detectedView = DETECTED_TO_VIEW[orientationResult.orientation] ?? null;
  const mismatchWarning =
    view && detectedView && detectedView !== view && orientationResult.confidence > 0.3
      ? `You look ${detectedView === 'front' ? 'front-on' : 'side-on'} right now — the camera can only check what matches the view you actually squat in.`
      : null;

  return (
    <div className="setup-flow">
      {step === 3 && <div className="setup-guide-box" />}

      <div className="setup-panel">
        {step === 1 && (
          <div className="setup-step">
            <h2>Choose exercise</h2>
            <div className="setup-options">
              {EXERCISES.map((option) => (
                <button
                  key={option.id}
                  className={`setup-option${exercise === option.id ? ' setup-option-selected' : ''}`}
                  onClick={() => setExercise(option.id)}
                >
                  {option.name}
                </button>
              ))}
            </div>
            <div className="setup-nav">
              <button className="setup-primary-button" onClick={() => setStep(2)}>
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="setup-step">
            <h2>Choose camera view</h2>
            <div className="setup-options">
              {VIEW_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  className={`setup-option${view === option.id ? ' setup-option-selected' : ''}`}
                  onClick={() => setView(option.id)}
                >
                  {option.label}
                  <span className="setup-option-detail">{option.detail}</span>
                </button>
              ))}
            </div>
            {mismatchWarning && <div className="setup-warning">{mismatchWarning}</div>}
            <div className="setup-nav">
              <button className="setup-secondary-button" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="setup-primary-button" disabled={!view} onClick={() => setStep(3)}>
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="setup-step">
            <h2>Get in position</h2>
            <ul className="setup-checklist">
              {liveChecks.map((check) => (
                <li key={check.id} className={`setup-check${check.passed ? ' setup-check-passed' : ''}`}>
                  <span className="setup-check-dot" />
                  <span>{CHECK_LABELS[check.id] ?? check.id}</span>
                </li>
              ))}
            </ul>
            <div className="setup-nav">
              <button className="setup-secondary-button" onClick={() => setStep(2)}>
                Back
              </button>
              <button className="setup-primary-button" disabled={!allChecksPassed} onClick={() => onStart(exercise, view)}>
                Start Set
              </button>
              <button className="setup-skip-button" onClick={() => onSkip(exercise, view ?? 'front')}>
                Skip checks
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SetupFlow;
