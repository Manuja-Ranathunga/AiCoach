// Form checks: pure rules that judge already-measured metrics against
// thresholds. This file never touches React, MediaPipe, or raw
// landmarks — only the metrics objects produced by e.g. getSquatMetrics()
// and the numbers from an exercise config (see exercises/squatConfig.js).
//
// Each check is an object, not a bare function, so it can carry metadata
// (id/severity/message/timing/applicability) alongside its pure
// `evaluate` test. That metadata is exactly what the generic
// evaluateChecks() runner below needs — so adding a fourth check is just
// adding one more object to the CHECKS array, no changes anywhere else.

// evaluate(metrics, repContext, thresholds) -> { value, threshold } | null
// `metrics` is this frame's getSquatMetrics() result (perFrame checks) or
// null (completion checks, which read repContext instead).
// `repContext` is the in-progress rep record (running min/max values).

function evaluateDepth(metrics, repContext, thresholds) {
  const threshold = thresholds.depthMaxKneeAngle;
  if (repContext.minKneeAngle > threshold) {
    return { value: repContext.minKneeAngle, threshold };
  }
  return null;
}

function evaluateKneeValgus(metrics, repContext, thresholds) {
  const threshold = thresholds.valgusToleranceRatio;
  const worstDeviation = Math.max(metrics.kneeDeviationL, metrics.kneeDeviationR);
  if (worstDeviation > threshold) {
    return { value: worstDeviation, threshold };
  }
  return null;
}

function evaluateTorsoLean(metrics, repContext, thresholds) {
  const threshold = thresholds.maxTorsoAngle;
  if (metrics.torsoAngle > threshold) {
    return { value: metrics.torsoAngle, threshold };
  }
  return null;
}

export const CHECKS = [
  {
    id: 'insufficient_depth',
    severity: 'critical',
    message: 'Go deeper',
    // Evaluated once, from the rep's final summary — not every frame.
    timing: 'completion',
    isApplicable: () => true, // depth works from any camera angle
    evaluate: evaluateDepth,
  },
  {
    id: 'knee_valgus',
    severity: 'critical',
    message: 'Push your knees out',
    timing: 'perFrame',
    activeStates: ['DESCENDING', 'BOTTOM'],
    // Sideways knee drift is only measurable when the camera is looking
    // at the front of the body. Real detection lands in Phase 7.
    isApplicable: (orientation) => orientation === 'front',
    evaluate: evaluateKneeValgus,
  },
  {
    id: 'excessive_lean',
    severity: 'warning',
    message: 'Chest up',
    timing: 'perFrame',
    activeStates: ['DESCENDING', 'BOTTOM'],
    // Forward lean is only measurable in profile. Real detection lands
    // in Phase 7.
    isApplicable: (orientation) => orientation === 'side',
    evaluate: evaluateTorsoLean,
  },
];

// Runs every applicable check for one phase ('perFrame' or 'completion')
// and returns the raw (un-debounced) list of failures this instant.
// Debouncing (requiring N consecutive failing frames before an error
// "counts") happens one layer up, in ErrorTracker — this function just
// answers "which checks fail right now."
export function evaluateChecks(checks, { phase, state, metrics, repContext, thresholds, orientation }) {
  const failures = [];

  for (const check of checks) {
    if (check.timing !== phase) continue;
    if (phase === 'perFrame' && !check.activeStates.includes(state)) continue;
    if (!check.isApplicable(orientation)) continue;

    const result = check.evaluate(metrics, repContext, thresholds);
    if (result) {
      failures.push({
        id: check.id,
        severity: check.severity,
        message: check.message,
        value: result.value,
        threshold: result.threshold,
      });
    }
  }

  return failures;
}

// Confirms a form error only after it has been active for N consecutive
// frames. A single noisy/jittery frame (a knee angle spiking past a
// threshold for one frame due to landmark noise) must never flag an
// error — the smoothing in core/smoothing.js already removes most of
// this, but debouncing here is cheap insurance against what's left,
// exactly like the hysteresis in repStateMachine.js exists for the same
// reason.
export class ErrorTracker {
  constructor(confirmFrames = 4) {
    this.confirmFrames = confirmFrames;
    this.entries = new Map(); // id -> { streak, frameCount, worstValue, severity, message }
    this.confirmedIds = new Set();
  }

  reset() {
    this.entries.clear();
    this.confirmedIds.clear();
  }

  // Call once per frame with this frame's raw check failures (from
  // evaluateChecks). Advances each failing id's consecutive streak and
  // its cumulative frame count; any tracked id that didn't fail this
  // frame has its streak reset to 0 (breaking "consecutive"), but keeps
  // its frame count and confirmed status from earlier in the rep.
  update(rawErrors) {
    const presentIds = new Set(rawErrors.map((error) => error.id));

    for (const error of rawErrors) {
      let entry = this.entries.get(error.id);
      if (!entry) {
        entry = { streak: 0, frameCount: 0, worstValue: error.value, severity: error.severity, message: error.message };
        this.entries.set(error.id, entry);
      }

      entry.streak += 1;
      entry.frameCount += 1;
      if (Math.abs(error.value) > Math.abs(entry.worstValue)) entry.worstValue = error.value;

      if (entry.streak >= this.confirmFrames) this.confirmedIds.add(error.id);
    }

    for (const [id, entry] of this.entries) {
      if (!presentIds.has(id)) entry.streak = 0;
    }
  }

  // Directly confirms a completion-check failure (depth). These are
  // evaluated once from the rep's already-settled summary, so there's no
  // "consecutive frames" to debounce — the single evaluation is the
  // whole signal.
  confirmDirectly(error) {
    this.entries.set(error.id, {
      streak: this.confirmFrames,
      frameCount: 1,
      worstValue: error.value,
      severity: error.severity,
      message: error.message,
    });
    this.confirmedIds.add(error.id);
  }

  // Errors currently mid-streak at or above the threshold — i.e. actively
  // happening right now, for a live "you're doing this wrong" display.
  getActiveErrors() {
    const active = [];
    for (const [id, entry] of this.entries) {
      if (entry.streak >= this.confirmFrames) {
        active.push({ id, severity: entry.severity, message: entry.message, value: entry.worstValue });
      }
    }
    return active;
  }

  // Every error id confirmed at any point during the rep, deduplicated,
  // for attaching to the finished rep record.
  getConfirmedErrors() {
    const confirmed = [];
    for (const id of this.confirmedIds) {
      const entry = this.entries.get(id);
      confirmed.push({
        id,
        severity: entry.severity,
        message: entry.message,
        frameCount: entry.frameCount,
        worstValue: entry.worstValue,
      });
    }
    return confirmed;
  }
}
