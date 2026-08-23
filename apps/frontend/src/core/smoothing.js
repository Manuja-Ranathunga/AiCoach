// Smooths noisy per-frame landmark coordinates.
//
// Tradeoff: a simple exponential moving average (EMA) is one line and one
// parameter, but that parameter is a fixed compromise — smooth it enough
// to kill jitter while standing still, and fast squat motion turns
// laggy/rubbery; tune it for responsiveness, and jitter comes back at
// rest. A One Euro Filter (Casiez et al., 2012) fixes this by adapting
// its cutoff to the signal's speed: it low-pass-filters hard when the
// point is nearly still (killing jitter) and relaxes the filter when the
// point is moving fast (staying responsive). It's a few more lines than
// an EMA but needs no per-exercise retuning, so it's what's used here.

function smoothingFactor(deltaSeconds, cutoff) {
  const r = 2 * Math.PI * cutoff * deltaSeconds;
  return r / (r + 1);
}

class LowPassFilter {
  constructor() {
    this.value = null;
  }

  filter(value, alpha) {
    this.value = this.value === null ? value : alpha * value + (1 - alpha) * this.value;
    return this.value;
  }
}

// One filter instance smooths a single scalar signal (one landmark, one
// axis) over time.
export class OneEuroFilter {
  // minCutoff: lower = smoother but laggier at low speed.
  // beta: higher = cuts lag faster as speed increases, but lets more
  //   jitter through during fast motion.
  constructor({ minCutoff = 1.2, beta = 0.4, derivativeCutoff = 1.0 } = {}) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.derivativeCutoff = derivativeCutoff;

    this.valueFilter = new LowPassFilter();
    this.derivativeFilter = new LowPassFilter();
    this.lastValue = null;
    this.lastTimestampMs = null;
  }

  filter(value, timestampMs) {
    if (this.lastTimestampMs === null) {
      this.lastTimestampMs = timestampMs;
      this.lastValue = value;
      this.valueFilter.filter(value, 1);
      this.derivativeFilter.filter(0, 1);
      return value;
    }

    let deltaSeconds = (timestampMs - this.lastTimestampMs) / 1000;
    // Guard against a stalled/non-increasing clock (e.g. a gap where the
    // pose briefly disappeared) so we never divide by zero or go negative.
    if (deltaSeconds <= 0) deltaSeconds = 1 / 30;
    this.lastTimestampMs = timestampMs;

    const derivative = (value - this.lastValue) / deltaSeconds;
    this.lastValue = value;

    const derivativeAlpha = smoothingFactor(deltaSeconds, this.derivativeCutoff);
    const smoothedDerivative = this.derivativeFilter.filter(derivative, derivativeAlpha);

    const cutoff = this.minCutoff + this.beta * Math.abs(smoothedDerivative);
    const valueAlpha = smoothingFactor(deltaSeconds, cutoff);
    return this.valueFilter.filter(value, valueAlpha);
  }
}

// Holds one OneEuroFilter per (landmark index, axis) pair and smooths a
// full MediaPipe landmark array frame by frame.
export class LandmarkSmoother {
  constructor(filterOptions = {}) {
    this.filterOptions = filterOptions;
    this.filtersByIndex = new Map();
  }

  // landmarks: array of {x, y, z, visibility} from PoseLandmarkerResult,
  // or null/undefined if no pose was detected this frame.
  smooth(landmarks, timestampMs = performance.now()) {
    if (!landmarks) return null;

    return landmarks.map((landmark, index) => {
      if (!landmark) return landmark;

      if (!this.filtersByIndex.has(index)) {
        this.filtersByIndex.set(index, {
          x: new OneEuroFilter(this.filterOptions),
          y: new OneEuroFilter(this.filterOptions),
        });
      }

      const { x: xFilter, y: yFilter } = this.filtersByIndex.get(index);

      return {
        ...landmark,
        x: xFilter.filter(landmark.x, timestampMs),
        y: yFilter.filter(landmark.y, timestampMs),
      };
    });
  }

  // Call when tracking restarts from scratch (e.g. camera restarted) so
  // stale velocity estimates don't leak into the new session.
  reset() {
    this.filtersByIndex.clear();
  }
}
