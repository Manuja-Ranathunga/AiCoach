// Single public entry point for @ai-coach/ml-engine. Consumers (the
// frontend app) must only import from this file — never reach into
// internal paths like '@ai-coach/ml-engine/src/core/geometry'.

// ---------------------------------------------------------------------
// core/ — pure logic, runs headlessly in plain Node. No window, document,
// canvas, React, or MediaPipe imports.
// ---------------------------------------------------------------------

export { toAspectSpace, angleBetween, angleFromVertical, distance, midpoint, horizontalDeviationFromLine } from './core/geometry.js';

export {
  NOSE,
  LEFT_SHOULDER,
  RIGHT_SHOULDER,
  LEFT_ELBOW,
  RIGHT_ELBOW,
  LEFT_WRIST,
  RIGHT_WRIST,
  LEFT_HIP,
  RIGHT_HIP,
  LEFT_KNEE,
  RIGHT_KNEE,
  LEFT_ANKLE,
  RIGHT_ANKLE,
  LEFT_HEEL,
  RIGHT_HEEL,
  LEFT_FOOT_INDEX,
  RIGHT_FOOT_INDEX,
} from './core/landmarkIndices.js';

export { OneEuroFilter, LandmarkSmoother } from './core/smoothing.js';

export { STATES, DEFAULT_CONFIG, RepStateMachine } from './core/repStateMachine.js';

export { CHECKS, evaluateChecks, ErrorTracker } from './core/formChecks.js';

export { pickPrimaryError, buildFeedbackState } from './core/feedbackState.js';

export { FEEDBACK_CONFIG, numberToWords, buildFormCueCandidate, FeedbackManager } from './core/feedbackManager.js';

export {
  SETUP_CHECKS_CONFIG,
  checkFullBodyVisible,
  checkWithinFrameBounds,
  checkBodySize,
  checkLighting,
  StabilityTracker,
  runFramingChecks,
} from './core/setupChecks.js';

export { ORIENTATIONS, ORIENTATION_CONFIG, OrientationDetector } from './core/orientationDetector.js';

export {
  ANALYTICS_CONFIG,
  computeFormScore,
  getMostCommonMistake,
  getMistakeBreakdown,
  detectFatigue,
  getConsistency,
  getTempoBreakdown,
  generateInsights,
  analyzeSet,
} from './core/sessionAnalytics.js';

export { getSquatMetrics } from './core/exercises/squat.js';

export { SQUAT_CONFIG } from './core/exercises/squatConfig.js';

// ---------------------------------------------------------------------
// runtime/ — browser APIs allowed (canvas, speech synthesis), but still
// no React.
// ---------------------------------------------------------------------

export { POSE_CONNECTIONS, SEVERITY_COLORS, segmentKey, drawSkeleton, drawLandmarks } from './runtime/drawing.js';

export { speechEngine } from './runtime/speechEngine.js';
