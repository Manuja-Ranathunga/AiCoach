// Pure functions turning stored session history into chart-ready series
// for ProgressScreen. No React, no DOM, no IndexedDB — a plain array of
// session records in (see storage/sessionStore.js for the shape: each
// session has { id, startedAt, endedAt, exercise, sets: [...] }, and each
// set has { setNumber, reps, analytics } where analytics is exactly
// sessionAnalytics.js's analyzeSet() output), plain chart data out.

export const PROGRESS_CONFIG = {
  movingAverageWindow: 3, // sessions averaged for the form-score trend line
  minSessionsForCharts: 3, // fewer than this and charts show an empty state instead
};

function averageOf(values) {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function standardDeviation(values) {
  if (values.length === 0) return 0;
  const mean = averageOf(values);
  return Math.sqrt(averageOf(values.map((v) => (v - mean) ** 2)));
}

function allReps(session) {
  return session.sets.flatMap((set) => set.reps);
}

function setScores(session) {
  return session.sets.map((set) => set.analytics.formScore.score).filter((score) => score != null);
}

function sortedByDate(sessions) {
  return [...sessions].sort((a, b) => a.startedAt - b.startedAt);
}

// FORM SCORE OVER TIME + a trailing moving-average trend line.
export function getFormScoreTrend(sessions, config = PROGRESS_CONFIG) {
  const points = sortedByDate(sessions)
    .map((session) => ({ sessionId: session.id, date: session.startedAt, score: averageOf(setScores(session)) }))
    .filter((point) => point.score != null);

  return points.map((point, i) => {
    const windowStart = Math.max(0, i - config.movingAverageWindow + 1);
    const windowSlice = points.slice(windowStart, i + 1);
    return { ...point, movingAverage: averageOf(windowSlice.map((p) => p.score)) };
  });
}

// DEPTH CONSISTENCY OVER TIME: average minKneeAngle per session, plus a
// +/- one std-dev band. A band narrowing over time means more repeatable
// depth — independent of whether depth itself is getting deeper.
export function getDepthConsistencyTrend(sessions) {
  return sortedByDate(sessions)
    .map((session) => {
      const angles = allReps(session).map((rep) => rep.minKneeAngle);
      if (angles.length === 0) return null;
      return { sessionId: session.id, date: session.startedAt, avgDepth: averageOf(angles), stdDev: standardDeviation(angles) };
    })
    .filter(Boolean);
}

// MISTAKE FREQUENCY OVER TIME: for every error id that has EVER appeared
// in the history, what % of reps it affected in each session — so a
// mistake that's since been fixed still shows its series dropping to
// zero instead of vanishing from the chart, which is the whole point of
// this being "the most motivating chart" (a fault visibly going away).
export function getMistakeFrequencyTrend(sessions) {
  const errorIds = new Set();
  for (const session of sessions) {
    for (const rep of allReps(session)) {
      for (const error of rep.errors) errorIds.add(error.id);
    }
  }

  const points = sortedByDate(sessions).map((session) => {
    const reps = allReps(session);
    const rates = {};
    for (const id of errorIds) {
      const affected = reps.filter((rep) => rep.errors.some((error) => error.id === id)).length;
      rates[id] = reps.length > 0 ? Math.round((affected / reps.length) * 100) : 0;
    }
    return { sessionId: session.id, date: session.startedAt, rates };
  });

  return { errorIds: [...errorIds], points };
}

// VOLUME: total valid reps grouped by Monday-start week.
function startOfWeek(timestamp) {
  const d = new Date(timestamp);
  const mondayIndex = (d.getDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - mondayIndex);
  return d.getTime();
}

export function getWeeklyVolume(sessions) {
  const byWeek = new Map();
  for (const session of sessions) {
    const weekStart = startOfWeek(session.startedAt);
    const validReps = session.sets.reduce((sum, set) => sum + set.analytics.validReps, 0);
    byWeek.set(weekStart, (byWeek.get(weekStart) ?? 0) + validReps);
  }
  return [...byWeek.entries()].sort((a, b) => a[0] - b[0]).map(([weekStart, validReps]) => ({ weekStart, validReps }));
}

// PERSONAL BESTS: best form score, deepest average squat (lowest average
// minKneeAngle across a set's valid reps), and the longest run of
// consecutive valid reps within any single set.
export function getPersonalBests(sessions) {
  let bestFormScore = null;
  let deepestAverageSquat = null;
  let longestCleanStreak = 0;

  for (const session of sessions) {
    for (const set of session.sets) {
      const score = set.analytics.formScore.score;
      if (score != null && (bestFormScore == null || score > bestFormScore)) bestFormScore = score;

      const validAngles = set.reps.filter((rep) => rep.valid).map((rep) => rep.minKneeAngle);
      if (validAngles.length > 0) {
        const avgAngle = averageOf(validAngles);
        if (deepestAverageSquat == null || avgAngle < deepestAverageSquat) deepestAverageSquat = avgAngle;
      }

      let streak = 0;
      for (const rep of set.reps) {
        streak = rep.valid ? streak + 1 : 0;
        if (streak > longestCleanStreak) longestCleanStreak = streak;
      }
    }
  }

  return { bestFormScore, deepestAverageSquat, longestCleanStreak };
}

// One-stop bundle for ProgressScreen / sessionStore.getAggregateStats() —
// computed once per load rather than each chart re-deriving it.
export function computeAggregateStats(sessions, config = PROGRESS_CONFIG) {
  const totalValidReps = sessions.reduce(
    (sum, session) => sum + session.sets.reduce((setSum, set) => setSum + set.analytics.validReps, 0),
    0
  );

  return {
    totalSessions: sessions.length,
    totalSets: sessions.reduce((sum, session) => sum + session.sets.length, 0),
    totalValidReps,
    overallAvgScore: averageOf(sessions.flatMap((session) => setScores(session))),
    hasEnoughForCharts: sessions.length >= config.minSessionsForCharts,
    formScoreTrend: getFormScoreTrend(sessions, config),
    depthConsistencyTrend: getDepthConsistencyTrend(sessions),
    mistakeFrequencyTrend: getMistakeFrequencyTrend(sessions),
    weeklyVolume: getWeeklyVolume(sessions),
    personalBests: getPersonalBests(sessions),
  };
}
