import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ProgressRing } from '../components/ui/ProgressRing';
import { SkeletonGlyph } from '../components/ui/SkeletonGlyph';
import { VoiceCaption } from '../components/ui/VoiceCaption';
import { useCamera } from '../hooks/useCamera';
import { useCreateSession } from '../hooks/queries';
import { createPoseEngine, type PoseEngineHandle, type RepResult } from '../lib/pose-engine';
import type { FormIssue, RepEvent, SessionCreatePayload } from '../types';
import type { RunSettings } from '../types/run';

const CAPTION_HOLD_MS = 2400;

/** Placeholder scoring until the real `/ml` engine supplies a computed score per set. */
function estimateScore(reps: RepResult[]): number {
  if (reps.length === 0) return 0;
  const correctRatio = reps.filter((r) => r.correct).length / reps.length;
  return Math.round(60 + 40 * correctRatio);
}

function aggregateFormIssues(reps: RepResult[]): FormIssue[] {
  const byType = new Map<string, FormIssue>();
  reps.forEach((rep) => {
    rep.issues.forEach((issue) => {
      const existing = byType.get(issue.type);
      if (existing) {
        existing.occurrences += 1;
        existing.rep_numbers.push(rep.index);
      } else {
        byType.set(issue.type, {
          issue_type: issue.type,
          label: issue.label,
          detail: issue.detail,
          occurrences: 1,
          rep_numbers: [rep.index],
        });
      }
    });
  });
  return Array.from(byType.values());
}

export function ActiveTrackingPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const runSettings = location.state as RunSettings | null;

  const { videoRef, status: cameraStatus } = useCamera(true);
  const engineRef = useRef<PoseEngineHandle | null>(null);
  const createSession = useCreateSession();
  const finalizedRef = useRef(false);

  const [reps, setReps] = useState<RepResult[]>([]);
  const repsRef = useRef<RepResult[]>([]);
  const [caption, setCaption] = useState<{ text: string; tone: 'good' | 'warn' } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const captionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!runSettings) {
      navigate(`/exercises/${slug}/configure`, { replace: true });
    }
  }, [runSettings, navigate, slug]);

  useEffect(() => {
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  async function finalize(finalReps: RepResult[]) {
    if (finalizedRef.current || !runSettings) return;
    finalizedRef.current = true;
    engineRef.current?.stopTracking();

    const correct = finalReps.filter((r) => r.correct).length;
    const flagged = finalReps.length - correct;
    const avgTempo = finalReps.length
      ? finalReps.reduce((sum, r) => sum + r.tempoSeconds, 0) / finalReps.length
      : 0;
    const deepestAngle = finalReps.length
      ? Math.min(...finalReps.map((r) => r.deepestAngleDegrees ?? 999))
      : null;

    const payload: SessionCreatePayload = {
      exercise_id: runSettings.exerciseId,
      target_reps: runSettings.targetReps,
      reps_completed: finalReps.length,
      reps_correct: correct,
      reps_flagged: flagged,
      score: estimateScore(finalReps),
      duration_seconds: elapsedSeconds,
      avg_tempo_seconds: Number(avgTempo.toFixed(2)),
      deepest_angle_degrees: deepestAngle,
      cues_spoken_count: finalReps.length,
      form_issues: aggregateFormIssues(finalReps),
      rep_events: finalReps.map<RepEvent>((r) => ({
        rep_index: r.index,
        correct: r.correct,
        quality: Number(r.quality.toFixed(2)),
        tempo_seconds: Number(r.tempoSeconds.toFixed(2)),
      })),
    };

    const created = await createSession.mutateAsync(payload);
    navigate(`/sessions/${created.id}`, { replace: true });
  }

  useEffect(() => {
    if (cameraStatus !== 'active' || !videoRef.current || !runSettings) return;

    const engine = createPoseEngine(videoRef.current, runSettings.exerciseSlug, {
      onRep: (rep) => {
        const next = [...repsRef.current, rep];
        repsRef.current = next;
        setReps(next);
        if (runSettings.voiceCoachingEnabled) {
          setCaption({ text: rep.caption, tone: rep.correct ? 'good' : 'warn' });
          if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
          captionTimerRef.current = setTimeout(() => setCaption(null), CAPTION_HOLD_MS);
        }
      },
      onSetComplete: () => {
        finalize(repsRef.current);
      },
    });
    engineRef.current = engine;
    engine.startTracking(runSettings.targetReps);

    return () => engine.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraStatus, runSettings?.exerciseSlug]);

  if (!runSettings) return null;

  const lastRep = reps[reps.length - 1];
  const glyphState = lastRep ? (lastRep.correct ? 'good' : 'warn') : 'tracking';
  const progress = reps.length / runSettings.targetReps;
  const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const ss = String(elapsedSeconds % 60).padStart(2, '0');

  return (
    <div style={{ minHeight: '100%', background: '#0B0C0E', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#0B0C0E', overflow: 'hidden' }}>
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
            }}
          />
          <div style={{ position: 'absolute', bottom: 16, right: 20, font: '400 10.5px var(--font-mono)', color: 'var(--text-35)' }}>
            LAPTOP WEBCAM FEED · 16:9 · 28 FPS
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SkeletonGlyph size={230} state={glyphState} flagLowerBody={!!lastRep && !lastRep.correct} />
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', top: 40, left: 48 }}>
        <div style={{ font: '500 11px var(--font-mono)', letterSpacing: '.14em', color: 'var(--text-50)' }}>REPS</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 6 }}>
          <div className="tabular-nums" style={{ font: '500 128px/.85 var(--font-display)', color: 'var(--text)', letterSpacing: '-.02em' }}>
            {String(reps.length).padStart(2, '0')}
          </div>
          <div className="tabular-nums" style={{ font: '500 30px var(--font-display)', color: 'var(--text-35)' }}>
            / {runSettings.targetReps}
          </div>
        </div>
        {lastRep && (
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: lastRep.correct ? '#5FBF8B' : '#E0A458' }} />
            <span style={{ font: '400 12px var(--font-mono)', color: lastRep.correct ? '#5FBF8B' : '#E0A458' }}>
              {lastRep.correct ? 'REP COUNTED' : 'FORM FLAGGED'}
            </span>
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', top: 40, right: 48, display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ font: '500 11px var(--font-mono)', letterSpacing: '.14em', color: 'var(--text-50)' }}>SET PROGRESS</div>
          <div className="tabular-nums" style={{ marginTop: 8, font: '500 24px var(--font-display)', color: 'var(--text)' }}>
            {Math.round(progress * 100)}%
          </div>
          <div className="tabular-nums" style={{ marginTop: 6, font: '400 11px var(--font-mono)', color: 'var(--text-40)' }}>
            {mm}:{ss} ELAPSED
          </div>
        </div>
        <ProgressRing progress={progress} />
      </div>

      {caption && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 132, display: 'flex', justifyContent: 'center' }}>
          <VoiceCaption text={caption.text} tone={caption.tone} />
        </div>
      )}

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 44, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => finalize(reps)}
          style={{
            height: 56,
            padding: '0 44px',
            border: '1px solid var(--border-22)',
            background: 'rgba(11,12,14,.7)',
            color: 'var(--text)',
            font: '600 15px var(--font-body)',
            letterSpacing: '.02em',
          }}
        >
          End Set
        </button>
      </div>
    </div>
  );
}
