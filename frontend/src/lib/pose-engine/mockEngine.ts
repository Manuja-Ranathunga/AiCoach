import { cuesFor } from './cues';
import type {
  CalibrationCheck,
  CalibrationState,
  PoseEngineCallbacks,
  PoseEngineFactory,
  PoseEngineHandle,
} from './types';

const REP_TEMPO_SECONDS = 2.2;
const CORRECT_PROBABILITY = 0.72;

function buildChecks(stage: 0 | 1 | 2): CalibrationCheck[] {
  return [
    {
      id: 'lighting',
      label: 'Lighting',
      status: stage >= 0 ? 'pass' : 'pending',
      message: stage >= 0 ? 'Even exposure, no backlight detected.' : 'Checking exposure…',
    },
    {
      id: 'framing',
      label: 'Framing & distance',
      status: stage >= 1 ? 'pass' : stage === 0 ? 'warn' : 'pending',
      message: stage >= 1 ? 'Distance and framing confirmed.' : 'Step back so your knees are visible.',
    },
    {
      id: 'visibility',
      label: 'Pose visibility',
      status: stage >= 2 ? 'pass' : 'pending',
      message: stage >= 2 ? 'Full body in frame.' : 'Waiting on framing to resolve.',
    },
  ];
}

export const createMockPoseEngine: PoseEngineFactory = (
  _video: HTMLVideoElement,
  exerciseSlug: string,
  callbacks: PoseEngineCallbacks,
): PoseEngineHandle => {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const intervals = new Set<ReturnType<typeof setInterval>>();

  const after = (ms: number, fn: () => void) => {
    const id = setTimeout(fn, ms);
    timers.add(id);
    return id;
  };

  const every = (ms: number, fn: () => void) => {
    const id = setInterval(fn, ms);
    intervals.add(id);
    return id;
  };

  function emitCalibration(stage: 0 | 1 | 2) {
    const checks = buildChecks(stage);
    const state: CalibrationState = {
      checks,
      allPassed: stage === 2,
      distanceMeters: stage >= 1 ? 2.1 : 1.2,
      confidence: stage === 2 ? 0.94 : null,
      fps: stage === 2 ? 28 : null,
      keypointsVisible: stage === 2 ? 17 : 13,
      keypointsTotal: 17,
    };
    callbacks.onCalibrationUpdate?.(state);
  }

  function startCalibration() {
    emitCalibration(0);
    after(1400, () => emitCalibration(1));
    after(2400, () => emitCalibration(2));
  }

  function stopCalibration() {
    timers.forEach(clearTimeout);
    timers.clear();
  }

  function startTracking(targetReps: number) {
    const bank = cuesFor(exerciseSlug);
    let repIndex = 0;
    let phase = 0;

    const frameTimer = every(60, () => {
      phase = (phase + 0.06) % 1;
      callbacks.onFrame?.({ phase, state: 'neutral', fps: 28 });
    });

    const repTimer = every(REP_TEMPO_SECONDS * 1000, () => {
      repIndex += 1;
      const correct = Math.random() < CORRECT_PROBABILITY;
      const bankIssue = correct
        ? null
        : bank.possibleIssues[Math.floor(Math.random() * bank.possibleIssues.length)];

      callbacks.onRep?.({
        index: repIndex,
        correct,
        quality: correct ? 0.85 + Math.random() * 0.15 : 0.4 + Math.random() * 0.25,
        tempoSeconds: REP_TEMPO_SECONDS + (Math.random() - 0.5) * 0.4,
        deepestAngleDegrees: correct ? 85 + Math.random() * 10 : 105 + Math.random() * 15,
        issues: bankIssue ? [{ type: bankIssue.type, label: bankIssue.label, detail: bankIssue.detail }] : [],
        caption: correct
          ? bank.correctCaptions[Math.floor(Math.random() * bank.correctCaptions.length)]
          : bankIssue!.warnCaption,
      });

      if (repIndex >= targetReps) {
        clearInterval(repTimer);
        clearInterval(frameTimer);
        callbacks.onSetComplete?.();
      }
    });
  }

  function stopTracking() {
    intervals.forEach(clearInterval);
    intervals.clear();
  }

  function destroy() {
    stopCalibration();
    stopTracking();
  }

  return { startCalibration, stopCalibration, startTracking, stopTracking, destroy };
};
