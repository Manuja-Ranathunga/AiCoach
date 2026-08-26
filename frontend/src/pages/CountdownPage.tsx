import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { SkeletonGlyph } from '../components/ui/SkeletonGlyph';
import type { RunSettings } from '../types/run';

export function CountdownPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const runSettings = location.state as RunSettings | null;
  const [count, setCount] = useState(runSettings?.countdownSeconds ?? 5);

  useEffect(() => {
    if (!runSettings) {
      navigate(`/exercises/${slug}/configure`, { replace: true });
      return;
    }
    if (count <= 0) {
      navigate(`/exercises/${slug}/track`, { state: runSettings, replace: true });
      return;
    }
    const id = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [count, runSettings, navigate, slug]);

  if (!runSettings) return null;

  const total = runSettings.countdownSeconds;
  const ticks = Array.from({ length: total }, (_, i) => i < total - count + 1 || count === 0);

  return (
    <div
      style={{
        minHeight: '100%',
        background: '#101214',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, opacity: 0.28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <SkeletonGlyph size={250} state="neutral" />
      </div>
      <div style={{ position: 'absolute', top: 32, left: 40, font: '400 11px var(--font-mono)', letterSpacing: '.12em', color: 'var(--text-45)' }}>
        {runSettings.exerciseName.toUpperCase()} · {runSettings.targetReps} REPS · CAMERA REACTIVATING
      </div>
      <button
        onClick={() => navigate(`/exercises/${slug}/configure`)}
        style={{ position: 'absolute', top: 32, right: 40, background: 'none', border: 'none', font: '400 13px var(--font-body)', color: 'var(--text-45)' }}
      >
        Cancel
      </button>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <div className="tabular-nums" style={{ font: '500 300px/1 var(--font-display)', color: 'var(--text)', letterSpacing: '-.03em' }}>
          {count > 0 ? count : ''}
        </div>
        <div style={{ marginTop: 28, font: '400 20px var(--font-body)', color: 'var(--text-60)' }}>Get in position</div>
        <div style={{ marginTop: 56, display: 'flex', gap: 8, justifyContent: 'center' }}>
          {ticks.map((filled, i) => (
            <span key={i} style={{ width: 44, height: 2, background: filled ? 'rgba(237,237,232,.7)' : 'var(--border-18)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
