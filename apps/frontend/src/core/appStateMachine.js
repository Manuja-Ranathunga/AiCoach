// The app-level flow, distinct from RepStateMachine's per-rep states
// (STANDING/DESCENDING/...). This is the "what screen/mode is the user
// in" state, kept as one enum in one place so later phases (the Phase 8
// summary screen) have a single, obvious spot to plug into.
//
//   SETUP        -> exercise/view picker + live alignment checklist
//   CONFIGURING  -> pick a target rep count before the set starts
//   COUNTDOWN    -> 3-2-1 before the set starts (also reused to resume after a pause)
//   ACTIVE       -> reps are being counted and coached
//   PAUSED       -> framing degraded mid-set; reps are NOT being counted
//   SUMMARY      -> post-set analytics; reps are NOT being counted
//
// Valid transitions:
//   SETUP       -> CONFIGURING (checks passed / skipped, "Start Set" pressed)
//   CONFIGURING -> COUNTDOWN   (target reps confirmed)
//   COUNTDOWN   -> ACTIVE      (countdown finished)
//   ACTIVE      -> PAUSED      (framing degraded for the pause threshold)
//   PAUSED      -> COUNTDOWN   (framing recovered, short countdown before resuming —
//                               skips CONFIGURING, the target doesn't change mid-set)
//   ACTIVE      -> SUMMARY     ("End Set" pressed, ~20s idle in STANDING, or the
//                               valid-rep count reaching the configured target —
//                               all gated by a >=3-rep confirm; below that the
//                               set is discarded and ACTIVE continues instead)
//   SUMMARY     -> CONFIGURING ("New Set" — alignment already passed once this
//                               session, so no need to revisit SETUP, but the
//                               target is asked again, defaulted to the last one)
//   SUMMARY     -> SETUP       ("Done")
export const APP_STATES = {
  SETUP: 'SETUP',
  CONFIGURING: 'CONFIGURING',
  COUNTDOWN: 'COUNTDOWN',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  SUMMARY: 'SUMMARY',
};
