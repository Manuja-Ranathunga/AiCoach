// Pure front-on / side-on camera orientation detection. No React.
//
// Approach: a person facing the camera has shoulders (and ankles) spread
// wide relative to torso height; turned to the side, both landmarks of a
// pair nearly coincide in the 2D projection, so that spread collapses
// toward zero. Averaging shoulder-spread and ankle-spread (both relative
// to torso height, so it's scale-invariant) gives one ratio; the result
// is smoothed over a rolling window so a single noisy frame can't flip
// the answer.

import { LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_HIP, RIGHT_HIP, LEFT_ANKLE, RIGHT_ANKLE } from './landmarkIndices';
import { distance, midpoint, toAspectSpace } from './geometry';

export const ORIENTATIONS = {
  FRONT_ON: 'FRONT_ON',
  SIDE_ON: 'SIDE_ON',
  AMBIGUOUS: 'AMBIGUOUS',
};

// All tunable on real bodies without touching the logic below.
export const ORIENTATION_CONFIG = {
  frontRatioMin: 0.35, // spread/torsoHeight at or above this reads as front-on
  sideRatioMax: 0.18, // ...at or below this reads as side-on
  // Between sideRatioMax and frontRatioMin is a deliberate dead zone —
  // AMBIGUOUS rather than guessing, so a 45-degree stance doesn't get
  // confidently misclassified as either.
  smoothingWindowMs: 1000, // rolling window the ratio is averaged over
  minSamples: 5, // need at least this many frames in the window before answering
};

function computeRatio(landmarks, aspectRatio) {
  const ls = landmarks[LEFT_SHOULDER];
  const rs = landmarks[RIGHT_SHOULDER];
  const lh = landmarks[LEFT_HIP];
  const rh = landmarks[RIGHT_HIP];
  const la = landmarks[LEFT_ANKLE];
  const ra = landmarks[RIGHT_ANKLE];
  if (!ls || !rs || !lh || !rh || !la || !ra) return null;

  const leftShoulder = toAspectSpace(ls, aspectRatio);
  const rightShoulder = toAspectSpace(rs, aspectRatio);
  const leftHip = toAspectSpace(lh, aspectRatio);
  const rightHip = toAspectSpace(rh, aspectRatio);
  const leftAnkle = toAspectSpace(la, aspectRatio);
  const rightAnkle = toAspectSpace(ra, aspectRatio);

  const torsoHeight = distance(midpoint(leftShoulder, rightShoulder), midpoint(leftHip, rightHip));
  if (torsoHeight === 0) return null;

  const shoulderRatio = distance(leftShoulder, rightShoulder) / torsoHeight;
  const ankleRatio = distance(leftAnkle, rightAnkle) / torsoHeight;
  return (shoulderRatio + ankleRatio) / 2;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

// Stateful (rolling window), like StabilityTracker in setupChecks.js.
// Create one instance and call update() every frame.
export class OrientationDetector {
  constructor(config = ORIENTATION_CONFIG) {
    this.config = config;
    this.history = []; // [{ timestampMs, ratio }]
  }

  reset() {
    this.history = [];
  }

  // Returns { orientation, confidence } — confidence is 0 for AMBIGUOUS.
  update(landmarks, aspectRatio, timestampMs) {
    if (!landmarks) {
      this.history = [];
      return { orientation: ORIENTATIONS.AMBIGUOUS, confidence: 0 };
    }

    const ratio = computeRatio(landmarks, aspectRatio);
    if (ratio === null) return { orientation: ORIENTATIONS.AMBIGUOUS, confidence: 0 };

    this.history.push({ timestampMs, ratio });
    const cutoff = timestampMs - this.config.smoothingWindowMs;
    this.history = this.history.filter((frame) => frame.timestampMs >= cutoff);

    if (this.history.length < this.config.minSamples) {
      return { orientation: ORIENTATIONS.AMBIGUOUS, confidence: 0 };
    }

    const avgRatio = this.history.reduce((sum, frame) => sum + frame.ratio, 0) / this.history.length;

    if (avgRatio >= this.config.frontRatioMin) {
      return {
        orientation: ORIENTATIONS.FRONT_ON,
        confidence: clamp01((avgRatio - this.config.frontRatioMin) / this.config.frontRatioMin),
      };
    }
    if (avgRatio <= this.config.sideRatioMax) {
      return {
        orientation: ORIENTATIONS.SIDE_ON,
        confidence: clamp01((this.config.sideRatioMax - avgRatio) / this.config.sideRatioMax),
      };
    }
    return { orientation: ORIENTATIONS.AMBIGUOUS, confidence: 0 };
  }
}
