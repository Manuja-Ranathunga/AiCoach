import { useState } from 'react';
import './SummaryScreen.css';
import { SQUAT_CONFIG } from '../core/exercises/squatConfig';
import { getMistakeBreakdown } from '../core/sessionAnalytics';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const { depthBarStandingAngle, depthBarDeepAngle, depthMaxKneeAngle } = SQUAT_CONFIG.thresholds;

// Same normalization DepthBar.jsx uses live during a set (0 = standing,
// 1 = as deep as the bar's scale goes) — reusing it here means the chart
// reads the same way the in-workout depth bar already trained the user
// to read it.
function depthPercent(angle) {
  return clamp((depthBarStandingAngle - angle) / (depthBarStandingAngle - depthBarDeepAngle), 0, 1);
}

const THRESHOLD_PERCENT = depthPercent(depthMaxKneeAngle);

function SessionStrip({ sets, currentSetNumber }) {
  if (sets.length === 0) return null;

  return (
    <div className="session-strip">
      {sets.map((set) => (
        <div
          key={set.setNumber}
          className={`session-strip-item${set.setNumber === currentSetNumber ? ' session-strip-current' : ''}`}
        >
          <span className="session-strip-set">Set {set.setNumber}</span>
          <span className="session-strip-score">{set.analytics.formScore.score ?? '—'}</span>
        </div>
      ))}
    </div>
  );
}

function RepStrip({ reps }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const active = activeIndex !== null ? reps[activeIndex] : null;

  return (
    <div className="rep-strip-wrap">
      <div className="rep-strip">
        {reps.map((rep, i) => (
          <button
            key={rep.repNumber}
            type="button"
            className={`rep-strip-block${rep.valid ? ' rep-strip-valid' : ' rep-strip-invalid'}${
              activeIndex === i ? ' rep-strip-active' : ''
            }`}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex((cur) => (cur === i ? null : cur))}
            onClick={() => setActiveIndex((cur) => (cur === i ? null : i))}
          >
            {rep.repNumber}
          </button>
        ))}
      </div>
      <div className="rep-strip-detail">
        {active ? (
          <>
            <span className="rep-strip-detail-item">Depth: {Math.round(active.minKneeAngle)}°</span>
            <span className="rep-strip-detail-item">Duration: {active.totalDuration?.toFixed(1)}s</span>
            <span className="rep-strip-detail-item">
              {active.errors.length > 0 ? active.errors.map((error) => error.message).join(', ') : 'No errors'}
            </span>
          </>
        ) : (
          <span className="rep-strip-detail-placeholder">Hover or tap a rep for details</span>
        )}
      </div>
    </div>
  );
}

function DepthChart({ reps }) {
  const chartHeight = 120;
  const axisHeight = 24;
  const barWidth = 28;
  const gap = 14;
  const width = reps.length * (barWidth + gap) + gap;
  const thresholdY = chartHeight * (1 - THRESHOLD_PERCENT);

  return (
    <div className="depth-chart-wrap">
      <svg
        className="depth-chart"
        viewBox={`0 0 ${width} ${chartHeight + axisHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <line x1={0} y1={thresholdY} x2={width} y2={thresholdY} className="depth-chart-threshold" />
        {reps.map((rep, i) => {
          const pct = depthPercent(rep.minKneeAngle);
          const barHeight = Math.max(pct * chartHeight, 2);
          const x = gap + i * (barWidth + gap);
          const y = chartHeight - barHeight;
          const met = pct >= THRESHOLD_PERCENT;

          return (
            <g key={rep.repNumber}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx={3} className={met ? 'depth-bar-good' : 'depth-bar-bad'} />
              <text x={x + barWidth / 2} y={chartHeight + 16} textAnchor="middle" className="depth-chart-label">
                {rep.repNumber}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="depth-chart-legend">Dashed line = depth target. Taller &amp; green = deep enough.</div>
    </div>
  );
}

function MistakeBreakdown({ mistakes, totalReps }) {
  if (mistakes.length === 0) {
    return <p className="summary-empty-note">No recurring form issues — clean set.</p>;
  }

  return (
    <ul className="mistake-list">
      {mistakes.map((mistake) => {
        const check = SQUAT_CONFIG.checks.find((c) => c.id === mistake.id);
        return (
          <li key={mistake.id} className={`mistake-item mistake-${mistake.severity}`}>
            <div className="mistake-header">
              <span className="mistake-message">{check?.message ?? mistake.message}</span>
              <span className="mistake-count">
                {mistake.count}/{totalReps} reps ({mistake.percentage}%)
              </span>
            </div>
            {check?.tip && <p className="mistake-tip">{check.tip}</p>}
          </li>
        );
      })}
    </ul>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}

function FatigueNote({ fatigue }) {
  if (!fatigue.detected) return null;

  return (
    <div className="fatigue-note">
      <div className="fatigue-note-title">Fatigue detected around rep {fatigue.fromRepNumber}</div>
      <ul>
        {fatigue.indicators.map((indicator) => (
          <li key={indicator.type}>{indicator.message}</li>
        ))}
      </ul>
    </div>
  );
}

// Post-set summary: leads with ONE headline takeaway (the top entry from
// generateInsights), then progressively more detail below for anyone who
// wants to dig. `currentSet` is a record built by CameraView's
// finalizeSet — { setNumber, reps, validReps, totalAttempts, analytics,
// completedAt } — where `analytics` is sessionAnalytics.js's analyzeSet()
// output, computed once at finalize time rather than on every render.
function SummaryScreen({ currentSet, sessionSets, onNewSet, onDone }) {
  const { reps, validReps, totalAttempts, analytics, setNumber } = currentSet;
  const { formScore, fatigue, consistency, tempo, insights } = analytics;
  const mistakes = getMistakeBreakdown(reps);
  const headline = insights[0] ?? 'Set complete.';

  return (
    <div className="summary-screen">
      <SessionStrip sets={sessionSets} currentSetNumber={setNumber} />

      <div className="summary-headline">{headline}</div>

      <div className="summary-score-row">
        <div className="summary-score">
          <span className="summary-score-value">{formScore.score ?? '—'}</span>
          <span className="summary-score-grade">{formScore.grade ?? ''}</span>
        </div>
        <div className="summary-reps">
          <span className="summary-reps-value">
            {validReps}/{totalAttempts}
          </span>
          <span className="summary-reps-label">valid reps</span>
        </div>
      </div>

      {insights.length > 1 && (
        <ul className="summary-insights-more">
          {insights.slice(1).map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      )}

      <section className="summary-section">
        <h3>Rep by rep</h3>
        <RepStrip reps={reps} />
      </section>

      <section className="summary-section">
        <h3>Depth</h3>
        <DepthChart reps={reps} />
      </section>

      <section className="summary-section">
        <h3>Mistakes</h3>
        <MistakeBreakdown mistakes={mistakes} totalReps={reps.length} />
      </section>

      <section className="summary-section">
        <h3>Tempo &amp; consistency</h3>
        <div className="stat-card-row">
          <StatCard
            label="Consistency"
            value={consistency.score != null ? `${consistency.score}/100` : '—'}
            sub={consistency.score == null ? 'Need 2+ valid reps' : null}
          />
          <StatCard
            label="Avg descent"
            value={tempo.avgDescent != null ? `${tempo.avgDescent.toFixed(1)}s` : '—'}
            sub={tempo.tooFast ? 'Too fast' : null}
          />
          <StatCard label="Avg ascent" value={tempo.avgAscent != null ? `${tempo.avgAscent.toFixed(1)}s` : '—'} />
          <StatCard label="Tempo ratio" value={tempo.ratio != null ? `${tempo.ratio.toFixed(2)}:1` : '—'} sub="descent : ascent" />
        </div>
      </section>

      <FatigueNote fatigue={fatigue} />

      <div className="summary-actions">
        <button className="summary-primary-button" onClick={onNewSet}>
          New Set
        </button>
        <button className="summary-secondary-button" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}

export default SummaryScreen;
