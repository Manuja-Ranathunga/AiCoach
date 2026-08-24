import { useEffect, useRef, useState } from 'react';
import './CameraView.css';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { useRepCounter } from '../hooks/useRepCounter';
import { useSpeechFeedback } from '../hooks/useSpeechFeedback';
import {
  drawSkeleton,
  drawLandmarks,
  SEVERITY_COLORS,
  LandmarkSmoother,
  getSquatMetrics,
  SQUAT_CONFIG,
  buildFeedbackState,
  pickPrimaryError,
  SETUP_CHECKS_CONFIG,
  checkFullBodyVisible,
  checkWithinFrameBounds,
  checkBodySize,
  checkLighting,
  runFramingChecks,
  StabilityTracker,
  OrientationDetector,
  ORIENTATIONS,
  analyzeSet,
} from '@ai-coach/ml-engine';
import { APP_STATES } from '../core/appStateMachine';
import StatsOverlay from './StatsOverlay';
import DebugPanel from './DebugPanel';
import RepCounterOverlay from './RepCounterOverlay';
import CueBanner from './CueBanner';
import RepFlash from './RepFlash';
import StateIndicator from './StateIndicator';
import DepthBar from './DepthBar';
import VoiceSettings from './VoiceSettings';
import SetupFlow from './SetupFlow';
import SessionConfig from './SessionConfig';
import Countdown from './Countdown';
import RepositionOverlay from './RepositionOverlay';
import SummaryScreen from './SummaryScreen';
import DiscardConfirm from './DiscardConfirm';
import ResumeSessionPrompt from './ResumeSessionPrompt';
import StorageWarningBanner from './StorageWarningBanner';
import * as sessionStore from '../storage/sessionStore';
import { DEFAULT_TARGET_REPS, hasReachedTarget } from '../core/targetReps';
import { DEFAULT_COUNTDOWN_SECONDS, DEFAULT_IDLE_TIMEOUT_MS } from '../core/sessionOptions';

const FPS_WINDOW_SIZE = 30;
const EMPTY_FEEDBACK = { primaryId: null, primaryMessage: null, primarySeverity: null };

// How long framing must stay bad mid-set before the app pauses, and how
// long it must stay good again before auto-resuming. Different numbers
// on purpose: pausing should be conservative (don't interrupt a set over
// one bad frame), but resuming can react a bit faster once the person is
// visibly back in position.
const PAUSE_THRESHOLD_MS = 2000;
const RESUME_STABLE_MS = 800;
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
  // Every set completed so far this session, plus the one currently on
  // screen in SUMMARY. Persisted to IndexedDB incrementally after each
  // set (see finalizeSet/persistSession) so a crash/refresh only ever
  // loses the set still in progress, never the ones already finished.
  const [sessionSets, setSessionSets] = useState([]);
  const [currentSetRecord, setCurrentSetRecord] = useState(null);
  const [pendingDiscardConfirm, setPendingDiscardConfirm] = useState(false);
  // undefined = still checking on mount, null = none found, object = an
  // unfinished session to offer resuming (see storage/sessionStore.js's
  // getUnfinishedSessionToday and the mount effect below).
  const [resumeCandidate, setResumeCandidate] = useState(undefined);
  const [storageWarning, setStorageWarning] = useState(null);

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
  // Tracks how long it's been since the person was last actively mid-rep
  // with good framing — covers standing idle between reps, AND not being
  // visible/framed at all (walked out of frame, camera blocked, etc.).
  // Deliberately one clock spanning ACTIVE and PAUSED (see both branches
  // in the loop below): walking out of frame first pauses the set after
  // PAUSE_THRESHOLD_MS without resetting this clock, so if the person
  // never comes back the set still auto-ends via the configured idle
  // timeout instead of staying paused forever.
  const inactiveSinceRef = useRef(null);
  // Set numbers are a plain counter rather than derived from
  // sessionSets.length so finalizeSet doesn't need to read that state
  // back (see the comment on finalizeSet below).
  const setCounterRef = useRef(0);
  // Phase 9 persistence bookkeeping — refs (not state) because they're
  // read from inside the detection loop's stale effect closure the same
  // way appStateRef/showDebugRef are. sessionId/sessionStartedAt are
  // created lazily (see finalizeSet) on the first set actually completed,
  // so a session the user never really started never gets saved.
  const sessionIdRef = useRef(null);
  const sessionStartedAtRef = useRef(null);
  const sessionSetsRef = useRef([]); // mirrors sessionSets state, kept in sync wherever it's set
  const sessionConfigRef = useRef({ exercise: 'squat', orientation: 'front' }); // mirrors sessionConfig state
  const currentSetStartedAtRef = useRef(null); // wall-clock start of the set in progress (see handleCountdownComplete)
  const storageWarnedRef = useRef(false);
  // The configured target/countdown-length/idle-timeout for the set about
  // to start (or in progress) — set from the CONFIGURING step (see
  // SessionConfig.jsx). targetRepsRef and idleTimeoutMsRef are read from
  // inside the detection loop's stale closure the same way sessionConfigRef
  // is (see the target-reached check and the idle auto-end below); all
  // three double as the defaults SessionConfig pre-fills next time ("New
  // Set" reuses the last-used values instead of asking with no default).
  const targetRepsRef = useRef(DEFAULT_TARGET_REPS);
  const countdownSecondsRef = useRef(DEFAULT_COUNTDOWN_SECONDS);
  const idleTimeoutMsRef = useRef(DEFAULT_IDLE_TIMEOUT_MS);

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

  // Shows the storage-unavailable banner once per page load — see its
  // component comment for why the workout itself never depends on this.
  const warnStorageOnce = () => {
    if (storageWarnedRef.current) return;
    storageWarnedRef.current = true;
    setStorageWarning('storage-unavailable');
  };

  // Upserts the whole session (all sets so far) to IndexedDB. Called
  // after every finalized set, not just when the workout ends, so a
  // crash/refresh mid-workout only ever loses the set in progress, never
  // the ones already completed — see storage/sessionStore.js's
  // getUnfinishedSessionToday for the other half of that story.
  const persistSession = async (sets, finished) => {
    if (sessionIdRef.current === null || sets.length === 0) return;

    const session = {
      id: sessionIdRef.current,
      startedAt: sessionStartedAtRef.current,
      endedAt: Date.now(),
      exercise: sessionConfigRef.current.exercise,
      sets,
      active: !finished,
    };

    const ok = await sessionStore.saveSession(session);
    if (!ok) warnStorageOnce();
  };

  // Turns the machine's live rep array into a finalized set record and
  // moves to SUMMARY. Defined here (not down with handleReset etc.)
  // because, like transitionTo, it's called directly from inside the
  // detection loop's stale effect closure (the idle auto-end below) —
  // safe because everything it touches is stable across renders:
  // repCounter.getReps()/reset() delegate to the never-replaced
  // RepStateMachine instance, setSessionSets/setCurrentSetRecord are
  // React's stable setState functions, and every ref (setCounterRef,
  // sessionIdRef, sessionConfigRef, sessionSetsRef,
  // currentSetStartedAtRef, targetRepsRef) is, well, a ref.
  //
  // endReason is 'manual' (End Set button), 'timeout' (idle auto-end), or
  // 'target_reached' (valid reps hit the configured target) — see
  // requestEndSet's callers.
  const finalizeSet = (reps, endReason) => {
    setCounterRef.current += 1;
    const analytics = analyzeSet(reps);
    const validRepsCount = reps.filter((rep) => rep.valid).length;
    const config = sessionConfigRef.current;
    const now = Date.now();

    const record = {
      setNumber: setCounterRef.current,
      exercise: config.exercise,
      orientation: config.orientation,
      startedAt: currentSetStartedAtRef.current ?? now,
      endedAt: now,
      reps,
      validReps: validRepsCount,
      totalAttempts: reps.length,
      targetReps: targetRepsRef.current,
      endReason,
      analytics,
      completedAt: now,
    };

    if (sessionIdRef.current === null) {
      sessionIdRef.current = crypto.randomUUID();
      sessionStartedAtRef.current = record.startedAt;
    }

    const nextSets = [...sessionSetsRef.current, record];
    sessionSetsRef.current = nextSets;
    setSessionSets(nextSets);
    setCurrentSetRecord(record);
    speech.announceSetSummary(validRepsCount, analytics.formScore.score);
    transitionTo(APP_STATES.SUMMARY);

    persistSession(nextSets, false);
  };

  // Entry point for the "End Set" button, the inactivity auto-end, and the
  // target-reached auto-end. A too-short manual/target-reached end is
  // probably a mis-trigger, so confirm before discarding it instead of
  // silently producing a near-empty summary. 'timeout' skips that gate:
  // it can fire while PAUSED (the person walked out of frame and never
  // came back), where the confirm dialog isn't even rendered — and
  // there's nobody there to answer it regardless — so just close the set
  // with whatever reps it has.
  const requestEndSet = (reason) => {
    const reps = repCounter.getReps();
    if (reason !== 'timeout' && reps.length < MIN_REPS_TO_SUMMARIZE) {
      setPendingDiscardConfirm(true);
      return;
    }
    finalizeSet(reps, reason);
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

  // Once per mount: was there a session started today that never got a
  // "Done" (see handleDone, which is the only thing that marks a session
  // finished)? That's a refresh or crash mid-workout — offer to pick it
  // back up. See ResumeSessionPrompt's comment for what resuming actually
  // restores vs. what it can't (camera framing state is gone either way).
  useEffect(() => {
    let cancelled = false;
    sessionStore.getUnfinishedSessionToday().then((session) => {
      if (!cancelled) setResumeCandidate(session);
    });
    return () => {
      cancelled = true;
    };
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

          // Auto-end: the configured target was just hit. Checked here
          // (not every frame) since validReps only changes on rep
          // completion.
          if (hasReachedTarget(result.validReps, targetRepsRef.current)) {
            requestEndSet('target_reached');
          }
        }

        if (showDebugRef.current) setDebugMetrics(metrics);

        // Mid-set framing monitor: only the "can we trust this framing"
        // checks apply here — stability doesn't, a squat is supposed to
        // move. Sustained failure (not a single bad frame) pauses the set.
        const framingChecks = runFramingChecks(smoothedLandmarks, SETUP_CHECKS_CONFIG);
        const framingOk = framingChecks.every((check) => check.passed);

        // Auto-end: the person hasn't been actively mid-rep with good
        // framing for a while — either standing idle between reps, or not
        // framed/visible at all (about to pause, or already out of frame).
        // A rep actually in progress with good framing is the only thing
        // that resets the clock; see the PAUSED branch below for why it
        // keeps running (not resetting) once the set actually pauses.
        const isActivelyRepping = framingOk && result.state !== 'STANDING';
        if (isActivelyRepping) {
          inactiveSinceRef.current = null;
        } else {
          if (inactiveSinceRef.current === null) inactiveSinceRef.current = now;
          if (now - inactiveSinceRef.current > idleTimeoutMsRef.current) {
            inactiveSinceRef.current = null;
            requestEndSet('timeout');
          }
        }

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
          // Framing recovered — they're active again, so the same clock
          // ACTIVE was running clears here too, before the auto-resume
          // countdown starts.
          inactiveSinceRef.current = null;
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

          // Still not framed — keep the same clock ACTIVE started running
          // (never resetting it here) so a person who never comes back
          // gets the set auto-ended instead of paused indefinitely.
          if (inactiveSinceRef.current === null) inactiveSinceRef.current = now;
          if (now - inactiveSinceRef.current > idleTimeoutMsRef.current) {
            inactiveSinceRef.current = null;
            requestEndSet('timeout');
          }
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
    // replaced), and requestEndSet/finalizeSet (which itself calls
    // persistSession/warnStorageOnce) are plain functions that only touch
    // those same stable things plus the sessionStore module's exports,
    // which are themselves stable (see the comment above finalizeSet).
    // Depending on any of them would tear down/rebuild the smoother on
    // every render instead of just on camera/model changes.
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
    const next = { exercise, orientation };
    sessionConfigRef.current = next; // see the comment on finalizeSet for why this needs a ref mirror
    setSessionConfig(next);
    setResuming(false);
    transitionTo(APP_STATES.CONFIGURING);
  };

  const handleConfigConfirm = (config) => {
    targetRepsRef.current = config.targetReps;
    countdownSecondsRef.current = config.countdownSeconds;
    idleTimeoutMsRef.current = config.idleTimeoutMs;
    transitionTo(APP_STATES.COUNTDOWN);
  };

  const handleCountdownComplete = () => {
    // Only stamp a fresh "set started" wall-clock time for a genuinely
    // new set — when resuming after a mid-set pause, this same countdown
    // fires but the set already has a real start time from before the
    // pause, which finalizeSet needs to stay accurate.
    if (!resuming) currentSetStartedAtRef.current = Date.now();
    transitionTo(APP_STATES.ACTIVE);
  };

  const handleDiscardConfirm = (discard) => {
    setPendingDiscardConfirm(false);
    if (discard) {
      repCounter.reset();
      speech.reset();
    }
  };

  // Alignment was already confirmed once this session to get here, so
  // skip straight to picking a target/countdown/timeout instead of the
  // full SetupFlow — SessionConfig pre-fills with the last-used values.
  const handleNewSet = () => {
    repCounter.reset();
    speech.reset();
    setCurrentSetRecord(null);
    setResuming(false);
    transitionTo(APP_STATES.CONFIGURING);
  };

  const handleDone = () => {
    persistSession(sessionSetsRef.current, true); // marks the session finished (active: false)
    sessionIdRef.current = null;
    sessionStartedAtRef.current = null;
    sessionSetsRef.current = [];
    setCounterRef.current = 0;
    setSessionSets([]);
    repCounter.reset();
    speech.reset();
    setCurrentSetRecord(null);
    transitionTo(APP_STATES.SETUP);
  };

  const handleResumeSession = (session) => {
    sessionIdRef.current = session.id;
    sessionStartedAtRef.current = session.startedAt;
    sessionSetsRef.current = session.sets;
    setCounterRef.current = session.sets.reduce((max, set) => Math.max(max, set.setNumber), 0);
    setSessionSets(session.sets);
    setResumeCandidate(null);
    // Camera framing/orientation tracking doesn't survive a refresh, so
    // resuming still goes through the full SETUP flow (already the
    // default appState) rather than assuming anything about where the
    // person is standing right now.
  };

  const handleDiscardSession = async (session) => {
    await sessionStore.deleteSession(session.id);
    setResumeCandidate(null);
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

        {status === 'ready' && appState === APP_STATES.SETUP && resumeCandidate && (
          <ResumeSessionPrompt
            session={resumeCandidate}
            onResume={() => handleResumeSession(resumeCandidate)}
            onDiscard={() => handleDiscardSession(resumeCandidate)}
          />
        )}

        {status === 'ready' && appState === APP_STATES.CONFIGURING && (
          <SessionConfig
            defaults={{
              targetReps: targetRepsRef.current,
              countdownSeconds: countdownSecondsRef.current,
              idleTimeoutMs: idleTimeoutMsRef.current,
            }}
            onConfirm={handleConfigConfirm}
          />
        )}

        {status === 'ready' && appState === APP_STATES.COUNTDOWN && (
          <Countdown onComplete={handleCountdownComplete} resuming={resuming} seconds={countdownSecondsRef.current} />
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
              onEndSet={() => requestEndSet('manual')}
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

        {status === 'ready' && storageWarning && <StorageWarningBanner onDismiss={() => setStorageWarning(null)} />}

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
