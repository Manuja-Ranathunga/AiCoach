import { useEffect, useState } from 'react';
import { speechEngine } from '@ai-coach/ml-engine';
import { DEFAULT_COUNTDOWN_SECONDS } from '../core/sessionOptions';
import './Countdown.css';

// One real second per number (see the CONFIGURING step's countdown-length
// dropdown — its options are labeled in seconds, so the step duration has
// to actually be a second to match).
const STEP_DURATION_MS = 1000;

function buildSteps(seconds) {
  const steps = [];
  for (let n = seconds; n >= 1; n--) steps.push(String(n));
  steps.push('Go!');
  return steps;
}

// Counts down from `seconds` (configured on the CONFIGURING step, default
// 3), voice + visual. Reused both for the initial "Start Set" and for
// auto-resuming after a mid-set pause (via `resuming`) — pause-resume uses
// the same configured length as the original start. Speaks directly
// through speechEngine rather than going through feedbackManager's
// throttling — a deliberate, rapid, one-shot sequence isn't a "coaching
// cue" subject to the nagging-prevention rules, and `interrupt: true` +
// 'critical' priority guarantees it isn't swallowed by whatever cue
// happened to be mid-sentence when the countdown began.
function Countdown({ onComplete, resuming = false, seconds = DEFAULT_COUNTDOWN_SECONDS }) {
  const [steps] = useState(() => buildSteps(seconds));
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    speechEngine.speak(steps[0], { priority: 'critical', interrupt: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const isLastStep = stepIndex >= steps.length - 1;
    const timer = setTimeout(() => {
      if (isLastStep) {
        onComplete();
        return;
      }
      const next = stepIndex + 1;
      setStepIndex(next);
      speechEngine.speak(steps[next], { priority: 'critical', interrupt: true });
    }, STEP_DURATION_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  return (
    <div className="countdown-overlay">
      {resuming && <div className="countdown-label">Resuming...</div>}
      <div key={stepIndex} className="countdown-number">
        {steps[stepIndex]}
      </div>
    </div>
  );
}

export default Countdown;
