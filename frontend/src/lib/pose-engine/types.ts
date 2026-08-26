/**
 * Contract between the web app and the on-device pose/skeleton engine.
 *
 * The real implementation (model loading, keypoint extraction, rep counting,
 * form-fault detection) lives in `/ml` and is NOT part of this seam yet — see
 * `/ml/README.md`. Everything in this folder is a stand-in (`mockEngine.ts`)
 * so the calibration, tracking and summary screens are fully functional
 * end-to-end. Swap `createPoseEngine` to import the real engine once it
 * implements this same interface; no page code should need to change.
 */

export type CheckId = 'lighting' | 'framing' | 'visibility';
export type CheckStatus = 'pending' | 'pass' | 'warn';

export interface CalibrationCheck {
  id: CheckId;
  label: string;
  status: CheckStatus;
  message: string;
}

export interface CalibrationState {
  checks: CalibrationCheck[];
  allPassed: boolean;
  distanceMeters: number | null;
  confidence: number | null;
  fps: number | null;
  keypointsVisible: number;
  keypointsTotal: number;
}

export interface FormIssueEvent {
  type: string;
  label: string;
  detail: string;
}

export interface RepResult {
  index: number;
  correct: boolean;
  quality: number;
  tempoSeconds: number;
  deepestAngleDegrees: number | null;
  issues: FormIssueEvent[];
  caption: string;
}

export interface TrackingFrame {
  /** 0-1 fraction of the way through the current rep's motion, for the live skeleton pose. */
  phase: number;
  state: 'neutral' | 'good' | 'warn';
  fps: number;
}

export interface PoseEngineCallbacks {
  onCalibrationUpdate?: (state: CalibrationState) => void;
  onFrame?: (frame: TrackingFrame) => void;
  onRep?: (rep: RepResult) => void;
  onSetComplete?: () => void;
}

export interface PoseEngineHandle {
  startCalibration: () => void;
  stopCalibration: () => void;
  startTracking: (targetReps: number) => void;
  stopTracking: () => void;
  destroy: () => void;
}

export type PoseEngineFactory = (
  video: HTMLVideoElement,
  exerciseSlug: string,
  callbacks: PoseEngineCallbacks,
) => PoseEngineHandle;
