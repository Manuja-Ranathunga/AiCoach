import { useEffect, useState } from 'react';
import { speechEngine } from '../core/speechEngine';
import './Countdown.css';

const STEPS = ['3', '2', '1', 'Go!'];
const STEP_DURATION_MS = 800;

// 3-2-1 countdown, voice + visual. Reused both for the initial "Start
// Set" and for auto-resuming after a mid-set pause (via `resuming`).
// Speaks directly through speechEngine rather than going through
// feedbackManager's throttling — a deliberate, rapid, one-shot sequence
// isn't a "coaching cue" subject to the nagging-prevention rules, and
// `interrupt: true` + 'critical' priority guarantees it isn't swallowed
// by whatever cue happened to be mid-sentence when the countdown began.
function Countdown({ onComplete, resuming = false }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    speechEngine.speak(STEPS[0], { priority: 'critical', interrupt: true });
  }, []);

  useEffect(() => {
    const isLastStep = stepIndex >= STEPS.length - 1;
    const timer = setTimeout(() => {
      if (isLastStep) {
        onComplete();
        return;
      }
      const next = stepIndex + 1;
      setStepIndex(next);
      speechEngine.speak(STEPS[next], { priority: 'critical', interrupt: true });
    }, STEP_DURATION_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  return (
    <div className="countdown-overlay">
      {resuming && <div className="countdown-label">Resuming...</div>}
      <div key={stepIndex} className="countdown-number">
        {STEPS[stepIndex]}
      </div>
    </div>
  );
}

export default Countdown;
