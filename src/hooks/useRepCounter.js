import { useState } from 'react';
import { RepStateMachine } from '../core/repStateMachine';

// Thin React wrapper around RepStateMachine. The machine instance itself
// is created once (lazy useState initializer) and never replaced; update()
// is meant to be called once per animation frame from the detection loop.
export function useRepCounter() {
  const [machine] = useState(() => new RepStateMachine());

  const [state, setState] = useState(machine.state);
  const [repCount, setRepCount] = useState(machine.repCount);
  const [reps, setReps] = useState([]);

  const update = (metrics, timestampMs) => {
    const result = machine.update(metrics, timestampMs);

    // React skips a re-render when a state setter receives the same
    // value as before (Object.is comparison), so calling these every
    // frame is safe — only an actual state/repCount change triggers work.
    setState(result.state);
    setRepCount(result.repCount);
    if (result.justCompletedRep) {
      setReps((prev) => [...prev, result.justCompletedRep]);
    }

    return result;
  };

  const reset = () => {
    machine.reset();
    setState(machine.state);
    setRepCount(machine.repCount);
    setReps([]);
  };

  return { state, repCount, reps, update, reset };
}
