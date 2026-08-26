import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { SkeletonGlyph } from '../components/ui/SkeletonGlyph';
import { useExercises, useSessions } from '../hooks/queries';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: exercises, isLoading } = useExercises();
  const { data: lastSessionPage } = useSessions({ limit: 1 });
  const lastSession = lastSessionPage?.items[0];

  return (
    <div style={{ padding: '56px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 44 }}>
        <div>
          <div style={{ font: '500 28px/1.2 var(--font-display)', color: 'var(--text)' }}>Exercises</div>
          <div style={{ marginTop: 10, font: '400 14px var(--font-body)', color: 'var(--text-50)' }}>
            Pick a movement to calibrate and track.
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--text-45)' }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
          {exercises?.map((exercise) => (
            <Card key={exercise.id} style={{ padding: 28 }}>
              <SkeletonGlyph size={56} />
              <div style={{ marginTop: 26, font: '500 20px/1.2 var(--font-display)', color: 'var(--text)' }}>
                {exercise.name}
              </div>
              <div style={{ marginTop: 8, font: '400 13px var(--font-body)', color: 'var(--text-45)' }}>
                {exercise.description}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 32,
                  marginTop: 26,
                  paddingTop: 20,
                  borderTop: '1px solid var(--border-08)',
                }}
              >
                <div>
                  <div style={{ font: '500 10px var(--font-mono)', letterSpacing: '.1em', color: 'var(--text-40)' }}>
                    LAST SCORE
                  </div>
                  <div
                    className="tabular-nums"
                    style={{
                      marginTop: 6,
                      font: '500 24px var(--font-display)',
                      color: exercise.last_score == null ? 'var(--text-35)' : 'var(--text)',
                    }}
                  >
                    {exercise.last_score ?? '—'}
                  </div>
                </div>
                <div>
                  <div style={{ font: '500 10px var(--font-mono)', letterSpacing: '.1em', color: 'var(--text-40)' }}>
                    BEST STREAK
                  </div>
                  <div
                    className="tabular-nums"
                    style={{
                      marginTop: 6,
                      font: '500 24px var(--font-display)',
                      color: exercise.best_streak == null ? 'var(--text-35)' : 'var(--text)',
                    }}
                  >
                    {exercise.best_streak ?? '—'}
                  </div>
                </div>
              </div>
              <Button
                fullWidth
                variant={exercise.last_score == null ? 'primary' : 'secondary'}
                style={{ marginTop: 24, height: 42 }}
                onClick={() => navigate(`/exercises/${exercise.slug}/calibrate`)}
              >
                Start set
              </Button>
            </Card>
          ))}
        </div>
      )}

      {lastSession && (
        <div
          style={{
            marginTop: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 24,
            borderTop: '1px solid var(--border-08)',
          }}
        >
          <div style={{ font: '500 11px var(--font-mono)', letterSpacing: '.1em', color: 'var(--text-40)' }}>
            LAST SESSION
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 40, font: '400 13px var(--font-body)', color: 'var(--text-60)' }}>
            <span className="tabular-nums">{formatDate(lastSession.started_at)}</span>
            <span>{lastSession.exercise.name}</span>
            <span className="tabular-nums">
              {lastSession.reps_completed} / {lastSession.target_reps} reps
            </span>
            <span className="tabular-nums" style={{ color: 'var(--text)' }}>
              Score {lastSession.score}
            </span>
            <button
              onClick={() => navigate(`/sessions/${lastSession.id}?from=history`)}
              style={{ background: 'none', border: 'none', color: 'var(--text-45)' }}
            >
              View →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
