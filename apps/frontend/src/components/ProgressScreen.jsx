import { useEffect, useState } from 'react';
import './ProgressScreen.css';
import * as sessionStore from '../storage/sessionStore';
import { SQUAT_CONFIG } from '../core/exercises/squatConfig';

const CHART_WIDTH = 600;
const CHART_HEIGHT = 180;
const PAD = { top: 10, right: 12, bottom: 22, left: 30 };
const INNER_WIDTH = CHART_WIDTH - PAD.left - PAD.right;
const INNER_HEIGHT = CHART_HEIGHT - PAD.top - PAD.bottom;

const MISTAKE_COLORS = { insufficient_depth: '#f59e0b', knee_valgus: '#ef4444', excessive_lean: '#3b82f6' };
const FALLBACK_COLORS = ['#a855f7', '#14b8a6', '#eab308'];
const mistakeColor = (id, i) => MISTAKE_COLORS[id] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];

function scale(value, domainMin, domainMax, rangeMin, rangeMax) {
  if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
  return rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}

function formatDateShort(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Every chart below is small and shaped differently enough (a plain line,
// a line + variance band, grouped bars, single bars) that one "generic
// chart" abstraction would just hide each one's actual logic — so they
// each own their scaling, but all share the same x() helper for spacing
// points evenly across the width.
function xAt(index, count) {
  return PAD.left + (count <= 1 ? INNER_WIDTH / 2 : scale(index, 0, count - 1, 0, INNER_WIDTH));
}

function ChartFrame({ children, xLabelLeft, xLabelRight }) {
  return (
    <svg className="progress-chart" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
      {children}
      {xLabelLeft && (
        <text x={PAD.left} y={CHART_HEIGHT - 4} className="progress-chart-label">
          {xLabelLeft}
        </text>
      )}
      {xLabelRight && (
        <text x={CHART_WIDTH - PAD.right} y={CHART_HEIGHT - 4} textAnchor="end" className="progress-chart-label">
          {xLabelRight}
        </text>
      )}
    </svg>
  );
}

function FormScoreChart({ trend }) {
  if (trend.length === 0) return null;
  const y = (score) => PAD.top + scale(score, 0, 100, INNER_HEIGHT, 0);
  const linePath = trend.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i, trend.length)} ${y(p.score)}`).join(' ');
  const avgPath = trend.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i, trend.length)} ${y(p.movingAverage)}`).join(' ');

  return (
    <ChartFrame xLabelLeft={formatDateShort(trend[0].date)} xLabelRight={formatDateShort(trend[trend.length - 1].date)}>
      {[0, 25, 50, 75, 100].map((gridScore) => (
        <line key={gridScore} x1={PAD.left} x2={CHART_WIDTH - PAD.right} y1={y(gridScore)} y2={y(gridScore)} className="progress-chart-gridline" />
      ))}
      <path d={avgPath} className="progress-chart-line-avg" fill="none" />
      <path d={linePath} className="progress-chart-line-main" fill="none" />
      {trend.map((p, i) => (
        <circle key={p.sessionId} cx={xAt(i, trend.length)} cy={y(p.score)} r={3} className="progress-chart-dot" />
      ))}
    </ChartFrame>
  );
}

function DepthConsistencyChart({ trend }) {
  if (trend.length === 0) return null;

  const highs = trend.map((p) => p.avgDepth + p.stdDev);
  const lows = trend.map((p) => p.avgDepth - p.stdDev);
  const domainMax = Math.max(...highs) + 2;
  const domainMin = Math.min(...lows) - 2;
  const y = (angle) => PAD.top + scale(angle, domainMin, domainMax, INNER_HEIGHT, 0);

  const upper = trend.map((p, i) => [xAt(i, trend.length), y(p.avgDepth + p.stdDev)]);
  const lower = trend.map((p, i) => [xAt(i, trend.length), y(p.avgDepth - p.stdDev)]).reverse();
  const bandPoints = [...upper, ...lower].map(([px, py]) => `${px},${py}`).join(' ');
  const linePath = trend.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i, trend.length)} ${y(p.avgDepth)}`).join(' ');

  return (
    <ChartFrame xLabelLeft={formatDateShort(trend[0].date)} xLabelRight={formatDateShort(trend[trend.length - 1].date)}>
      <polygon points={bandPoints} className="progress-chart-band" />
      <path d={linePath} className="progress-chart-line-main" fill="none" />
    </ChartFrame>
  );
}

function MistakeFrequencyChart({ trend }) {
  const { errorIds, points } = trend;
  if (points.length === 0 || errorIds.length === 0) return null;

  const groupWidth = INNER_WIDTH / points.length;
  const barWidth = Math.min(14, (groupWidth - 4) / errorIds.length);
  const y = (pct) => PAD.top + scale(pct, 0, 100, INNER_HEIGHT, 0);
  const baseline = y(0);

  return (
    <>
      <ChartFrame xLabelLeft={formatDateShort(points[0].date)} xLabelRight={formatDateShort(points[points.length - 1].date)}>
        <line x1={PAD.left} x2={CHART_WIDTH - PAD.right} y1={baseline} y2={baseline} className="progress-chart-axis" />
        {points.map((point, gi) => {
          const groupX = PAD.left + gi * groupWidth + (groupWidth - barWidth * errorIds.length) / 2;
          return (
            <g key={point.sessionId}>
              {errorIds.map((id, ei) => {
                const rate = point.rates[id];
                const barHeight = Math.max(baseline - y(rate), 0);
                return (
                  <rect
                    key={id}
                    x={groupX + ei * barWidth}
                    y={y(rate)}
                    width={Math.max(barWidth - 1, 1)}
                    height={barHeight}
                    fill={mistakeColor(id, ei)}
                  />
                );
              })}
            </g>
          );
        })}
      </ChartFrame>
      <div className="progress-chart-legend">
        {errorIds.map((id, i) => {
          const check = SQUAT_CONFIG.checks.find((c) => c.id === id);
          return (
            <span key={id} className="progress-chart-legend-item">
              <span className="progress-chart-legend-swatch" style={{ background: mistakeColor(id, i) }} />
              {check?.message ?? id}
            </span>
          );
        })}
      </div>
    </>
  );
}

function WeeklyVolumeChart({ weeks }) {
  if (weeks.length === 0) return null;
  const maxReps = Math.max(...weeks.map((w) => w.validReps), 1);
  const y = (reps) => PAD.top + scale(reps, 0, maxReps, INNER_HEIGHT, 0);
  const baseline = y(0);
  const barSlot = INNER_WIDTH / weeks.length;
  const barWidth = Math.min(28, barSlot - 6);

  return (
    <ChartFrame xLabelLeft={formatDateShort(weeks[0].weekStart)} xLabelRight={formatDateShort(weeks[weeks.length - 1].weekStart)}>
      <line x1={PAD.left} x2={CHART_WIDTH - PAD.right} y1={baseline} y2={baseline} className="progress-chart-axis" />
      {weeks.map((week, i) => {
        const x = PAD.left + i * barSlot + (barSlot - barWidth) / 2;
        return (
          <rect
            key={week.weekStart}
            x={x}
            y={y(week.validReps)}
            width={barWidth}
            height={Math.max(baseline - y(week.validReps), 0)}
            className="progress-chart-bar"
          />
        );
      })}
    </ChartFrame>
  );
}

function PersonalBests({ bests }) {
  return (
    <div className="progress-bests-row">
      <div className="progress-best-card">
        <div className="progress-best-label">Best form score</div>
        <div className="progress-best-value">{bests.bestFormScore ?? '—'}</div>
      </div>
      <div className="progress-best-card">
        <div className="progress-best-label">Deepest average squat</div>
        <div className="progress-best-value">{bests.deepestAverageSquat != null ? `${Math.round(bests.deepestAverageSquat)}°` : '—'}</div>
      </div>
      <div className="progress-best-card">
        <div className="progress-best-label">Longest clean streak</div>
        <div className="progress-best-value">{bests.longestCleanStreak > 0 ? `${bests.longestCleanStreak} reps` : '—'}</div>
      </div>
    </div>
  );
}

// The payoff screen: every chart is plain SVG (no libraries), reading
// entirely from sessionStore.getAggregateStats() — see
// core/progressAnalytics.js for how each series is derived. Trend charts
// need at least a few sessions to mean anything, so they're gated behind
// hasEnoughForCharts; personal bests show as soon as there's one.
function ProgressScreen() {
  const [stats, setStats] = useState(null); // null = loading

  useEffect(() => {
    let cancelled = false;
    sessionStore.getAggregateStats().then((result) => {
      if (!cancelled) setStats(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (stats === null) {
    return <div className="progress-screen progress-empty">Loading progress…</div>;
  }

  if (stats.totalSessions === 0) {
    return (
      <div className="progress-screen progress-empty">
        <p>No workouts yet — your progress charts will show up here once you've completed a few sessions.</p>
      </div>
    );
  }

  return (
    <div className="progress-screen">
      <div className="progress-totals-row">
        <div className="progress-total">
          <span className="progress-total-value">{stats.totalSessions}</span>
          <span className="progress-total-label">sessions</span>
        </div>
        <div className="progress-total">
          <span className="progress-total-value">{stats.totalValidReps}</span>
          <span className="progress-total-label">valid reps</span>
        </div>
        <div className="progress-total">
          <span className="progress-total-value">{stats.overallAvgScore != null ? Math.round(stats.overallAvgScore) : '—'}</span>
          <span className="progress-total-label">avg score</span>
        </div>
      </div>

      <section className="progress-section">
        <h3>Personal bests</h3>
        <PersonalBests bests={stats.personalBests} />
      </section>

      {!stats.hasEnoughForCharts ? (
        <div className="progress-chart-empty">
          Complete a few more sessions to unlock your progress charts — {stats.totalSessions} of 3 so far.
        </div>
      ) : (
        <>
          <section className="progress-section">
            <h3>Form score over time</h3>
            <FormScoreChart trend={stats.formScoreTrend} />
          </section>

          <section className="progress-section">
            <h3>Depth consistency over time</h3>
            <p className="progress-section-note">Narrower shaded band = more repeatable depth from rep to rep.</p>
            <DepthConsistencyChart trend={stats.depthConsistencyTrend} />
          </section>

          <section className="progress-section">
            <h3>Mistake frequency over time</h3>
            <MistakeFrequencyChart trend={stats.mistakeFrequencyTrend} />
          </section>

          <section className="progress-section">
            <h3>Volume (valid reps per week)</h3>
            <WeeklyVolumeChart weeks={stats.weeklyVolume} />
          </section>
        </>
      )}
    </div>
  );
}

export default ProgressScreen;
