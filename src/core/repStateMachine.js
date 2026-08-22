// Pure state machine that turns a stream of kneeAngleAvg readings into
// counted squat reps. No React, no MediaPipe — just numbers in, rep
// records out. Fully unit-testable in isolation.

export const STATES = {
  IDLE: 'IDLE',
  STANDING: 'STANDING',
  DESCENDING: 'DESCENDING',
  BOTTOM: 'BOTTOM',
  ASCENDING: 'ASCENDING',
};

// Every tunable number lives here so thresholds can be adjusted without
// touching the transition logic below.
//
// Why hysteresis: if STANDING and DESCENDING shared one boundary (say,
// both at 160), a knee angle sitting right at 160 — with even the small
// residual noise smoothing doesn't fully remove — would flicker back and
// forth between the two states every frame. Giving each boundary two
// different thresholds (160 to leave STANDING going down, but 160 again
// only reachable from well below to come back up) means the signal has
// to travel a real distance before the state changes, so noise sitting
// near one edge can't cause a flip.
export const DEFAULT_CONFIG = {
  standingAngle: 160, // above this = standing; also the "rep complete" angle
  descendingAngle: 155, // must drop below this (from STANDING) to start a rep
  bottomAngle: 110, // must drop below this to count as reaching the bottom
  ascendingAngle: 120, // must rise above this (from BOTTOM) to start standing back up
  directionConfirmFrames: 3, // consecutive consistent frames needed to "confirm" a direction
  abandonGraceMs: 500, // how long metrics can be null mid-rep before giving up on it
};

function freshRep(repNumber, timestampMs) {
  return {
    repNumber,
    minKneeAngle: Infinity,
    maxTorsoAngle: -Infinity,
    startTime: timestampMs,
    endTime: null,
    descentDuration: null,
    bottomHoldDuration: null,
    ascentDuration: null,
    totalDuration: null,
    minConfidence: Infinity,
    errors: [], // Phase 4 fills this in
    valid: true, // Phase 4 gates this
  };
}

export class RepStateMachine {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._resetAll();
  }

  reset() {
    this._resetAll();
  }

  getReps() {
    return this.reps;
  }

  // Call once per frame. metrics is whatever getSquatMetrics() returned
  // this frame (or null). timestampMs should be monotonically increasing
  // (performance.now() works).
  update(metrics, timestampMs) {
    if (!metrics) {
      this._handleMissingMetrics(timestampMs);
      return this._result(null);
    }

    this.lastValidMetricsAt = timestampMs;

    const angle = metrics.kneeAngleAvg;
    this._updateDirection(angle);

    // A direction only counts once it's held for directionConfirmFrames
    // in a row — see the class comment above for why.
    const confirmedDirection =
      this.directionStreak >= this.config.directionConfirmFrames ? this.direction : null;

    const justCompletedRep = this._applyTransition(angle, confirmedDirection, metrics, timestampMs);
    return this._result(justCompletedRep);
  }

  _resetAll() {
    this.state = STATES.IDLE;
    this.repCount = 0;
    this.reps = [];
    this.currentRep = null;

    this.lastAngle = null;
    this.direction = null;
    this.directionStreak = 0;

    this.lastValidMetricsAt = null;
    this._descendStartAt = null;
    this._bottomStartAt = null;
    this._ascendStartAt = null;
  }

  _result(justCompletedRep) {
    return {
      state: this.state,
      repCount: this.repCount,
      currentRep: this.currentRep,
      justCompletedRep,
    };
  }

  _updateDirection(angle) {
    if (this.lastAngle === null) {
      this.lastAngle = angle;
      return;
    }

    const delta = angle - this.lastAngle;
    this.lastAngle = angle;

    if (delta === 0) {
      // No movement this frame: extend whatever direction was already
      // building rather than treating a momentary pause as a reversal.
      if (this.direction) this.directionStreak += 1;
      return;
    }

    const instantDirection = delta < 0 ? 'down' : 'up';
    if (instantDirection === this.direction) {
      this.directionStreak += 1;
    } else {
      this.direction = instantDirection;
      this.directionStreak = 1;
    }
  }

  _handleMissingMetrics(timestampMs) {
    if (this.state === STATES.IDLE) return; // nothing to abandon

    if (this.lastValidMetricsAt !== null && timestampMs - this.lastValidMetricsAt > this.config.abandonGraceMs) {
      // Person likely left the frame mid-rep (or confidence tanked).
      // Drop everything and wait for them to reappear from scratch,
      // rather than getting stuck in a state we can no longer verify.
      this.currentRep = null;
      this.state = STATES.IDLE;
      this.direction = null;
      this.directionStreak = 0;
      this.lastAngle = null;
      this._descendStartAt = null;
      this._bottomStartAt = null;
      this._ascendStartAt = null;
    }
  }

  _applyTransition(angle, confirmedDirection, metrics, timestampMs) {
    const { standingAngle, descendingAngle, bottomAngle, ascendingAngle } = this.config;

    if (this.currentRep) this._trackFrame(metrics);

    switch (this.state) {
      case STATES.IDLE:
        // No direction requirement here — this is just "we can see a
        // standing person," not a rep-boundary crossing.
        if (angle > standingAngle) this.state = STATES.STANDING;
        break;

      case STATES.STANDING:
        if (angle < descendingAngle && confirmedDirection === 'down') {
          this.currentRep = freshRep(this.repCount + 1, timestampMs);
          this._trackFrame(metrics);
          this._descendStartAt = timestampMs;
          this.state = STATES.DESCENDING;
        }
        break;

      case STATES.DESCENDING:
        if (angle < bottomAngle && confirmedDirection === 'down') {
          this._bottomStartAt = timestampMs;
          this.state = STATES.BOTTOM;
        } else if (angle > standingAngle && confirmedDirection === 'up') {
          // Went back up without ever reaching the bottom — this wasn't
          // a real rep attempt. Discard it instead of getting stuck here.
          this.currentRep = null;
          this._descendStartAt = null;
          this.state = STATES.STANDING;
        }
        break;

      case STATES.BOTTOM:
        if (angle > ascendingAngle && confirmedDirection === 'up') {
          this._ascendStartAt = timestampMs;
          this.state = STATES.ASCENDING;
        }
        break;

      case STATES.ASCENDING:
        if (angle > standingAngle && confirmedDirection === 'up') {
          return this._completeRep(timestampMs);
        }
        break;

      default:
        break;
    }

    return null;
  }

  _trackFrame(metrics) {
    const rep = this.currentRep;
    if (metrics.kneeAngleAvg < rep.minKneeAngle) rep.minKneeAngle = metrics.kneeAngleAvg;
    if (metrics.torsoAngle > rep.maxTorsoAngle) rep.maxTorsoAngle = metrics.torsoAngle;
    if (metrics.confidence < rep.minConfidence) rep.minConfidence = metrics.confidence;
  }

  _completeRep(timestampMs) {
    const rep = this.currentRep;
    rep.endTime = timestampMs;
    rep.descentDuration = (this._bottomStartAt - this._descendStartAt) / 1000;
    rep.bottomHoldDuration = (this._ascendStartAt - this._bottomStartAt) / 1000;
    rep.ascentDuration = (timestampMs - this._ascendStartAt) / 1000;
    rep.totalDuration = (timestampMs - rep.startTime) / 1000;

    this.repCount += 1;
    this.reps.push(rep);
    this.currentRep = null;
    this._descendStartAt = null;
    this._bottomStartAt = null;
    this._ascendStartAt = null;
    this.state = STATES.STANDING;

    return rep;
  }
}
