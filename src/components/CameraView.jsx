import { useEffect, useRef, useState } from 'react';
import './CameraView.css';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { drawSkeleton, drawLandmarks } from '../core/drawing';
import { LandmarkSmoother } from '../core/smoothing';
import { getSquatMetrics } from '../core/exercises/squat';
import StatsOverlay from './StatsOverlay';
import DebugPanel from './DebugPanel';

const FPS_WINDOW_SIZE = 30;

// Status of the camera: 'loading' | 'ready' | 'denied' | 'not-found' | 'error'
function CameraView() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafIdRef = useRef(null);

  const [status, setStatus] = useState('loading');
  const [fps, setFps] = useState(0);
  const [detected, setDetected] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugMetrics, setDebugMetrics] = useState(null);
  // Mirrors showDebug for the detection loop below to read without being
  // a dependency of that effect — depending on it directly would tear
  // down and recreate the LandmarkSmoother (losing its filter state, so
  // values would jump) every time 'd' is pressed.
  const showDebugRef = useRef(false);

  const { landmarker, isLoading: poseLoading, error: poseError } = usePoseDetection();

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
  // model has finished loading.
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

      if (smoothedLandmarks && smoothedLandmarks.length > 0) {
        // ---- MIRROR FIX (the only place this happens) ----
        // The <canvas> has no CSS mirroring (only the <video> does), so
        // MediaPipe's landmarks — given in unmirrored video space — must
        // be flipped horizontally in code to line up with what the user
        // sees mirrored on screen. Metrics below use the unmirrored
        // smoothedLandmarks directly, since angles are unaffected by a
        // horizontal flip and mirroring is purely a display concern.
        const mirroredLandmarks = smoothedLandmarks.map((point) => ({
          ...point,
          x: 1 - point.x,
        }));

        drawSkeleton(ctx, mirroredLandmarks, canvas.width, canvas.height);
        drawLandmarks(ctx, mirroredLandmarks, canvas.width, canvas.height);
        setDetected(true);

        if (showDebugRef.current) {
          const aspectRatio = canvas.width / canvas.height;
          setDebugMetrics(getSquatMetrics(smoothedLandmarks, aspectRatio));
        }
      } else {
        setDetected(false);
        if (showDebugRef.current) setDebugMetrics(null);
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
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

  return (
    <div className="camera-view">
      {status === 'loading' && <div className="camera-message">Starting camera...</div>}

      {/* Only the video is CSS-mirrored (scaleX(-1)). The canvas stays
          unmirrored on screen; landmark coordinates are flipped in code
          instead (see the MIRROR FIX comment above). */}
      <div className="camera-stage" style={{ visibility: status === 'ready' ? 'visible' : 'hidden' }}>
        <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="camera-canvas" />

        {status === 'ready' && <StatsOverlay fps={fps} detected={detected} />}

        {status === 'ready' && showDebug && <DebugPanel metrics={debugMetrics} />}

        {status === 'ready' && poseLoading && (
          <div className="camera-overlay-message">Loading pose model...</div>
        )}

        {status === 'ready' && poseError && (
          <div className="camera-overlay-message camera-overlay-error">
            Failed to load the pose model.
          </div>
        )}

        {status === 'ready' && !poseLoading && !poseError && !detected && (
          <div className="camera-overlay-message">No person detected — step back into frame</div>
        )}
      </div>
    </div>
  );
}

export default CameraView;
