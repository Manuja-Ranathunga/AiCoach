import { CHECKS } from '../formChecks';

// Every tunable number for squat form-checking lives here — nothing in
// formChecks.js or repStateMachine.js hardcodes a threshold. Adjust
// anything below without touching logic anywhere else.
export const SQUAT_CONFIG = {
  name: 'Squat',
  primaryAngle: 'kneeAngleAvg',
  thresholds: {
    depthMaxKneeAngle: 100, // minKneeAngle above this = insufficient depth
    valgusToleranceRatio: 0.12, // knee inward drift, as a fraction of hip width
    maxTorsoAngle: 45, // degrees of forward lean before it's flagged
    errorConfirmFrames: 4, // consecutive frames a per-frame error must persist to count
  },
  checks: CHECKS,
};
