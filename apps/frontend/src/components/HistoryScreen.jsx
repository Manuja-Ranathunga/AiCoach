import { useEffect, useMemo, useState } from 'react';
import './HistoryScreen.css';
import * as sessionStore from '../storage/sessionStore';
import SummaryScreen from './SummaryScreen';

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function scoreColor(score) {
  if (score == null) return 'rgba(255, 255, 255, 0.25)';
  if (score >= 75) return 'var(--color-good, #22c55e)';
  if (score >= 60) return 'var(--color-warning, #f59e0b)';
  return 'var(--color-critical, #ef4444)';
}

function average(values) {
  const nums = values.filter((v) => v != null);
  return nums.length > 0 ? nums.reduce((sum, v) => sum + v, 0) / nums.length : null;
}

function SessionRow({ session, expanded, selectedSetNumber, onToggle, onSelectSet, onDelete }) {
  const validReps = session.sets.reduce((sum, set) => sum + set.analytics.validReps, 0);
  const avgScore = average(session.sets.map((set) => set.analytics.formScore.score));
  const currentSet =
    session.sets.find((set) => set.setNumber === selectedSetNumber) ?? session.sets[session.sets.length - 1];

  return (
    <div className="history-row">
      <button className="history-row-summary" onClick={onToggle}>
        <div className="history-row-main">
          <span className="history-row-date">{formatDate(session.startedAt)}</span>
          <span className="history-row-exercise">{session.exercise}</span>
        </div>
        <div className="history-row-bar">
          {session.sets.map((set) => (
            <span
              key={set.setNumber}
              className="history-row-bar-segment"
              style={{ background: scoreColor(set.analytics.formScore.score) }}
              title={`Set ${set.setNumber}: ${set.analytics.formScore.score ?? '—'}`}
            />
          ))}
        </div>
        <div className="history-row-stats">
          <span>{validReps} reps</span>
          <span>{avgScore != null ? Math.round(avgScore) : '—'} avg</span>
        </div>
      </button>

      {expanded && currentSet && (
        <div className="history-row-detail">
          <div className="history-row-detail-header">
            <button className="history-delete-button" onClick={() => onDelete(session.id)}>
              Delete this session
            </button>
          </div>
          <div className="history-row-detail-body">
            <SummaryScreen
              currentSet={currentSet}
              sessionSets={session.sets}
              onSelectSet={onSelectSet}
              onClose={onToggle}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Lists every saved session, newest first, with filters and an
// expand-to-full-detail view that reuses Phase 8's SummaryScreen — see
// its header comment for why stored sets are shaped exactly like the
// live in-workout ones, making that reuse a direct prop-pass with no
// adapter code.
function HistoryScreen() {
  const [sessions, setSessions] = useState(null); // null = loading
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [exerciseFilter, setExerciseFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedSetNumber, setSelectedSetNumber] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await sessionStore.getAllSessions();
      if (cancelled) return;
      setSessions(all);
      setStorageUnavailable(all.length === 0 && !sessionStore.getStorageStatus().available);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const exercises = useMemo(() => {
    if (!sessions) return [];
    return [...new Set(sessions.map((session) => session.exercise))];
  }, [sessions]);

  const filtered = useMemo(() => {
    if (!sessions) return [];
    const startMs = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
    const endMs = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

    return sessions.filter((session) => {
      if (exerciseFilter !== 'all' && session.exercise !== exerciseFilter) return false;
      if (startMs != null && session.startedAt < startMs) return false;
      if (endMs != null && session.startedAt > endMs) return false;
      return true;
    });
  }, [sessions, exerciseFilter, startDate, endDate]);

  const handleToggle = (id) => {
    setExpandedId((current) => (current === id ? null : id));
    setSelectedSetNumber(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this session? This cannot be undone.')) return;
    await sessionStore.deleteSession(id);
    setSessions((prev) => prev.filter((session) => session.id !== id));
    setExpandedId(null);
  };

  if (sessions === null) {
    return <div className="history-screen history-empty">Loading history…</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="history-screen history-empty">
        {storageUnavailable ? (
          <p>Storage isn't available in this browser (private browsing may block it) — history can't be saved here.</p>
        ) : (
          <p>No workouts yet. Finish a set and it'll show up here.</p>
        )}
      </div>
    );
  }

  return (
    <div className="history-screen">
      <div className="history-filters">
        <select value={exerciseFilter} onChange={(event) => setExerciseFilter(event.target.value)}>
          <option value="all">All exercises</option>
          {exercises.map((exercise) => (
            <option key={exercise} value={exercise}>
              {exercise}
            </option>
          ))}
        </select>
        <label>
          From
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="history-empty-note">No sessions match these filters.</p>
      ) : (
        <div className="history-list">
          {filtered.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              expanded={expandedId === session.id}
              selectedSetNumber={expandedId === session.id ? selectedSetNumber : null}
              onToggle={() => handleToggle(session.id)}
              onSelectSet={setSelectedSetNumber}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default HistoryScreen;
