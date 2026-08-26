import { describe, it, expect } from 'vitest';
import {
  SETUP_CHECKS_CONFIG,
  checkFullBodyVisible,
  checkWithinFrameBounds,
  checkBodySize,
  checkLighting,
  StabilityTracker,
  aggregateConfidence,
} from '../src/core/setupChecks.js';
import {
  NOSE,
  LEFT_SHOULDER,
  RIGHT_SHOULDER,
  LEFT_HIP,
  RIGHT_HIP,
  LEFT_KNEE,
  RIGHT_KNEE,
  LEFT_ANKLE,
  RIGHT_ANKLE,
} from '../src/core/landmarkIndices.js';

// A well-framed standing pose: full visibility, centered, filling a
// reasonable fraction of the frame. Individual tests perturb one aspect
// of this to push a single check's confidence down.
function buildLandmarks(overrides = {}) {
  const base = {
    [NOSE]: { x: 0.5, y: 0.2, visibility: 1 },
    [LEFT_SHOULDER]: { x: 0.45, y: 0.3, visibility: 1 },
    [RIGHT_SHOULDER]: { x: 0.55, y: 0.3, visibility: 1 },
    [LEFT_HIP]: { x: 0.47, y: 0.55, visibility: 1 },
    [RIGHT_HIP]: { x: 0.53, y: 0.55, visibility: 1 },
    [LEFT_KNEE]: { x: 0.47, y: 0.7, visibility: 1 },
    [RIGHT_KNEE]: { x: 0.53, y: 0.7, visibility: 1 },
    [LEFT_ANKLE]: { x: 0.47, y: 0.85, visibility: 1 },
    [RIGHT_ANKLE]: { x: 0.53, y: 0.85, visibility: 1 },
  };
  return { ...base, ...overrides };
}

describe('checkFullBodyVisible confidence', () => {
  it('is 100 when every required landmark is fully visible', () => {
    const result = checkFullBodyVisible(buildLandmarks());
    expect(result.passed).toBe(true);
    expect(result.confidence).toBe(100);
  });

  it('is 0 when there is no person', () => {
    const result = checkFullBodyVisible(null);
    expect(result.passed).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('is graded (between 0 and 100, and lower than a fully-visible pose) for partial visibility', () => {
    const landmarks = buildLandmarks({
      [LEFT_KNEE]: { x: 0.47, y: 0.75, visibility: 0.3 },
    });
    const result = checkFullBodyVisible(landmarks);
    expect(result.passed).toBe(false);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThan(100);
  });
});

describe('checkWithinFrameBounds confidence', () => {
  it('is high with plenty of room from either edge', () => {
    const result = checkWithinFrameBounds(buildLandmarks(), SETUP_CHECKS_CONFIG);
    expect(result.passed).toBe(true);
    expect(result.confidence).toBe(100);
  });

  it('drops toward 0 as the head approaches the top cutoff', () => {
    const nearEdge = checkWithinFrameBounds(
      buildLandmarks({ [NOSE]: { x: 0.5, y: SETUP_CHECKS_CONFIG.frameMargin + 0.001, visibility: 1 } }),
      SETUP_CHECKS_CONFIG
    );
    const comfortable = checkWithinFrameBounds(buildLandmarks(), SETUP_CHECKS_CONFIG);
    expect(nearEdge.confidence).toBeLessThan(comfortable.confidence);
  });

  it('is 0 when the head is actually cut off', () => {
    const result = checkWithinFrameBounds(
      buildLandmarks({ [NOSE]: { x: 0.5, y: 0, visibility: 1 } }),
      SETUP_CHECKS_CONFIG
    );
    expect(result.passed).toBe(false);
    expect(result.confidence).toBe(0);
  });
});

describe('checkBodySize confidence', () => {
  it('peaks at the midpoint of the acceptable range', () => {
    const { minBodyHeightRatio, maxBodyHeightRatio } = SETUP_CHECKS_CONFIG;
    const mid = (minBodyHeightRatio + maxBodyHeightRatio) / 2;
    const landmarks = buildLandmarks({
      [NOSE]: { x: 0.5, y: 0.1, visibility: 1 },
      [LEFT_ANKLE]: { x: 0.47, y: 0.1 + mid, visibility: 1 },
      [RIGHT_ANKLE]: { x: 0.53, y: 0.1 + mid, visibility: 1 },
    });
    const result = checkBodySize(landmarks, SETUP_CHECKS_CONFIG);
    expect(result.passed).toBe(true);
    expect(result.confidence).toBe(100);
  });

  it('is 0 right at the min/max edges of the acceptable range', () => {
    const { minBodyHeightRatio } = SETUP_CHECKS_CONFIG;
    const landmarks = buildLandmarks({
      [NOSE]: { x: 0.5, y: 0.1, visibility: 1 },
      [LEFT_ANKLE]: { x: 0.47, y: 0.1 + minBodyHeightRatio, visibility: 1 },
      [RIGHT_ANKLE]: { x: 0.53, y: 0.1 + minBodyHeightRatio, visibility: 1 },
    });
    const result = checkBodySize(landmarks, SETUP_CHECKS_CONFIG);
    expect(result.passed).toBe(true); // exactly at the boundary still passes
    expect(result.confidence).toBe(0);
  });
});

describe('checkLighting confidence', () => {
  it('is 100 once average visibility meets the floor, and scales down below it', () => {
    const full = checkLighting(buildLandmarks());
    const dimLandmarks = Object.fromEntries(
      Object.entries(buildLandmarks()).map(([index, point]) => [index, { ...point, visibility: 0.3 }])
    );
    const dim = checkLighting(dimLandmarks);

    expect(full.confidence).toBe(100);
    expect(dim.passed).toBe(false);
    expect(dim.confidence).toBeLessThan(full.confidence);
    expect(dim.confidence).toBeGreaterThanOrEqual(0);
  });
});

describe('StabilityTracker confidence', () => {
  it('gives partial credit while the window is still filling', () => {
    const tracker = new StabilityTracker();
    const result = tracker.check(buildLandmarks(), 0);
    expect(result.passed).toBe(false);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThan(50);
  });

  it('reaches high confidence once the window is covered with no movement', () => {
    const tracker = new StabilityTracker();
    let result;
    for (let t = 0; t <= SETUP_CHECKS_CONFIG.stabilityWindowMs; t += 100) {
      result = tracker.check(buildLandmarks(), t);
    }
    expect(result.passed).toBe(true);
    expect(result.confidence).toBe(100);
  });

  it('is 0 when nobody is in frame', () => {
    const tracker = new StabilityTracker();
    const result = tracker.check(null, 0);
    expect(result.confidence).toBe(0);
  });
});

describe('aggregateConfidence', () => {
  it('averages the confidence of every check', () => {
    const checks = [{ confidence: 100 }, { confidence: 50 }, { confidence: 0 }];
    expect(aggregateConfidence(checks)).toBe(50);
  });

  it('is 0 for an empty list', () => {
    expect(aggregateConfidence([])).toBe(0);
    expect(aggregateConfidence(null)).toBe(0);
  });

  it('falls back to pass/fail as 100/0 for a check missing a confidence field', () => {
    const checks = [{ passed: true }, { passed: false }];
    expect(aggregateConfidence(checks)).toBe(50);
  });

  it('reflects real output from the live setup checks', () => {
    const checks = [
      checkFullBodyVisible(buildLandmarks()),
      checkWithinFrameBounds(buildLandmarks()),
      checkBodySize(buildLandmarks()),
      checkLighting(buildLandmarks()),
    ];
    // A well-framed pose should read as high confidence overall, even
    // though no single check is required to hit exactly 100.
    expect(aggregateConfidence(checks)).toBeGreaterThanOrEqual(80);
  });
});
