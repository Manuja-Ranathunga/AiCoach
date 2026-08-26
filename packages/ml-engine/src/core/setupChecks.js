// Pure pre-set alignment checks. No React, no MediaPipe — each function
// takes a smoothed landmark array (or null) and a config object, and
// returns { id, passed, message, hint }. Bad framing produces bad
// landmarks, which produces wrong coaching, so these run before a set is
// allowed to start (and a subset of them keep running mid-set — see
// CameraView.jsx's framing monitor).

import {
  NOSE,
  LEFT_SHOULDER,
  RIGHT_SHOULDER,
  LEFT_HIP,
  RIGHT_HIP,
  LEFT_KNEE,
  RIGHT_KNEE,
  LEFT_ANKLE,
  RIGHT_ANKLE,
} from './landmarkIndices';

// Every landmark a squat needs to be reliably tracked.
const REQUIRED_LANDMARKS = [
  LEFT_SHOULDER,
  RIGHT_SHOULDER,
  LEFT_HIP,
  RIGHT_HIP,
  LEFT_KNEE,
  RIGHT_KNEE,
  LEFT_ANKLE,
  RIGHT_ANKLE,
];

// A smaller set used for the stability check specifically — the torso +
// upper legs move least from ordinary sway, so they're the most reliable
// signal for "are they actually holding still."
const STABILITY_LANDMARKS = [LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE];

export const SETUP_CHECKS_CONFIG = {
  minVisibility: 0.6, // (a) full body visible — per-landmark visibility floor
  frameMargin: 0.05, // (b) how close to the top/bottom edge counts as "cut off"
  minBodyHeightRatio: 0.5, // (c) body must fill at least this much of the frame height
  maxBodyHeightRatio: 0.9, // (c) ...and no more than this (risk of going out of frame while squatting)
  stabilityWindowMs: 1500, // (d) how long they must hold still before it's confirmed
  stabilityMaxVariance: 0.0004, // (d) allowed positional variance (normalized coords) within that window
  minAverageVisibility: 0.5, // (e) average visibility across required landmarks
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function meanOf(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

const NO_PERSON = (id) => ({ id, passed: false, confidence: 0, message: 'No person detected', hint: 'Step into frame' });

export function checkFullBodyVisible(landmarks, config = SETUP_CHECKS_CONFIG) {
  const id = 'full_body_visible';
  if (!landmarks) return NO_PERSON(id);

  // Graded per landmark (0 = invisible/missing, 1 = at or above the
  // visibility floor) rather than a hard boolean, so the calibration ring
  // can show "almost there" instead of jumping straight from 0 to 100.
  const ratios = REQUIRED_LANDMARKS.map((index) => {
    const point = landmarks[index];
    const visibility = point ? (point.visibility ?? 1) : 0;
    return clamp(visibility / config.minVisibility, 0, 1);
  });
  const confidence = Math.round(meanOf(ratios) * 100);
  const allVisible = ratios.every((ratio) => ratio >= 1);

  return {
    id,
    passed: allVisible,
    confidence,
    message: allVisible ? 'Full body visible' : 'Body not fully visible',
    hint: 'Step back so your whole body is visible',
  };
}

export function checkWithinFrameBounds(landmarks, config = SETUP_CHECKS_CONFIG) {
  const id = 'within_frame_bounds';
  if (!landmarks) return NO_PERSON(id);

  const nose = landmarks[NOSE];
  const leftAnkle = landmarks[LEFT_ANKLE];
  const rightAnkle = landmarks[RIGHT_ANKLE];
  if (!nose || !leftAnkle || !rightAnkle) {
    return { id, passed: false, confidence: 0, message: 'Body not fully visible', hint: 'Step back so your whole body is visible' };
  }

  const ankleY = (leftAnkle.y + rightAnkle.y) / 2;
  // How much room is left before either edge is crossed; full confidence
  // once there's twice the margin's worth of breathing room on the
  // tighter side, zero right at the cutoff line.
  const topSlack = nose.y - config.frameMargin;
  const bottomSlack = 1 - config.frameMargin - ankleY;
  const confidence = Math.round(clamp(Math.min(topSlack, bottomSlack) / (config.frameMargin * 2), 0, 1) * 100);

  if (nose.y < config.frameMargin) {
    return { id, passed: false, confidence, message: 'Head cut off at top', hint: 'Move the camera lower' };
  }
  if (ankleY > 1 - config.frameMargin) {
    return { id, passed: false, confidence, message: 'Feet cut off at bottom', hint: 'Step back' };
  }
  return { id, passed: true, confidence, message: 'Within frame', hint: '' };
}

export function checkBodySize(landmarks, config = SETUP_CHECKS_CONFIG) {
  const id = 'body_size';
  if (!landmarks) return NO_PERSON(id);

  const nose = landmarks[NOSE];
  const leftAnkle = landmarks[LEFT_ANKLE];
  const rightAnkle = landmarks[RIGHT_ANKLE];
  if (!nose || !leftAnkle || !rightAnkle) {
    return { id, passed: false, confidence: 0, message: 'Body not fully visible', hint: 'Step back so your whole body is visible' };
  }

  // Normalized y already runs 0..1 over the frame height, so head-to-ankle
  // distance in that space is directly "fraction of the frame filled".
  const ankleY = (leftAnkle.y + rightAnkle.y) / 2;
  const bodyHeightRatio = ankleY - nose.y;

  // Confidence peaks at the midpoint of the acceptable range and falls
  // off toward either edge, reaching 0 exactly at min/max.
  const mid = (config.minBodyHeightRatio + config.maxBodyHeightRatio) / 2;
  const halfRange = (config.maxBodyHeightRatio - config.minBodyHeightRatio) / 2;
  const confidence = Math.round(clamp(1 - Math.abs(bodyHeightRatio - mid) / halfRange, 0, 1) * 100);

  if (bodyHeightRatio < config.minBodyHeightRatio) {
    return { id, passed: false, confidence, message: 'Too far from camera', hint: 'Step closer' };
  }
  if (bodyHeightRatio > config.maxBodyHeightRatio) {
    return { id, passed: false, confidence, message: 'Too close to camera', hint: 'Step back' };
  }
  return { id, passed: true, confidence, message: 'Good distance', hint: '' };
}

export function checkLighting(landmarks, config = SETUP_CHECKS_CONFIG) {
  const id = 'lighting';
  if (!landmarks) return NO_PERSON(id);

  let total = 0;
  for (const index of REQUIRED_LANDMARKS) {
    total += landmarks[index]?.visibility ?? 1;
  }
  const averageVisibility = total / REQUIRED_LANDMARKS.length;
  const passed = averageVisibility >= config.minAverageVisibility;
  const confidence = Math.round(clamp(averageVisibility / config.minAverageVisibility, 0, 1) * 100);

  return {
    id,
    passed,
    confidence,
    message: passed ? 'Good visibility' : 'Low landmark confidence',
    hint: 'Improve lighting, or wear more fitted clothing',
  };
}

function variance(values) {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}

// Stateful (holds a rolling window of recent positions), unlike the other
// checks above — "holding still" is inherently a multi-frame question.
// Create one instance and keep calling check() on it every frame; call
// reset() if tracking should start over from scratch (e.g. re-entering
// setup).
export class StabilityTracker {
  constructor(config = SETUP_CHECKS_CONFIG) {
    this.config = config;
    this.history = []; // [{ timestampMs, positions: [{x,y}, ...] }]
  }

  reset() {
    this.history = [];
  }

  check(landmarks, timestampMs) {
    const id = 'stability';
    if (!landmarks) {
      this.history = [];
      return NO_PERSON(id);
    }

    const positions = STABILITY_LANDMARKS.map((index) => landmarks[index]);
    if (positions.some((point) => !point)) {
      this.history = [];
      return { id, passed: false, confidence: 0, message: 'Body not fully visible', hint: 'Step back so your whole body is visible' };
    }

    this.history.push({ timestampMs, positions });
    const cutoff = timestampMs - this.config.stabilityWindowMs;
    this.history = this.history.filter((frame) => frame.timestampMs >= cutoff);

    const oldest = this.history[0].timestampMs;
    const windowCovered = timestampMs - oldest >= this.config.stabilityWindowMs * 0.9;
    if (!windowCovered) {
      // Partial credit while the window is still filling, capped well
      // below the pass line so an in-progress check never reads as
      // "confirmed" on the calibration ring.
      const coverage = clamp((timestampMs - oldest) / this.config.stabilityWindowMs, 0, 1);
      return { id, passed: false, confidence: Math.round(coverage * 50), message: 'Checking stability...', hint: 'Hold still' };
    }

    let totalVariance = 0;
    for (let i = 0; i < STABILITY_LANDMARKS.length; i += 1) {
      totalVariance += variance(this.history.map((frame) => frame.positions[i].x));
      totalVariance += variance(this.history.map((frame) => frame.positions[i].y));
    }
    const avgVariance = totalVariance / STABILITY_LANDMARKS.length;
    const passed = avgVariance <= this.config.stabilityMaxVariance;
    const confidence = Math.round(clamp(1 - avgVariance / this.config.stabilityMaxVariance, 0, 1) * 100);

    return {
      id,
      passed,
      confidence,
      message: passed ? 'Holding still' : 'Still moving',
      hint: 'Hold still',
    };
  }
}

// Rolls every individual check's graded confidence into one 0-100 number
// for a single "how close are we" readout (the calibration ring). Falls
// back to pass/fail as 100/0 for any check missing a confidence field —
// keeps this safe for callers passing hand-built objects (e.g. tests).
export function aggregateConfidence(checks) {
  if (!checks || checks.length === 0) return 0;
  const total = checks.reduce((sum, check) => sum + (check.confidence ?? (check.passed ? 100 : 0)), 0);
  return Math.round(total / checks.length);
}

// The four checks relevant to mid-set monitoring — "can we still trust
// this framing," not "are they holding still" (a squat is supposed to
// move). Used by CameraView's pause/resume monitor.
export function runFramingChecks(landmarks, config = SETUP_CHECKS_CONFIG) {
  return [
    checkFullBodyVisible(landmarks, config),
    checkWithinFrameBounds(landmarks, config),
    checkBodySize(landmarks, config),
    checkLighting(landmarks, config),
  ];
}
