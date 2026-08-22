import { useEffect, useRef, useState } from 'react';
import './CameraView.css';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { useRepCounter } from '../hooks/useRepCounter';
import { useSpeechFeedback } from '../hooks/useSpeechFeedback';
import { drawSkeleton, drawLandmarks, SEVERITY_COLORS } from '../core/drawing';
import { LandmarkSmoother } from '../core/smoothing';
import { getSquatMetrics } from '../core/exercises/squat';
import { SQUAT_CONFIG } from '../core/exercises/squatConfig';
import { buildFeedbackState, pickPrimaryError } from '../core/feedbackState';
import { APP_STATES } from '../core/appStateMachine';
import {
  SETUP_CHECKS_CONFIG,
  checkFullBodyVisible,
  checkWithinFrameBounds,
  checkBodySize,
  checkLighting,
  runFramingChecks,
  StabilityTracker,
} from '../core/setupChecks';
import { OrientationDetector, ORIENTATIONS } from '../core/orientationDetector';
import { analyzeSet } from '../core/sessionAnalytics';
import StatsOverlay from './StatsOverlay';
import DebugPanel from './DebugPanel';
import RepCounterOverlay from './RepCounterOverlay';
import CueBanner from './CueBanner';
import RepFlash from './RepFlash';
import StateIndicator from './StateIndicator';
import DepthBar from './DepthBar';
import VoiceSettings from './VoiceSettings';
import SetupFlow from './SetupFlow';
import Countdown from './Countdown';
import RepositionOverlay from './RepositionOverlay';
import SummaryScreen from './SummaryScreen';
import DiscardConfirm from './DiscardConfirm';

const FPS_WINDOW_SIZE = 30;
const EMPTY_FEEDBACK = { primaryId: null, primaryMessage: null, primarySeverity: null };

// How long framing must stay bad mid-set before the app pauses, and how
// long it must stay good again before auto-resuming. Different numbers
// on purpose: pausing should be conservative (don't interrupt a set over
// one bad frame), but resuming can react a bit faster once the person is
// visibly back in position.
const PAUSE_THRESHOLD_MS = 2000;
const RESUME_STABLE_MS = 800;
// How long standing with no rep in progress auto-ends a set — a real
// break, not one long pause between reps.
const AUTO_END_IDLE_MS = 20000;
// Below this many reps, ending is probably a mis-trigger (accidental
// button press, or the idle timer firing before a real attempt) rather
// than a real set worth a summary — see requestEndSet/DiscardConfirm.
const MIN_REPS_TO_SUMMARIZE = 3;

const { depthBarStandingAngle, depthBarDeepAngle, depthMaxKneeAngle } = SQUAT_CONFIG.thresholds;
const DEPTH_MARKER_PERCENT = clamp(
  (depthBarStandingAngle - depthMaxKneeAngle) / (depthBarStandingAngle - depthBarDeepAngle),
  0,
  1
);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Status of the camera: 'loading' | 'ready' | 'denied' | 'not-found' | 'error'
function CameraView() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafIdRef = useRef(null);
  // Updated directly from the detection loop (not via setState) because
  // it changes essentially every frame — see DepthBar.jsx.
  const depthFillRef = useRef(null);

  const [status, setStatus] = useState('loading');
  const [fps, setFps] = useState(0);
  const [detected, setDetected] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugMetrics, setDebugMetrics] = useState(null);
  const [cue, setCue] = useState({ message: null, severity: null });
  const [flash, setFlash] = useState(null);

  // App-level flow: SETUP -> COUNTDOWN -> ACTIVE -> PAUSED -> COUNTDOWN -> ACTIVE...
  const [appState, setAppState] = useState(APP_STATES.SETUP);
  const [sessionConfig, setSessionConfig] = useState({ exercise: 'squat', orientation: 'front' });
  const [liveSetupChecks, setLiveSetupChecks] = useState([]);
  const [orientationResult, setOrientationResult] = useState({ orientation: ORIENTATIONS.AMBIGUOUS, confidence: 0 });
  const [pauseReason, setPauseReason] = useState('');
  const [resuming, setResuming] = useState(false);
  // Every set completed so far this session (in memory only — history
  // persistence is Phase 9), plus the one currently on screen in SUMMARY.
  const [sessionSets, setSessionSets] = useState([]);
  const [currentSetRecord, setCurrentSetRecord] = useState(null);
  const [pendingDiscardConfirm, setPendingDiscardConfirm] = useState(false);

  // Mirrors appState for the detection loop below to read without being
  // a dependency of that effect — depending on it directly would tear
  // down and recreate the LandmarkSmoother (losing its filter state) on
  // every SETUP -> COUNTDOWN -> ACTIVE -> PAUSED transition. Written
  // directly wherever appState is set (see transitionTo), rather than via
  // a separate sync effect, so the loop never sees a stale value even for
  // one extra frame.
  const appStateRef = useRef(APP_STATES.SETUP);
  // Mirrors showDebug for the same reason.
  const showDebugRef = useRef(false);
  // Mid-set framing-monitor bookkeeping (see the ACTIVE/PAUSED branches
  // in the loop below).
  const pauseSinceRef = useRef(null);
  const resumeOkSinceRef = useRef(null);
  // Tracks how long the person has been standing with no rep in progress,
  // for the 20s auto-end. Set numbers are a plain counter rather than
  // derived from sessionSets.length so finalizeSet doesn't need to read
  // that state back (see the comment on finalizeSet below).
  const idleStandingSinceRef = useRef(null);
  const setCounterRef = useRef(0);

  const { landmarker, isLoading: poseLoading, error: poseError } = usePoseDetection();
  const repCounter = useRepCounter();
  const speech = useSpeechFeedback();
  // Created once (lazy initializer), never replaced — both hold a
  // rolling window of recent frames, so they need to persist across
  // renders the same way LandmarkSmoother does.
  const [stabilityTracker] = useState(() => new StabilityTracker());
  const [orientationDetector] = useState(() => new OrientationDetector());

  const transitionTo = (nextState) => {
    appStateRef.current = nextState;
    setAppState(nextState);
  };

  // Turns the machine's live rep array into a finalized set record and
  // moves to SUMMARY. Defined here (not down with handleReset etc.)
  // because, like transitionTo, it's called directly from inside the
  // detection loop's stale effect closure (the 20s idle auto-end below) —
  // safe because everything it touches is stable across renders:
  // repCounter.getReps()/reset() delegate to the never-replaced
  // RepStateMachine instance, setSessionSets/setCurrentSetRecord are
  // React's stable setState functions, and setCounterRef is a ref.
  const finalizeSet = (reps) => {
    setCounterRef.current += 1;
    const analytics = analyzeSet(reps);
    const validRepsCount = reps.filter((rep) => rep.valid).length;

    const record = {
      setNumber: setCounterRef.current,
      reps,
      validReps: validRepsCount,
      totalAttempts: reps.length,
      analytics,
      completedAt: Date.now(),
    };

    setSessionSets((prev) => [...prev, record]);
    setCurrentSetRecord(record);
    speech.announceSetSummary(validRepsCount, analytics.formScore.score);
    transitionTo(APP_STATES.SUMMARY);
  };

  // Entry point for both the "End Set" button and the 20s idle auto-end.
  // A too-short set is probably a mis-trigger, so confirm before
  // discarding it instead of silently producing a near-empty summary.
  const requestEndSet = () => {
    const reps = repCounter.getReps();
    if (reps.length < MIN_REPS_TO_SUMMARIZE) {
      setPendingDiscardConfirm(true);
      return;
    }
    finalizeSet(reps);
  };

  // Colors are defined once in core/drawing.js; publish them as CSS
  // custom properties so the HUD's CSS-based elements (cue banner, depth
  // bar, rep flash, setup UI) stay in sync with the canvas skeleton
  // automatically.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-good', SEVERITY_COLORS.good);
    root.style.setProperty('--color-warning', SEVERITY_COLORS.warning);
    root.style.setProperty('--color-critical', SEVERITY_COLORS.critical);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'd') {
        setShowDebug((prev) => {
          showDebugRef.current = !prev;
          return !prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keeps canvas.width/height (the actual pixel buffer) in sync with the
  // video's real resolution. This is different from CSS width/height —
  // CSS just stretches the canvas on screen, but the drawing surface
  // itself must match videoWidth/videoHeight or our coordinates will be
  // scaled/off when we draw pose landmarks on top of the video.
  const syncCanvasSize = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  };

  const startCamera = async () => {
    setStatus('loading');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;

      video.onloadedmetadata = () => {
        syncCanvasSize();
        setStatus('ready');
      };
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatus('denied');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setStatus('not-found');
      } else {
        setStatus('error');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    startCamera();

    const handleResize = () => syncCanvasSize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pose detection + draw loop. Runs once the camera is ready and the
  // model has finished loading, all the way through setup, countdown,
  // the active set, and any pauses — appStateRef decides what each frame
  // actually does (see the branches below) without ever tearing down and
  // recreating the smoother/trackers.
  useEffect(() => {
    if (status !== 'ready' || !landmarker) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const smoother = new LandmarkSmoother();

    let lastVideoTime = -1;
    let latestResult = null;
    const frameTimestamps = [];

    const loop = () => {
      // MediaPipe requires strictly increasing timestamps and throws if you
      // feed it the same video frame twice. requestAnimationFrame can fire
      // more often than the camera produces new frames, so only run
      // detectForVideo when video.currentTime has actually advanced;
      // otherwise just redraw the last known result.
      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        latestResult = landmarker.detectForVideo(video, performance.now());
      }

      // Rolling FPS average over the last FPS_WINDOW_SIZE frames.
      const now = performance.now();
      frameTimestamps.push(now);
      if (frameTimestamps.length > FPS_WINDOW_SIZE) frameTimestamps.shift();
      if (frameTimestamps.length > 1) {
        const avgFrameTime =
          (frameTimestamps[frameTimestamps.length - 1] - frameTimestamps[0]) /
          (frameTimestamps.length - 1);
        setFps(avgFrameTime > 0 ? Math.round(1000 / avgFrameTime) : 0);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const rawLandmarks = latestResult?.landmarks?.[0] ?? null;
      // Smooth every frame, even when rawLandmarks is null — the smoother
      // just passes null through, and calling it unconditionally keeps
      // each filter's internal clock consistent frame to frame.
      const smoothedLandmarks = smoother.smooth(rawLandmarks, performance.now());
      const hasPose = Boolean(smoothedLandmarks && smoothedLandmarks.length > 0);
      setDetected(hasPose);

      const currentAppState = appStateRef.current;

      if (currentAppState === APP_STATES.SETUP) {
        const checks = [
          checkFullBodyVisible(smoothedLandmarks, SETUP_CHECKS_CONFIG),
          checkWithinFrameBounds(smoothedLandmarks, SETUP_CHECKS_CONFIG),
          checkBodySize(smoothedLandmarks, SETUP_CHECKS_CONFIG),
          stabilityTracker.check(smoothedLandmarks, now),
          checkLighting(smoothedLandmarks, SETUP_CHECKS_CONFIG),
        ];
        setLiveSetupChecks(checks);
        setOrientationResult(orientationDetector.update(smoothedLandmarks, canvas.width / canvas.height, now));

        const firstFailing = checks.find((check) => !check.passed);
        speech.announceSetupHint(firstFailing?.hint ?? null);
      } else if (currentAppState === APP_STATES.ACTIVE) {
        let metrics = null;
        if (hasPose) metrics = getSquatMetrics(smoothedLandmarks, canvas.width / canvas.height);

        const result = repCounter.update(metrics, now);
        let feedback = EMPTY_FEEDBACK;

        if (hasPose) {
          feedback = buildFeedbackState(result.activeErrors, SQUAT_CONFIG);

          // ---- MIRROR FIX (the only place this happens) ----
          // The <canvas> has no CSS mirroring (only the <video> does), so
          // MediaPipe's landmarks — given in unmirrored video space —
          // must be flipped horizontally in code to line up with what
          // the user sees mirrored on screen.
          const mirroredLandmarks = smoothedLandmarks.map((point) => ({ ...point, x: 1 - point.x }));

          drawSkeleton(ctx, mirroredLandmarks, canvas.width, canvas.height, { segmentColors: feedback.segmentColors });
          drawLandmarks(ctx, mirroredLandmarks, canvas.width, canvas.height, { jointColors: feedback.jointColors });

          setCue({ message: feedback.primaryMessage, severity: feedback.primarySeverity });
        } else {
          setCue({ message: null, severity: null });
        }

        speech.update(result.state, feedback);

        // Depth bar fill: written straight to the DOM (no setState) since
        // it changes almost every frame — see DepthBar.jsx for why.
        if (metrics && depthFillRef.current) {
          const depthPercent = clamp(
            (depthBarStandingAngle - metrics.kneeAngleAvg) / (depthBarStandingAngle - depthBarDeepAngle),
            0,
            1
          );
          depthFillRef.current.style.height = `${depthPercent * 100}%`;
          depthFillRef.current.style.backgroundColor =
            depthPercent >= DEPTH_MARKER_PERCENT ? SEVERITY_COLORS.good : '#94a3b8';
        }

        if (result.justCompletedRep) {
          const rep = result.justCompletedRep;
          const failure = rep.valid ? null : pickPrimaryError(rep.errors, SQUAT_CONFIG.errorPriority);
          setFlash({ id: `${rep.repNumber}-${rep.endTime}`, valid: rep.valid, reason: failure?.message ?? null });
          speech.announceRep(result.state, rep, result.validReps);
        }

        if (showDebugRef.current) setDebugMetrics(metrics);

        // Auto-end: no rep in progress, just standing, for a while — the
        // person has likely finished without pressing "End Set".
        if (result.state === 'STANDING') {
          if (idleStandingSinceRef.current === null) idleStandingSinceRef.current = now;
          if (now - idleStandingSinceRef.current > AUTO_END_IDLE_MS) {
            idleStandingSinceRef.current = null;
            requestEndSet();
          }
        } else {
          idleStandingSinceRef.current = null;
        }

        // Mid-set framing monitor: only the "can we trust this framing"
        // checks apply here — stability doesn't, a squat is supposed to
        // move. Sustained failure (not a single bad frame) pauses the set.
        const framingChecks = runFramingChecks(smoothedLandmarks, SETUP_CHECKS_CONFIG);
        const framingOk = framingChecks.every((check) => check.passed);

        if (framingOk) {
          pauseSinceRef.current = null;
        } else {
          if (pauseSinceRef.current === null) pauseSinceRef.current = now;
          if (now - pauseSinceRef.current > PAUSE_THRESHOLD_MS) {
            const failing = framingChecks.find((check) => !check.passed);
            repCounter.abandonCurrentRep();
            setPauseReason(failing?.hint ?? 'Reposition');
            setResuming(false);
            pauseSinceRef.current = null;
            transitionTo(APP_STATES.PAUSED);
          }
        }
      } else if (currentAppState === APP_STATES.PAUSED) {
        if (showDebugRef.current) setDebugMetrics(null);

        const framingChecks = runFramingChecks(smoothedLandmarks, SETUP_CHECKS_CONFIG);
        const framingOk = framingChecks.every((check) => check.passed);

        if (framingOk) {
          if (resumeOkSinceRef.current === null) resumeOkSinceRef.current = now;
          if (now - resumeOkSinceRef.current > RESUME_STABLE_MS) {
            resumeOkSinceRef.current = null;
            setResuming(true);
            transitionTo(APP_STATES.COUNTDOWN);
          }
        } else {
          resumeOkSinceRef.current = null;
          const failing = framingChecks.find((check) => !check.passed);
          const hint = failing?.hint ?? 'Reposition';
          setPauseReason(hint);
          speech.announceSetupHint(hint);
        }
      }
      // COUNTDOWN: nothing to compute here — Countdown.jsx drives its own
      // timing and calls back into transitionTo(ACTIVE) when it finishes.

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
    // repCounter, speech, stabilityTracker, orientationDetector,
    // requestEndSet, and finalizeSet are intentionally omitted:
    // repCounter/speech are new objects every render but delegate to
    // stable class instances underneath, stabilityTracker/
    // orientationDetector are themselves stable (lazy useState, never
    // replaced), and requestEndSet/finalizeSet are plain functions that
    // only touch those same stable things (see the comment above
    // finalizeSet). Depending on any of them would tear down/rebuild the
    // smoother on every render instead of just on camera/model changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, landmarker]);

  if (status === 'denied') {
    return (
      <div className="camera-message">
        <p>Camera access was denied. Please allow camera access to use the form coach.</p>
        <button onClick={startCamera}>Try again</button>
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="camera-message">
        <p>No camera was found on this device.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="camera-message">
        <p>Something went wrong while starting the camera.</p>
        <button onClick={startCamera}>Try again</button>
      </div>
    );
  }

  const handleReset = () => {
    speech.announceSetEnd(repCounter.state, repCounter.validReps);
    repCounter.reset();
    speech.reset();
  };

  const handleSetupComplete = (exercise, orientation) => {
    repCounter.setOrientation(orientation);
    setSessionConfig({ exercise, orientation });
    setResuming(false);
    transitionTo(APP_STATES.COUNTDOWN);
  };

  const handleCountdownComplete = () => transitionTo(APP_STATES.ACTIVE);

  const handleDiscardConfirm = (discard) => {
    setPendingDiscardConfirm(false);
    if (discard) {
      repCounter.reset();
      speech.reset();
    }
  };

  // Alignment was already confirmed once this session to get here, so
  // skip straight to a countdown instead of the full SetupFlow.
  const handleNewSet = () => {
    repCounter.reset();
    speech.reset();
    setCurrentSetRecord(null);
    setResuming(false);
    transitionTo(APP_STATES.COUNTDOWN);
  };

  const handleDone = () => {
    repCounter.reset();
    speech.reset();
    setCurrentSetRecord(null);
    transitionTo(APP_STATES.SETUP);
  };

  const activeCheckNames = SQUAT_CONFIG.checks
    .filter((check) => check.isApplicable(sessionConfig.orientation))
    .map((check) => check.id);

  return (
    <div className="camera-view">
      {status === 'loading' && <div className="camera-message">Starting camera...</div>}

      {/* Only the video is CSS-mirrored (scaleX(-1)). The canvas stays
          unmirrored on screen; landmark coordinates are flipped in code
          instead (see the MIRROR FIX comment above). */}
      <div className="camera-stage" style={{ visibility: status === 'ready' ? 'visible' : 'hidden' }}>
        <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="camera-canvas" />

        {status === 'ready' && appState === APP_STATES.SETUP && (
          <SetupFlow
            liveChecks={liveSetupChecks}
            orientationResult={orientationResult}
            onStart={handleSetupComplete}
            onSkip={handleSetupComplete}
          />
        )}

        {status === 'ready' && appState === APP_STATES.COUNTDOWN && (
          <Countdown onComplete={handleCountdownComplete} resuming={resuming} />
        )}

        {status === 'ready' && appState === APP_STATES.PAUSED && <RepositionOverlay hint={pauseReason} />}

        {status === 'ready' && appState === APP_STATES.ACTIVE && (
          <>
            <StatsOverlay fps={fps} detected={detected} />

            <RepCounterOverlay
              validReps={repCounter.validReps}
              totalAttempts={repCounter.totalAttempts}
              pulseKey={flash && flash.valid ? flash.id : null}
              onReset={handleReset}
              onEndSet={requestEndSet}
            />

            <CueBanner message={cue.message} severity={cue.severity} />
            <RepFlash flash={flash} />
            <DepthBar ref={depthFillRef} markerPercent={DEPTH_MARKER_PERCENT} />
            <StateIndicator state={repCounter.state} orientation={sessionConfig.orientation} activeCheckNames={activeCheckNames} />

            {!poseLoading && !poseError && !detected && (
              <div className="camera-overlay-message">No person detected — step back into frame</div>
            )}

            {pendingDiscardConfirm && (
              <DiscardConfirm
                repCount={repCounter.reps.length}
                onDiscard={() => handleDiscardConfirm(true)}
                onKeepGoing={() => handleDiscardConfirm(false)}
              />
            )}
          </>
        )}

        {status === 'ready' && appState === APP_STATES.SUMMARY && currentSetRecord && (
          <SummaryScreen currentSet={currentSetRecord} sessionSets={sessionSets} onNewSet={handleNewSet} onDone={handleDone} />
        )}

        {status === 'ready' && <VoiceSettings settings={speech.settings} onChange={speech.setSettings} />}

        {status === 'ready' && showDebug && (
          <DebugPanel metrics={debugMetrics} reps={repCounter.reps} activeErrors={repCounter.activeErrors} />
        )}

        {status === 'ready' && poseLoading && <div className="camera-overlay-message">Loading pose model...</div>}

        {status === 'ready' && poseError && (
          <div className="camera-overlay-message camera-overlay-error">Failed to load the pose model.</div>
        )}
      </div>
    </div>
  );
}

export default CameraView;
