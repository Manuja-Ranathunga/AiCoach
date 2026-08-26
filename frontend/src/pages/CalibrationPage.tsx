import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ChecklistItem } from '../components/ui/ChecklistItem';
import { SkeletonGlyph } from '../components/ui/SkeletonGlyph';
import { useCamera } from '../hooks/useCamera';
import { useExerciseBySlug } from '../hooks/useExerciseBySlug';
import { createPoseEngine, type CalibrationState, type PoseEngineHandle } from '../lib/pose-engine';

const PENDING_CALIBRATION: CalibrationState = {
  checks: [
    { id: 'lighting', label: 'Lighting', status: 'pending', message: 'Waiting for camera…' },
    { id: 'framing', label: 'Framing & distance', status: 'pending', message: 'Waiting for camera…' },
    { id: 'visibility', label: 'Pose visibility', status: 'pending', message: 'Waiting on framing to resolve.' },
  ],
  allPassed: false,
  distanceMeters: null,
  confidence: null,
  fps: null,
  keypointsVisible: 0,
  keypointsTotal: 17,
};

export function CalibrationPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { exercise } = useExerciseBySlug(slug);
  const { videoRef, status: cameraStatus } = useCamera(true);
  const engineRef = useRef<PoseEngineHandle | null>(null);
  const [calibration, setCalibration] = useState<CalibrationState>(PENDING_CALIBRATION);

  useEffect(() => {
    if (cameraStatus !== 'active' || !videoRef.current) return;

    const engine = createPoseEngine(videoRef.current, slug, {
      onCalibrationUpdate: setCalibration,
    });
    engineRef.current = engine;
    engine.startCalibration();

    return () => engine.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraStatus, slug]);

  const allPassed = calibration?.allPassed ?? false;
  const passedCount = calibration?.checks.filter((c) => c.status === 'pass').length ?? 0;

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-elevated)' }}>
      <div
        style={{
          height: 64,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          borderBottom: '1px solid var(--border-08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: allPassed ? '#5FBF8B' : 'var(--accent-blue)',
            }}
          />
          <div style={{ font: '500 12px var(--font-mono)', letterSpacing: '.12em', color: 'var(--text)' }}>
            CALIBRATION · {exercise?.name.toUpperCase() ?? slug.toUpperCase()}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, font: '400 13px var(--font-body)' }}>
          <button
            onClick={() => navigate(`/exercises/${slug}/configure`)}
            style={{ background: 'none', border: 'none', color: 'var(--text-50)' }}
          >
            Skip checks
          </button>
          <button
            onClick={() => navigate('/exercises')}
            style={{ background: 'none', border: 'none', color: 'var(--text-35)', fontSize: 20, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 420px' }}>
        <div style={{ padding: 40, display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16/9',
              background: '#0B0C0E',
              border: `1px solid ${allPassed ? 'rgba(95,191,139,.3)' : 'var(--border-12)'}`,
              overflow: 'hidden',
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)',
                opacity: cameraStatus === 'active' ? 1 : 0,
              }}
            />
            {cameraStatus !== 'active' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  font: '400 13px var(--font-body)',
                  color: 'var(--text-45)',
                  textAlign: 'center',
                  padding: 24,
                }}
              >
                {cameraStatus === 'denied'
                  ? 'Camera access was denied. Enable it in your browser settings to calibrate.'
                  : cameraStatus === 'unavailable'
                    ? 'No camera was found on this device.'
                    : 'Requesting camera…'}
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: 16,
                font: '400 10.5px var(--font-mono)',
                color: 'var(--text-40)',
              }}
            >
              LAPTOP WEBCAM FEED · 16:9 · live preview
            </div>
            <div
              style={{
                position: 'absolute',
                top: 12,
                right: 16,
                font: '400 10.5px var(--font-mono)',
                color: 'var(--text-40)',
                border: '1px solid var(--border-14)',
                padding: '4px 8px',
              }}
            >
              MIRRORED
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SkeletonGlyph
                size={allPassed ? 200 : 170}
                state={allPassed ? 'good' : 'tracking'}
                flagLowerBody={!allPassed && (calibration?.checks.find((c) => c.id === 'framing')?.status === 'warn')}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 14,
                left: 16,
                display: 'flex',
                gap: 10,
                font: '400 10.5px var(--font-mono)',
                color: allPassed ? '#5FBF8B' : 'var(--text-45)',
              }}
            >
              <span>
                {calibration?.keypointsVisible ?? 0} / {calibration?.keypointsTotal ?? 17} KEYPOINTS
              </span>
              {!allPassed && calibration?.checks.find((c) => c.status === 'warn') && (
                <span style={{ color: '#E0A458' }}>KNEES OUT OF FRAME</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ borderLeft: '1px solid var(--border-08)', padding: '44px 36px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ font: '500 11px var(--font-mono)', letterSpacing: '.12em', color: 'var(--text-45)' }}>
            PRE-FLIGHT CHECKS
          </div>

          {!allPassed ? (
            <>
              <div style={{ marginTop: 10, font: '500 22px/1.3 var(--font-display)', color: 'var(--text)' }}>
                {passedCount} of {calibration?.checks.length ?? 3} passing
              </div>
              <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(calibration?.checks ?? []).map((check) => (
                  <ChecklistItem key={check.id} label={check.label} message={check.message} status={check.status} />
                ))}
              </div>
            </>
          ) : (
            <div style={{ marginTop: 44, border: '1px solid rgba(95,191,139,.35)', background: 'rgba(95,191,139,.07)', padding: '32px 28px' }}>
              <svg width="30" height="30" viewBox="0 0 18 18">
                <circle cx="9" cy="9" r="8.25" fill="none" stroke="#5FBF8B" strokeWidth="1" />
                <path d="M5.4 9.2l2.5 2.5 4.7-5" fill="none" stroke="#5FBF8B" strokeWidth="1.2" />
              </svg>
              <div style={{ marginTop: 22, font: '500 22px/1.3 var(--font-display)', color: 'var(--text)' }}>
                All checks passed
              </div>
              <div style={{ marginTop: 10, font: '400 13px/1.6 var(--font-body)', color: 'var(--text-55)' }}>
                Lighting, framing and full-body visibility confirmed. Hold this position and distance.
              </div>
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8, font: '400 11px var(--font-mono)', color: 'var(--text-45)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>DISTANCE</span>
                  <span className="tabular-nums" style={{ color: 'var(--text)' }}>
                    {calibration?.distanceMeters?.toFixed(1)} m
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>CONFIDENCE</span>
                  <span className="tabular-nums" style={{ color: 'var(--text)' }}>
                    {calibration?.confidence?.toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>FPS</span>
                  <span className="tabular-nums" style={{ color: 'var(--text)' }}>
                    {calibration?.fps}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div style={{ flex: 1 }} />
          <Button
            fullWidth
            disabled={!allPassed}
            onClick={() => navigate(`/exercises/${slug}/configure`)}
          >
            Continue
          </Button>
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              onClick={() => engineRef.current?.startCalibration()}
              style={{ background: 'none', border: 'none', font: '400 13px var(--font-body)', color: 'var(--text-45)' }}
            >
              Re-run checks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
