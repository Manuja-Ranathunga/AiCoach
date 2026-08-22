// The app-level flow, distinct from RepStateMachine's per-rep states
// (STANDING/DESCENDING/...). This is the "what screen/mode is the user
// in" state, kept as one enum in one place so later phases (the Phase 8
// summary screen) have a single, obvious spot to plug into.
//
//   SETUP      -> exercise/view picker + live alignment checklist
//   COUNTDOWN  -> 3-2-1 before the set starts (also reused to resume after a pause)
//   ACTIVE     -> reps are being counted and coached
//   PAUSED     -> framing degraded mid-set; reps are NOT being counted
//   SUMMARY    -> not built yet (Phase 8)
//
// Valid transitions:
//   SETUP     -> COUNTDOWN   (checks passed / skipped, "Start Set" pressed)
//   COUNTDOWN -> ACTIVE      (countdown finished)
//   ACTIVE    -> PAUSED      (framing degraded for the pause threshold)
//   PAUSED    -> COUNTDOWN   (framing recovered, short countdown before resuming)
//   ACTIVE    -> SUMMARY     (Phase 8: user ends the set)
export const APP_STATES = {
  SETUP: 'SETUP',
  COUNTDOWN: 'COUNTDOWN',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  SUMMARY: 'SUMMARY',
};
