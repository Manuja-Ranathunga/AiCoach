import { describe, it, expect } from 'vitest';
import {
  COUNTDOWN_SECONDS_OPTIONS,
  DEFAULT_COUNTDOWN_SECONDS,
  isValidCountdownSeconds,
  IDLE_TIMEOUT_OPTIONS_MS,
  DEFAULT_IDLE_TIMEOUT_MS,
  isValidIdleTimeoutMs,
} from './sessionOptions.js';

describe('isValidCountdownSeconds', () => {
  it('accepts every listed option', () => {
    for (const option of COUNTDOWN_SECONDS_OPTIONS) {
      expect(isValidCountdownSeconds(option)).toBe(true);
    }
  });

  it('includes the default among the options', () => {
    expect(COUNTDOWN_SECONDS_OPTIONS).toContain(DEFAULT_COUNTDOWN_SECONDS);
  });

  it('rejects values outside the fixed list', () => {
    expect(isValidCountdownSeconds(4)).toBe(false);
    expect(isValidCountdownSeconds('3')).toBe(false);
    expect(isValidCountdownSeconds(undefined)).toBe(false);
  });
});

describe('isValidIdleTimeoutMs', () => {
  it('accepts every listed option', () => {
    for (const option of IDLE_TIMEOUT_OPTIONS_MS) {
      expect(isValidIdleTimeoutMs(option)).toBe(true);
    }
  });

  it('includes the default among the options', () => {
    expect(IDLE_TIMEOUT_OPTIONS_MS).toContain(DEFAULT_IDLE_TIMEOUT_MS);
  });

  it('rejects values outside the fixed list', () => {
    expect(isValidIdleTimeoutMs(15000)).toBe(false);
    expect(isValidIdleTimeoutMs('20000')).toBe(false);
  });
});
