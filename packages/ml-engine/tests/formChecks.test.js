import { describe, it, expect } from 'vitest';
import { CHECKS, evaluateChecks, ErrorTracker } from '../src/core/formChecks.js';

const THRESHOLDS = {
  depthMaxKneeAngle: 100,
  valgusToleranceRatio: 0.12,
  maxTorsoAngle: 45,
};

describe('form checks', () => {
  it('fires insufficient_depth when the threshold is clearly exceeded', () => {
    const failures = evaluateChecks(CHECKS, {
      phase: 'completion',
      state: 'STANDING',
      metrics: null,
      repContext: { minKneeAngle: 120 },
      thresholds: THRESHOLDS,
      orientation: 'front',
    });
    expect(failures.map((f) => f.id)).toContain('insufficient_depth');
  });

  it('does not fire insufficient_depth just below the threshold', () => {
    const failures = evaluateChecks(CHECKS, {
      phase: 'completion',
      state: 'STANDING',
      metrics: null,
      repContext: { minKneeAngle: 99 },
      thresholds: THRESHOLDS,
      orientation: 'front',
    });
    expect(failures.map((f) => f.id)).not.toContain('insufficient_depth');
  });

  it('fires knee_valgus when the threshold is clearly exceeded', () => {
    const failures = evaluateChecks(CHECKS, {
      phase: 'perFrame',
      state: 'DESCENDING',
      metrics: { kneeDeviationL: 0.2, kneeDeviationR: 0.05 },
      repContext: {},
      thresholds: THRESHOLDS,
      orientation: 'front',
    });
    expect(failures.map((f) => f.id)).toContain('knee_valgus');
  });

  it('does not fire knee_valgus just below the threshold', () => {
    const failures = evaluateChecks(CHECKS, {
      phase: 'perFrame',
      state: 'DESCENDING',
      metrics: { kneeDeviationL: 0.11, kneeDeviationR: 0.05 },
      repContext: {},
      thresholds: THRESHOLDS,
      orientation: 'front',
    });
    expect(failures.map((f) => f.id)).not.toContain('knee_valgus');
  });

  it('fires excessive_lean when the threshold is clearly exceeded', () => {
    const failures = evaluateChecks(CHECKS, {
      phase: 'perFrame',
      state: 'DESCENDING',
      metrics: { torsoAngle: 60 },
      repContext: {},
      thresholds: THRESHOLDS,
      orientation: 'side',
    });
    expect(failures.map((f) => f.id)).toContain('excessive_lean');
  });

  it('does not fire excessive_lean just below the threshold', () => {
    const failures = evaluateChecks(CHECKS, {
      phase: 'perFrame',
      state: 'DESCENDING',
      metrics: { torsoAngle: 44 },
      repContext: {},
      thresholds: THRESHOLDS,
      orientation: 'side',
    });
    expect(failures.map((f) => f.id)).not.toContain('excessive_lean');
  });
});

describe('ErrorTracker consecutive-frame debounce', () => {
  it('suppresses a single bad frame', () => {
    const tracker = new ErrorTracker(4);

    tracker.update([{ id: 'knee_valgus', severity: 'critical', message: 'Push your knees out', value: 0.2 }]);
    expect(tracker.getActiveErrors()).toHaveLength(0);

    // The very next frame is clean — the streak resets before it ever
    // reaches confirmFrames, so the single bad frame never gets confirmed.
    tracker.update([]);
    expect(tracker.getActiveErrors()).toHaveLength(0);
    expect(tracker.getConfirmedErrors()).toHaveLength(0);
  });

  it('confirms an error once it persists for confirmFrames consecutive frames', () => {
    const tracker = new ErrorTracker(4);
    const failure = { id: 'knee_valgus', severity: 'critical', message: 'Push your knees out', value: 0.2 };

    for (let i = 0; i < 4; i += 1) tracker.update([failure]);

    expect(tracker.getActiveErrors().map((e) => e.id)).toContain('knee_valgus');
    expect(tracker.getConfirmedErrors().map((e) => e.id)).toContain('knee_valgus');
  });
});

describe('rep validity', () => {
  // Mirrors the rule RepStateMachine._completeRep applies to a rep's
  // confirmed errors: any critical error invalidates the rep, a warning
  // alone does not.
  function isRepValid(errors) {
    return !errors.some((error) => error.severity === 'critical');
  }

  it('a critical error sets rep.valid to false', () => {
    const tracker = new ErrorTracker(1);
    tracker.confirmDirectly({ id: 'insufficient_depth', severity: 'critical', message: 'Go deeper', value: 120 });

    expect(isRepValid(tracker.getConfirmedErrors())).toBe(false);
  });

  it('a warning alone does not set rep.valid to false', () => {
    const tracker = new ErrorTracker(1);
    tracker.confirmDirectly({ id: 'excessive_lean', severity: 'warning', message: 'Chest up', value: 50 });

    expect(isRepValid(tracker.getConfirmedErrors())).toBe(true);
  });
});
