import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TabPill } from '../components/ui/TabPill';
import { useExercises, useSessions } from '../hooks/queries';

const PAGE_SIZE = 8;

function formatDate(iso: string) {
  return new Date(iso)
    .toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    .replace(',', ' ·');
}

export function HistoryPage() {
  const navigate = useNavigate();
  const { data: exercises } = useExercises();
  const [exerciseSlug, setExerciseSlug] = useState<string | undefined>(undefined);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { data: page, isLoading } = useSessions({ exercise_slug: exerciseSlug, limit: visibleCount });

  const columns = '150px 1fr 130px 150px 90px 40px';

  return (
    <div style={{ padding: '56px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ font: '500 28px/1.2 var(--font-display)', color: 'var(--text)' }}>History</div>
          <div style={{ marginTop: 10, font: '400 14px var(--font-body)', color: 'var(--text-50)' }}>
            {page?.total ?? 0} sessions · newest first
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <TabPill label="All" active={exerciseSlug === undefined} onClick={() => setExerciseSlug(undefined)} />
          {exercises?.map((e) => (
            <TabPill key={e.slug} label={e.name} active={exerciseSlug === e.slug} onClick={() => setExerciseSlug(e.slug)} />
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: 44,
          display: 'grid',
          gridTemplateColumns: columns,
          padding: '0 4px 14px',
          font: '500 10.5px var(--font-mono)',
          letterSpacing: '.12em',
          color: 'var(--text-40)',
          borderBottom: '1px solid var(--border-12)',
        }}
      >
        <div>DATE</div>
        <div>EXERCISE</div>
        <div style={{ textAlign: 'right' }}>REPS</div>
        <div style={{ textAlign: 'right' }}>CORRECT / FLAGGED</div>
        <div style={{ textAlign: 'right' }}>SCORE</div>
        <div />
      </div>

      {isLoading ? (
        <div style={{ padding: 24, color: 'var(--text-45)' }}>Loading…</div>
      ) : (
        <div>
          {page?.items.map((session) => (
            <div
              key={session.id}
              onClick={() => navigate(`/sessions/${session.id}?from=history`)}
              style={{
                display: 'grid',
                gridTemplateColumns: columns,
                alignItems: 'center',
                padding: '20px 4px',
                borderBottom: '1px solid var(--border-08)',
                cursor: 'pointer',
              }}
            >
              <div className="tabular-nums" style={{ font: '400 13px var(--font-mono)', color: 'var(--text-60)' }}>
                {formatDate(session.started_at)}
              </div>
              <div style={{ font: '500 15px var(--font-body)', color: 'var(--text)' }}>{session.exercise.name}</div>
              <div className="tabular-nums" style={{ textAlign: 'right', font: '400 14px var(--font-display)', color: 'var(--text-70)' }}>
                {session.reps_completed} / {session.target_reps}
              </div>
              <div className="tabular-nums" style={{ textAlign: 'right', font: '400 14px var(--font-display)' }}>
                <span style={{ color: '#5FBF8B' }}>{session.reps_correct}</span>
                <span style={{ color: 'var(--text-30)' }}> / </span>
                <span style={{ color: '#E0A458' }}>{session.reps_flagged}</span>
              </div>
              <div className="tabular-nums" style={{ textAlign: 'right', font: '500 20px var(--font-display)', color: 'var(--text)' }}>
                {session.score}
              </div>
              <div style={{ textAlign: 'right', color: 'var(--text-35)', font: '400 14px var(--font-body)' }}>→</div>
            </div>
          ))}

          {page && page.items.length < page.total && (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              style={{
                marginTop: 36,
                width: '100%',
                textAlign: 'center',
                background: 'none',
                border: 'none',
                font: '400 13px var(--font-body)',
                color: 'var(--text-45)',
              }}
            >
              Load {Math.min(PAGE_SIZE, page.total - page.items.length)} older sessions
            </button>
          )}
        </div>
      )}
    </div>
  );
}
