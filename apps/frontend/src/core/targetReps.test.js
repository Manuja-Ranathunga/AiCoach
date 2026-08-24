import { describe, it, expect } from 'vitest';
import { DEFAULT_TARGET_REPS, MIN_TARGET_REPS, MAX_TARGET_REPS, clampTargetReps, hasReachedTarget } from './targetReps.js';

describe('hasReachedTarget', () => {
  it('is false while valid reps are below the target', () => {
    expect(hasReachedTarget(9, 10)).toBe(false);
  });

  it('is true the moment valid reps reach the target', () => {
    expect(hasReachedTarget(10, 10)).toBe(true);
  });

  it('stays true if valid reps overshoot the target', () => {
    expect(hasReachedTarget(11, 10)).toBe(true);
  });

  it('is false for zero valid reps against any positive target', () => {
    expect(hasReachedTarget(0, DEFAULT_TARGET_REPS)).toBe(false);
  });
});

describe('clampTargetReps', () => {
  it('rounds fractional input', () => {
    expect(clampTargetReps(7.6)).toBe(8);
  });

  it('clamps below MIN_TARGET_REPS up to the minimum', () => {
    expect(clampTargetReps(0)).toBe(MIN_TARGET_REPS);
    expect(clampTargetReps(-5)).toBe(MIN_TARGET_REPS);
  });

  it('clamps above MAX_TARGET_REPS down to the maximum', () => {
    expect(clampTargetReps(500)).toBe(MAX_TARGET_REPS);
  });

  it('falls back to the default for non-numeric input', () => {
    expect(clampTargetReps('')).toBe(DEFAULT_TARGET_REPS);
    expect(clampTargetReps(undefined)).toBe(DEFAULT_TARGET_REPS);
    expect(clampTargetReps('abc')).toBe(DEFAULT_TARGET_REPS);
  });
});
