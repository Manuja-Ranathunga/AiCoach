# FormSpotter — ML / pose engine

This folder is reserved for the real on-device pose detection and form-analysis
work: model selection/training, skeleton (keypoint) extraction, rep counting,
and form-fault detection. It is intentionally empty — the rest of the app
(frontend, backend, DB) was built around a mock stand-in so every screen is
already wired up and works end-to-end; swapping in the real engine here
shouldn't require touching page code.

## Where this plugs in

The frontend defines the contract your engine must satisfy:

- [`frontend/src/lib/pose-engine/types.ts`](../frontend/src/lib/pose-engine/types.ts) —
  the `PoseEngineFactory` signature, plus the `CalibrationState`, `RepResult`,
  and `TrackingFrame` shapes it needs to hand back.
- [`frontend/src/lib/pose-engine/mockEngine.ts`](../frontend/src/lib/pose-engine/mockEngine.ts) —
  the current stand-in. It fakes calibration checks resolving and reps
  completing on a timer, with no real keypoint math, so you can see exactly
  what shape of data each screen expects and when it expects it.
- [`frontend/src/lib/pose-engine/index.ts`](../frontend/src/lib/pose-engine/index.ts) —
  the single line (`createPoseEngine`) to repoint at your real implementation
  once it's ready.

A `PoseEngineFactory` is called as `createPoseEngine(videoElement, exerciseSlug, callbacks)`
and returns a handle with `startCalibration`, `stopCalibration`,
`startTracking(targetReps)`, `stopTracking`, and `destroy`. The video element
is the live (mirrored, 16:9) webcam feed already attached via `getUserMedia` in
[`frontend/src/hooks/useCamera.ts`](../frontend/src/hooks/useCamera.ts) — camera
acquisition, permission handling, and the video element itself are already
built; this layer only needs to read frames from it.

## What the app expects from you, per screen

- **Calibration** (`CalibrationPage`): call `onCalibrationUpdate` as lighting,
  framing/distance, and full-body pose visibility resolve. `allPassed: true`
  unlocks the Continue button.
- **Active tracking** (`ActiveTrackingPage`): call `onRep` once per completed
  rep with whether it was correct, a quality score, tempo, and any
  `FormIssueEvent`s (each needs a stable `type` slug — the backend aggregates
  by it — plus a human `label`/`detail`). Call `onSetComplete` when the target
  rep count is reached; the page also lets the user end the set early.
- Exercise-specific cue text (captions spoken/shown per rep) currently lives in
  [`frontend/src/lib/pose-engine/cues.ts`](../frontend/src/lib/pose-engine/cues.ts) —
  keyed by exercise slug (`squat`, `push-up`, `mountain-climbers`, matching the
  seeded rows in `backend/app/seed.py`). Feel free to keep cue text there, or
  move it in here alongside the fault-detection logic that decides which cue
  fires.

## Constraints from the product framing

- Everything must run **on-device, in the browser** — the login screen's copy
  ("Pose detection runs in the browser. Frames are never uploaded, stored, or
  streamed.") is a real product constraint, not just copy. A WebGL/WASM model
  (e.g. TF.js, ONNX Runtime Web, MediaPipe Tasks) that runs against the
  existing `<video>` element fits this without changing anything upstream.
- The backend never receives frames or keypoints — only the aggregated,
  per-rep results (`SessionCreatePayload` in `frontend/src/types.ts`). Keep it
  that way.
