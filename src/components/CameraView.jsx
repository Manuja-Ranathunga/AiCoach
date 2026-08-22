import { useEffect, useRef, useState } from 'react';
import './CameraView.css';

// Status of the camera: 'loading' | 'ready' | 'denied' | 'not-found' | 'error'
function CameraView() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafIdRef = useRef(null);

  const [status, setStatus] = useState('loading');

  // Keeps canvas.width/height (the actual pixel buffer) in sync with the
  // video's real resolution. This is different from CSS width/height —
  // CSS just stretches the canvas on screen, but the drawing surface
  // itself must match videoWidth/videoHeight or our coordinates will be
  // scaled/off when we later draw pose landmarks on top of the video.
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
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- TODO(Phase 1): delete this whole block once real pose drawing exists ----
  // Temporary test draw to visually confirm the canvas is perfectly aligned
  // with the video underneath it: a red border around the canvas edge and
  // a green dot in the exact center.
  useEffect(() => {
    if (status !== 'ready') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Red border around the canvas edge
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

      // Green dot in the center
      ctx.fillStyle = 'lime';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 8, 0, Math.PI * 2);
      ctx.fill();

      rafIdRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [status]);
  // ---- END TODO(Phase 1) ----

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

      {/* Video and canvas are both mirrored with scaleX(-1) and stacked
          exactly on top of each other via the .camera-stage wrapper below. */}
      <div className="camera-stage" style={{ visibility: status === 'ready' ? 'visible' : 'hidden' }}>
        <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="camera-canvas" />
      </div>
    </div>
  );
}

export default CameraView;
