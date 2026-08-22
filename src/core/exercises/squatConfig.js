import {
  LEFT_SHOULDER,
  RIGHT_SHOULDER,
  LEFT_HIP,
  RIGHT_HIP,
  LEFT_KNEE,
  RIGHT_KNEE,
  LEFT_ANKLE,
  RIGHT_ANKLE,
} from '../landmarkIndices';
import { CHECKS } from '../formChecks';

// Which skeleton segments (landmark index pairs) and joints (landmark
// indices) light up when a given check is failing. Kept here rather than
// in formChecks.js because it's about the skeleton's specific joint
// numbering, not the check's judgement logic.
const LEG_SEGMENTS = [
  [LEFT_HIP, LEFT_KNEE],
  [LEFT_KNEE, LEFT_ANKLE],
  [RIGHT_HIP, RIGHT_KNEE],
  [RIGHT_KNEE, RIGHT_ANKLE],
];
const TORSO_SEGMENTS = [
  [LEFT_SHOULDER, LEFT_HIP],
  [RIGHT_SHOULDER, RIGHT_HIP],
];

const SEGMENTS_BY_CHECK_ID = {
  insufficient_depth: LEG_SEGMENTS, // both legs
  knee_valgus: LEG_SEGMENTS, // both hip-knee and knee-ankle segments
  excessive_lean: TORSO_SEGMENTS, // shoulder-hip torso segments
};

function jointsFromSegments(segments) {
  return [...new Set(segments.flat())];
}

// Every tunable number for squat form-checking lives here — nothing in
// formChecks.js, drawing.js, or repStateMachine.js hardcodes a threshold.
// Adjust anything below without touching logic anywhere else.
export const SQUAT_CONFIG = {
  name: 'Squat',
  primaryAngle: 'kneeAngleAvg',
  thresholds: {
    depthMaxKneeAngle: 100, // minKneeAngle above this = insufficient depth
    valgusToleranceRatio: 0.12, // knee inward drift, as a fraction of hip width
    maxTorsoAngle: 45, // degrees of forward lean before it's flagged
    errorConfirmFrames: 4, // consecutive frames a per-frame error must persist to count
    depthBarStandingAngle: 170, // knee angle shown as "empty" (top) on the depth bar
    depthBarDeepAngle: 60, // knee angle shown as "full" (bottom) on the depth bar
  },
  // When multiple errors are active at the same severity, the cue banner
  // shows whichever is listed first here.
  errorPriority: ['insufficient_depth', 'knee_valgus', 'excessive_lean'],
  checks: CHECKS.map((check) => {
    const affectedSegments = SEGMENTS_BY_CHECK_ID[check.id] ?? [];
    return { ...check, affectedSegments, affectedJoints: jointsFromSegments(affectedSegments) };
  }),
};
