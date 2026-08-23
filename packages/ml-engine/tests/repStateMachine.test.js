import { describe, it, expect } from 'vitest';
import { RepStateMachine } from '../src/core/repStateMachine.js';

// Minimal metrics fixture: kneeAngleAvg is the only value the tests drive;
// the rest are held at safe values so no form-check errors fire and each
// synthetic squat is otherwise "clean".
function metrics(kneeAngleAvg) {
  return {
    kneeAngleAvg,
    torsoAngle: 0,
    confidence: 1,
    kneeDeviationL: 0,
    kneeDeviationR: 0,
  };
}

// Feeds an angle sequence into the machine, one frame every 33ms, and
// returns the array of per-frame results.
function run(machine, angles, startMs = 0, stepMs = 33) {
  return angles.map((angle, i) => machine.update(metrics(angle), startMs + i * stepMs));
}

describe('RepStateMachine', () => {
  it('counts exactly one rep for a synthetic clean squat', () => {
    const machine = new RepStateMachine();

    // standing -> confirmed descent -> below bottom threshold (deep enough
    // to also pass the depth form check) -> confirmed ascent -> back above
    // standingAngle to complete the rep.
    const angles = [170, 165, 158, 150, 140, 120, 90, 95, 105, 125, 140, 155, 168];
    const results = run(machine, angles);

    expect(results[results.length - 1].justCompletedRep).not.toBeNull();
    expect(machine.repCount).toBe(1);
    expect(machine.validReps).toBe(1);
    expect(machine.getReps()).toHaveLength(1);
  });

  it('produces zero reps for a half-squat that never crosses the BOTTOM threshold', () => {
    const machine = new RepStateMachine();

    // Descends past descendingAngle but only down to 130 (never below the
    // 110 bottomAngle), then reverses back up past standingAngle — the
    // attempt is discarded rather than counted.
    const angles = [170, 165, 158, 150, 140, 130, 140, 150, 165, 165];
    run(machine, angles);

    expect(machine.repCount).toBe(0);
    expect(machine.validReps).toBe(0);
    expect(machine.getReps()).toHaveLength(0);
  });

  it('does not produce phantom state changes from jitter around a threshold boundary', () => {
    const machine = new RepStateMachine();

    // Reach STANDING, then jitter with alternating up/down deltas so the
    // direction never confirms (3 consecutive same-direction frames) even
    // though some values dip below the descendingAngle threshold (155).
    // This is exactly the noise the state machine's hysteresis/debounce is
    // meant to reject.
    const settle = [170];
    const jitter = [157, 159, 156, 158, 153, 157, 154, 158];
    run(machine, settle);
    run(machine, jitter, 33, 33);

    expect(machine.state).toBe('STANDING');
    expect(machine.repCount).toBe(0);
    expect(machine.getReps()).toHaveLength(0);
  });

  it('abandons a rep without counting it when metrics go null mid-rep', () => {
    const machine = new RepStateMachine();

    // Get into a confirmed DESCENDING rep at t=99.
    run(machine, [170, 165, 158, 150]); // last frame at t = 3*33 = 99

    // Metrics briefly missing, but still within the abandon grace period —
    // the rep must NOT be dropped yet.
    let result = machine.update(null, 99 + 250);
    expect(result.state).toBe('DESCENDING');
    expect(machine.repCount).toBe(0);

    // Now past abandonGraceMs (500ms) since the last valid metrics — the
    // in-progress rep is abandoned.
    result = machine.update(null, 99 + 600);
    expect(result.state).toBe('IDLE');
    expect(machine.repCount).toBe(0);
    expect(machine.getReps()).toHaveLength(0);
  });

  it('reset() clears the counter', () => {
    const machine = new RepStateMachine();
    const angles = [170, 165, 158, 150, 140, 120, 90, 95, 105, 125, 140, 155, 168];
    run(machine, angles);

    expect(machine.repCount).toBe(1);

    machine.reset();

    expect(machine.repCount).toBe(0);
    expect(machine.validReps).toBe(0);
    expect(machine.state).toBe('IDLE');
    expect(machine.getReps()).toHaveLength(0);
  });
});
