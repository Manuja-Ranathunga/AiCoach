import { useEffect, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

// Match this to the installed @mediapipe/tasks-vision version so the wasm
// runtime downloaded from the CDN is guaranteed compatible with the JS API.
const TASKS_VISION_VERSION = '1.0.1';
const WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

// Loads the MediaPipe PoseLandmarker once and exposes it for detection.
// The caller (CameraView) is responsible for running detectForVideo in its
// own animation loop — this hook only owns the model's lifecycle.
export function usePoseDetection() {
  const [landmarker, setLandmarker] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let createdLandmarker = null;

    async function load() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);

        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });

        if (cancelled) {
          poseLandmarker.close();
          return;
        }

        createdLandmarker = poseLandmarker;
        setLandmarker(poseLandmarker);
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      if (createdLandmarker) createdLandmarker.close();
    };
  }, []);

  return { landmarker, isLoading, error };
}
