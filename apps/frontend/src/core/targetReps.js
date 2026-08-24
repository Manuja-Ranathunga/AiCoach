// Pure helpers for the target-rep-count feature. No React, no app state —
// just the default/bounds and the comparison used to decide when an active
// set should auto-end because the target was hit (see CameraView's
// detection loop, which reads targetRepsRef and calls hasReachedTarget
// right when a rep completes).

export const DEFAULT_TARGET_REPS = 10;
export const MIN_TARGET_REPS = 1;
export const MAX_TARGET_REPS = 100;

export function clampTargetReps(value) {
  if (typeof value === 'string' && value.trim() === '') return DEFAULT_TARGET_REPS;
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return DEFAULT_TARGET_REPS;
  return Math.min(MAX_TARGET_REPS, Math.max(MIN_TARGET_REPS, number));
}

export function hasReachedTarget(validReps, targetReps) {
  return validReps >= targetReps;
}
