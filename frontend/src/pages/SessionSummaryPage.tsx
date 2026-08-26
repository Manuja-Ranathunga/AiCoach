import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useDiscardSession, useSession } from '../hooks/queries';

function formatDateTime(iso: string) {
  return new Date(iso)
    .toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    .toUpperCase();
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function SessionSummaryPage() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const fromHistory = searchParams.get('from') === 'history';
  const navigate = useNavigate();
  const { data: session, isLoading } = useSession(id);
  const discard = useDiscardSession();

  if (isLoading || !session) {
    return <div style={{ padding: 56, color: 'var(--text-45)' }}>Loading…</div>;
  }

  const total = session.reps_correct + session.reps_flagged;
  const correctPct = total ? (session.reps_correct / total) * 100 : 0;
  const maxBar = Math.max(1, ...session.rep_events.map((r) => (r.quality ?? 1) * 100));

  async function handleDiscard() {
    await discard.mutateAsync(id);
    navigate('/exercises');
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 64,
          flex: 'none',
          borderBottom: '1px solid var(--border-08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 48px',
        }}
      >
        {fromHistory ? (
          <button
            onClick={() => navigate('/history')}
            style={{ background: 'none', border: 'none', font: '500 12px var(--font-mono)', letterSpacing: '.12em', color: 'var(--text)' }}
          >
            ← BACK TO HISTORY
          </button>
        ) : (
          <div style={{ font: '500 12px var(--font-mono)', letterSpacing: '.12em', color: 'var(--text)' }}>SESSION SUMMARY</div>
        )}
        <div className="tabular-nums" style={{ font: '400 12px var(--font-mono)', color: 'var(--text-45)' }}>
          {session.exercise.name.toUpperCase()} · {formatDateTime(session.started_at)}
        </div>
      </div>

      <div style={{ flex: 1, padding: '56px 48px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div style={{ font: '500 11px var(--font-mono)', letterSpacing: '.14em', color: 'var(--text-45)' }}>SET SCORE</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 10 }}>
              <div className="tabular-nums" style={{ font: '500 96px/.9 var(--font-display)', color: 'var(--text)' }}>
                {session.score}
              </div>
              {session.score_delta != null && (
                <div style={{ font: '400 14px var(--font-body)', color: 'var(--text-50)' }}>
                  {session.score_delta >= 0 ? '+' : ''}
                  {session.score_delta} vs last {session.exercise.name.toLowerCase()} set
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 56, paddingTop: 14, flexWrap: 'wrap' }}>
            <Stat label="REPS / TARGET" value={`${session.reps_completed} / ${session.target_reps}`} />
            <Stat label="CORRECT" value={session.reps_correct} color="#5FBF8B" />
            <Stat label="FLAGGED" value={session.reps_flagged} color="#E0A458" />
            <Stat label="DURATION" value={formatDuration(session.duration_seconds)} />
          </div>
        </div>

        <div style={{ marginTop: 44 }}>
          <div style={{ display: 'flex', height: 8, gap: 2 }}>
            <div style={{ flex: session.reps_correct || 0.001, background: '#5FBF8B' }} />
            <div style={{ flex: session.reps_flagged || 0.001, background: '#E0A458' }} />
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 24, font: '400 11.5px var(--font-mono)', color: 'var(--text-45)' }}>
            <span>{session.reps_correct} CORRECT</span>
            <span>{session.reps_flagged} FLAGGED</span>
          </div>
        </div>

        <div style={{ marginTop: 52, display: 'grid', gridTemplateColumns: '1fr 400px', gap: 48, flex: 1 }}>
          <div>
            <div style={{ font: '500 11px var(--font-mono)', letterSpacing: '.12em', color: 'var(--text-45)' }}>FORM ISSUES DETECTED</div>
            <div style={{ marginTop: 22 }}>
              {session.form_issues.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '18px 0', borderTop: '1px solid var(--border-10)', borderBottom: '1px solid var(--border-10)' }}>
                  <div className="tabular-nums" style={{ font: '500 20px var(--font-display)', color: 'var(--text-35)', width: 36 }}>
                    0
                  </div>
                  <div style={{ font: '500 14.5px var(--font-body)', color: 'var(--text-60)' }}>No form issues this set</div>
                </div>
              ) : (
                session.form_issues.map((issue, i) => (
                  <div
                    key={issue.issue_type}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 20,
                      padding: '18px 0',
                      borderTop: '1px solid var(--border-10)',
                      borderBottom: i === session.form_issues.length - 1 ? '1px solid var(--border-10)' : undefined,
                    }}
                  >
                    <div className="tabular-nums" style={{ font: '500 20px var(--font-display)', color: '#E0A458', width: 36 }}>
                      {issue.occurrences}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ font: '500 14.5px var(--font-body)', color: 'var(--text)' }}>{issue.label}</div>
                      <div style={{ marginTop: 4, font: '400 12.5px var(--font-body)', color: 'var(--text-45)' }}>{issue.detail}</div>
                    </div>
                    <div style={{ font: '400 11px var(--font-mono)', color: 'var(--text-35)' }}>
                      {issue.rep_numbers.length > 1 ? 'REPS' : 'REP'} {issue.rep_numbers.join(', ')}
                    </div>
                  </div>
                ))
              )}
            </div>

            {!fromHistory && (
              <div style={{ marginTop: 36, display: 'flex', gap: 14 }}>
                <Button onClick={() => navigate('/exercises')}>Save session</Button>
                <Button variant="secondary" onClick={() => navigate(`/exercises/${session.exercise.slug}/calibrate`)}>
                  New set
                </Button>
                <Button variant="ghost" onClick={handleDiscard} disabled={discard.isPending}>
                  Discard
                </Button>
              </div>
            )}
          </div>

          <div style={{ border: '1px solid var(--border-10)', background: 'var(--bg-card)', padding: 28 }}>
            <div style={{ font: '500 11px var(--font-mono)', letterSpacing: '.12em', color: 'var(--text-45)' }}>REP TIMELINE</div>
            <div style={{ marginTop: 24, display: 'flex', gap: 4, alignItems: 'flex-end', height: 120 }}>
              {session.rep_events.map((rep) => (
                <div
                  key={rep.rep_index}
                  style={{
                    flex: 1,
                    height: `${Math.max(8, (rep.quality * 100 * 100) / maxBar)}%`,
                    background: rep.correct ? '#5FBF8B' : '#E0A458',
                  }}
                />
              ))}
            </div>
            {session.rep_events.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', font: '400 10.5px var(--font-mono)', color: 'var(--text-35)' }}>
                <span>REP 1</span>
                <span>REP {session.rep_events[session.rep_events.length - 1].rep_index}</span>
              </div>
            )}
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-09)', display: 'flex', flexDirection: 'column', gap: 12, font: '400 12px var(--font-mono)', color: 'var(--text-45)' }}>
              <KeyValue label="AVG TEMPO" value={`${session.avg_tempo_seconds.toFixed(1)} s / rep`} />
              <KeyValue label="DEEPEST ANGLE" value={session.deepest_angle_degrees != null ? `${Math.round(session.deepest_angle_degrees)}°` : '—'} />
              <KeyValue label="CUES SPOKEN" value={session.cues_spoken_count} />
              <KeyValue label="CORRECT" value={`${Math.round(correctPct)}%`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color = 'var(--text)' }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <div style={{ font: '500 10.5px var(--font-mono)', letterSpacing: '.12em', color: 'var(--text-45)' }}>{label}</div>
      <div className="tabular-nums" style={{ marginTop: 10, font: '500 34px var(--font-display)', color }}>
        {value}
      </div>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span>{label}</span>
      <span className="tabular-nums" style={{ color: 'var(--text)' }}>
        {value}
      </span>
    </div>
  );
}
