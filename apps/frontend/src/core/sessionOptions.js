// Fixed dropdown option sets for the CONFIGURING step's countdown-length
// and idle-timeout selects (target rep count is free-entry — see
// targetReps.js — these two are deliberately closed lists instead).

export const COUNTDOWN_SECONDS_OPTIONS = [3, 5, 10];
export const DEFAULT_COUNTDOWN_SECONDS = 3;

export function isValidCountdownSeconds(value) {
  return COUNTDOWN_SECONDS_OPTIONS.includes(value);
}

export const IDLE_TIMEOUT_OPTIONS_MS = [10000, 20000, 30000];
export const DEFAULT_IDLE_TIMEOUT_MS = 20000;

export function isValidIdleTimeoutMs(value) {
  return IDLE_TIMEOUT_OPTIONS_MS.includes(value);
}
