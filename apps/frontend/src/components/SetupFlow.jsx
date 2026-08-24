import { useEffect, useState } from 'react';
import { aggregateConfidence, getSeverityColor } from '@ai-coach/ml-engine';
import { getExercises } from '../data/exercises';
import ExerciseIcon from './ExerciseIcon';
import ProgressRing from './ProgressRing';
import './SetupFlow.css';

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

function ExerciseCard({ exercise, selected, onSelect }) {
  const locked = !onSelect;

  return (
    <button
      type="button"
      className={`exercise-card${selected ? ' exercise-card-selected' : ''}${locked ? ' exercise-card-locked' : ''}`}
      onClick={onSelect}
      disabled={locked}
    >
      <div className="exercise-card-header">
        <span className="exercise-card-name">{exercise.name}</span>
        {locked && <span className="exercise-card-lock-badge">Coming soon</span>}
      </div>
      <div className="exercise-card-icon">
        <ExerciseIcon exercise={exercise.id} />
      </div>
      <div className="exercise-card-tags">
        <span className="exercise-tag exercise-tag-difficulty">{exercise.difficulty}</span>
        <span className="exercise-tag">{exercise.muscle_group}</span>
      </div>
    </button>
  );
}

function ExerciseDetail({ exercise }) {
  if (!exercise) return null;

  return (
    <div className="exercise-detail">
      <div className="exercise-detail-eyebrow">Selected exercise</div>
      <h3 className="exercise-detail-name">{exercise.name}</h3>
      <p className="exercise-detail-description">{exercise.description}</p>
      <div className="exercise-card-tags">
        <span className="exercise-tag exercise-tag-difficulty">{exercise.difficulty}</span>
        <span className="exercise-tag">{exercise.muscle_group}</span>
      </div>
    </div>
  );
}

// Steps 1-3 of setup: exercise, camera view, live alignment. Step 4 (the
// countdown) is a separate reusable component — see Countdown.jsx —
// started by the parent once onStart fires. Purely presentational: all
// the actual measuring happens in core/setupChecks.js and
// core/orientationDetector.js, fed in as props every frame.
function SetupFlow({ liveChecks, orientationResult, onStart, onSkip }) {
  const [step, setStep] = useState(1);
  const [exercise, setExercise] = useState('squat');
  const [view, setView] = useState(null);
  // Loaded through getExercises() rather than imported as a constant —
  // that single function is the seam a future GET /exercises call slots
  // into with no changes here.
  const [exercises, setExercises] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getExercises().then((list) => {
      if (!cancelled) setExercises(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const allChecksPassed = liveChecks.length > 0 && liveChecks.every((check) => check.passed);
  const confidence = aggregateConfidence(liveChecks);

  const detectedView = DETECTED_TO_VIEW[orientationResult.orientation] ?? null;
  const mismatchWarning =
    view && detectedView && detectedView !== view && orientationResult.confidence > 0.3
      ? `You look ${detectedView === 'front' ? 'front-on' : 'side-on'} right now — the camera can only check what matches the view you actually squat in.`
      : null;

  const selectedExercise = exercises.find((option) => option.id === exercise) ?? null;
  const hasLockedExercises = exercises.some((option) => option.status !== 'available');

  return (
    <div className="setup-flow">
      {step === 3 && <div className="setup-guide-box" />}

      <div className={`setup-panel${step === 1 ? ' setup-panel-wide' : ''}`}>
        {step === 1 && (
          <div className="setup-step">
            <h2>Choose exercise</h2>
            {hasLockedExercises && (
              <p className="setup-step-subtitle">Only Squat is available right now — more exercises are coming soon.</p>
            )}
            <div className="exercise-picker">
              <div className="exercise-grid">
                {exercises.map((option) => (
                  <ExerciseCard
                    key={option.id}
                    exercise={option}
                    selected={option.id === exercise}
                    onSelect={option.status === 'available' ? () => setExercise(option.id) : undefined}
                  />
                ))}
              </div>
              <ExerciseDetail exercise={selectedExercise} />
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
            <div className="calibration-layout">
              <ProgressRing percent={confidence} label={allChecksPassed ? 'Ready' : 'Calibrating'} />
              <ul className="setup-checklist">
                {liveChecks.map((check) => {
                  const severity = check.passed ? 'good' : (check.confidence ?? 0) >= 50 ? 'warning' : 'critical';
                  return (
                    <li
                      key={check.id}
                      className={`setup-check${check.passed ? ' setup-check-passed' : ''}`}
                      style={{ '--check-color': getSeverityColor(severity) }}
                    >
                      <span className="setup-check-dot" />
                      <span>{CHECK_LABELS[check.id] ?? check.id}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
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
