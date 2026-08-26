import { useEffect, useState } from 'react';
import { TabPill } from '../components/ui/TabPill';
import { useExercises, useProgress } from '../hooks/queries';

const CHART_WIDTH = 1200;
const CHART_HEIGHT = 300;

export function ProgressPage() {
  const { data: exercises } = useExercises();
  const [exerciseSlug, setExerciseSlug] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!exerciseSlug && exercises && exercises.length > 0) {
      setExerciseSlug(exercises[0].slug);
    }
  }, [exercises, exerciseSlug]);

  const { data: progress } = useProgress(exerciseSlug);
  const exercise = exercises?.find((e) => e.slug === exerciseSlug);

  const points = progress?.points ?? [];
  const scores = points.map((p) => p.score);
  const min = Math.min(40, ...scores);
  const max = Math.max(100, ...scores);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = points.length > 1 ? (i / (points.length - 1)) * (CHART_WIDTH - 40) + 20 : CHART_WIDTH / 2;
    const y = CHART_HEIGHT - 2 - ((p.score - min) / range) * (CHART_HEIGHT - 20);
    return { x, y };
  });
  const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ');

  return (
    <div style={{ padding: '56px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ font: '500 28px/1.2 var(--font-display)', color: 'var(--text)' }}>Progress</div>
          <div style={{ marginTop: 10, font: '400 14px var(--font-body)', color: 'var(--text-50)' }}>
            {exercise?.name ?? ''} · last {progress?.sessions_counted ?? 0} sessions
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {exercises?.map((e) => (
            <TabPill key={e.slug} label={e.name} active={exerciseSlug === e.slug} onClick={() => setExerciseSlug(e.slug)} />
          ))}
        </div>
      </div>

      {!progress || progress.sessions_counted === 0 ? (
        <div style={{ marginTop: 48, color: 'var(--text-45)' }}>No sessions recorded for this exercise yet.</div>
      ) : (
        <>
          <div style={{ marginTop: 48, border: '1px solid var(--border-10)', background: 'var(--bg-card)', padding: '36px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ font: '500 11px var(--font-mono)', letterSpacing: '.12em', color: 'var(--text-45)' }}>
                FORM SCORE OVER TIME
              </div>
              <div style={{ display: 'flex', gap: 28, font: '400 11.5px var(--font-mono)', color: 'var(--text-45)' }}>
                <span>
                  AVG <span className="tabular-nums" style={{ color: 'var(--text)' }}>{progress.avg_score}</span>
                </span>
                <span>
                  BEST <span className="tabular-nums" style={{ color: 'var(--text)' }}>{progress.best_score}</span>
                </span>
                <span>
                  TREND{' '}
                  <span className="tabular-nums" style={{ color: (progress.trend ?? 0) >= 0 ? '#5FBF8B' : '#E0A458' }}>
                    {(progress.trend ?? 0) >= 0 ? '+' : ''}
                    {progress.trend}
                  </span>
                </span>
              </div>
            </div>
            <div style={{ marginTop: 28, position: 'relative', height: CHART_HEIGHT }}>
              <svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none">
                {[20, 90, 160, 230, 298].map((y) => (
                  <line key={y} x1={0} y1={y} x2={CHART_WIDTH} y2={y} stroke={y === 298 ? 'var(--border-14)' : 'var(--border-08)'} />
                ))}
                <polyline points={polyline} fill="none" stroke="var(--accent-blue)" strokeWidth="2" />
                {coords.slice(0, -1).map((c, i) => (
                  <circle key={i} cx={c.x} cy={c.y} r="4" fill="var(--bg-card)" stroke="var(--accent-blue)" strokeWidth="2" />
                ))}
                {coords.length > 0 && (
                  <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="5.5" fill="var(--accent-blue)" />
                )}
              </svg>
              <div style={{ position: 'absolute', left: -4, top: -8, font: '400 10.5px var(--font-mono)', color: 'var(--text-30)' }}>
                {max}
              </div>
              <div style={{ position: 'absolute', left: -4, bottom: 6, font: '400 10.5px var(--font-mono)', color: 'var(--text-30)' }}>
                {min}
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', font: '400 10.5px var(--font-mono)', color: 'var(--text-32)' }}>
              <span>{new Date(points[0]?.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}</span>
              <span>
                {new Date(points[points.length - 1]?.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {progress.most_common_mistake ? (
              <div
                style={{
                  border: '1px solid rgba(224,164,88,.32)',
                  background: 'rgba(224,164,88,.05)',
                  padding: '32px 36px',
                  display: 'flex',
                  gap: 28,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ font: '500 11px var(--font-mono)', letterSpacing: '.12em', color: 'var(--text-45)' }}>
                    MOST COMMON MISTAKE
                  </div>
                  <div style={{ marginTop: 14, font: '500 24px/1.25 var(--font-display)', color: 'var(--text)' }}>
                    {progress.most_common_mistake.label}
                  </div>
                  <div style={{ marginTop: 10, font: '400 13px/1.6 var(--font-body)', color: 'var(--text-55)' }}>
                    Present in {progress.most_common_mistake.percentage}% of flagged reps across the last{' '}
                    {progress.sessions_counted} sessions.
                    {progress.most_common_mistake.previous_percentage != null &&
                      ` Down from ${progress.most_common_mistake.previous_percentage}%.`}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border-10)', background: 'var(--bg-card)', padding: '32px 36px', color: 'var(--text-45)' }}>
                No form issues recorded — clean sessions so far.
              </div>
            )}

            <div style={{ border: '1px solid var(--border-10)', background: 'var(--bg-card)', padding: '32px 36px' }}>
              <div style={{ font: '500 11px var(--font-mono)', letterSpacing: '.12em', color: 'var(--text-45)' }}>ISSUE MIX</div>
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
                {progress.issue_mix.length === 0 && (
                  <div style={{ font: '400 12.5px var(--font-body)', color: 'var(--text-45)' }}>No flagged reps yet.</div>
                )}
                {progress.issue_mix.map((entry) => (
                  <div key={entry.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', font: '400 12.5px var(--font-body)', color: 'var(--text-70)' }}>
                      <span>{entry.label}</span>
                      <span className="tabular-nums">{entry.percentage}%</span>
                    </div>
                    <div style={{ marginTop: 8, height: 5, background: 'var(--border-10)' }}>
                      <div style={{ width: `${entry.percentage}%`, height: '100%', background: '#E0A458' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
