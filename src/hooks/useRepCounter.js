import { useState } from 'react';
import { RepStateMachine } from '../core/repStateMachine';

// Thin React wrapper around RepStateMachine. The machine instance itself
// is created once (lazy useState initializer) and never replaced; update()
// is meant to be called once per animation frame from the detection loop.
export function useRepCounter() {
  const [machine] = useState(() => new RepStateMachine());

  const [state, setState] = useState(machine.state);
  const [totalAttempts, setTotalAttempts] = useState(machine.repCount);
  const [validReps, setValidReps] = useState(machine.validReps);
  const [reps, setReps] = useState([]);
  const [activeErrors, setActiveErrors] = useState([]);
  const [orientation, setOrientationState] = useState(machine.orientation);

  const update = (metrics, timestampMs) => {
    const result = machine.update(metrics, timestampMs);

    // React skips a re-render when a state setter receives the same
    // value as before (Object.is comparison), so calling these every
    // frame is safe — only an actual change triggers work. activeErrors
    // is a new array each frame, so it always re-renders while any error
    // is active; that's the point (it's a live "right now" display).
    setState(result.state);
    setTotalAttempts(result.totalAttempts);
    setValidReps(result.validReps);
    setActiveErrors(result.activeErrors);
    if (result.justCompletedRep) {
      setReps((prev) => [...prev, result.justCompletedRep]);
    }

    return result;
  };

  const reset = () => {
    machine.reset();
    setState(machine.state);
    setTotalAttempts(machine.repCount);
    setValidReps(machine.validReps);
    setReps([]);
    setActiveErrors([]);
  };

  const setOrientation = (next) => {
    machine.setOrientation(next);
    setOrientationState(next);
  };

  // Discards the in-progress rep (if any) without touching session
  // counters — for when a mid-set pause means its data can't be trusted.
  const abandonCurrentRep = () => {
    machine.abandonCurrentRep();
    setState(machine.state);
  };

  // Reads the machine's rep array directly rather than the `reps` React
  // state above. Needed by the detection loop's end-of-set logic, which
  // runs inside an effect whose closure is only refreshed when the
  // camera/model change (see CameraView.jsx) — `reps` state there would
  // be frozen at whatever it was on that render, but the machine instance
  // itself never changes, so calling through to it always reads live data.
  const getReps = () => machine.getReps();

  return {
    state,
    totalAttempts,
    validReps,
    reps,
    activeErrors,
    orientation,
    update,
    reset,
    setOrientation,
    abandonCurrentRep,
    getReps,
  };
}
