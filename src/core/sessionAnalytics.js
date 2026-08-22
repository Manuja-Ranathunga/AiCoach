// Pure functions over a completed set's rep array (see repStateMachine.js
// for the rep record shape: minKneeAngle, maxTorsoAngle, durations,
// errors[], valid). No React, no DOM — takes plain data in, returns plain
// data out, so every function here is unit-testable with a hand-built
// array of rep objects.
//
// Only squat-specific error messages/tips come from SQUAT_CONFIG (the
// same config repStateMachine.js already treats as squat's exercise
// config) — everything else here is generic over "reps".

import { SQUAT_CONFIG } from './exercises/squatConfig';

// Every tunable number for scoring/insights lives here so the numbers can
// be adjusted without touching the logic that uses them.
export const ANALYTICS_CONFIG = {
  scoring: {
    startScore: 100,
    // Subtracted once per rep an error appears in — not per frame the
    // error was active — so one long bad rep can't dominate the score
    // the way raw frame-count weighting would let it.
    criticalPenalty: 12,
    warningPenalty: 5,
    // Checked top-down; the first band whose min the score clears wins.
    grades: [
      { min: 90, label: 'Excellent' },
      { min: 75, label: 'Good' },
      { min: 60, label: 'Needs Work' },
      { min: 0, label: 'Poor' },
    ],
  },
  fatigue: {
    minReps: 6, // below this, comparing "thirds" of the set is too noisy to trust
    depthIncreaseThresholdDeg: 8, // minKneeAngle rising this much = meaningfully shallower
    durationIncreaseRatio: 1.15, // reps taking 15%+ longer on average
    errorRateIncreaseThreshold: 0.25, // error-affected-rep rate rising 25+ percentage points
  },
  tempo: {
    fastDescentThresholdSec: 0.8, // faster than this reads as dropping, not lowering
  },
  consistency: {
    // Points lost per unit of standard deviation — tune these down if
    // "consistent" sets are scoring lower than they feel.
    kneeAngleStdDevScale: 4, // points per degree of minKneeAngle stddev
    durationStdDevScale: 40, // points per second of totalDuration stddev
  },
  insights: {
    maxInsights: 3,
    mistakeThresholdPercent: 30, // a mistake needs to affect at least this % of reps to earn an insight slot
  },
};

function average(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function standardDeviation(values) {
  if (values.length === 0) return 0;
  const mean = average(values);
  const variance = average(values.map((v) => (v - mean) ** 2));
  return Math.sqrt(variance);
}

// (a) Start at 100, subtract per critical/warning error — once per rep it
// appears in, not per frame — then band the result into a letter grade.
export function computeFormScore(reps, config = ANALYTICS_CONFIG) {
  const { startScore, criticalPenalty, warningPenalty, grades } = config.scoring;

  if (reps.length === 0) {
    return { score: null, grade: null, reason: 'No completed reps' };
  }

  let penalty = 0;
  for (const rep of reps) {
    for (const error of rep.errors) {
      penalty += error.severity === 'critical' ? criticalPenalty : warningPenalty;
    }
  }

  const score = Math.round(Math.max(0, Math.min(startScore, startScore - penalty)));
  const grade = grades.find((band) => score >= band.min)?.label ?? grades[grades.length - 1].label;

  return { score, grade };
}

// Shared by getMostCommonMistake and getMistakeBreakdown: counts each
// error id at most once per rep (matching how form score weights
// mistakes), sorted worst-first.
function countMistakesByRep(reps) {
  const counts = new Map(); // id -> { id, count, severity, message }

  for (const rep of reps) {
    const seenIds = new Set();
    for (const error of rep.errors) {
      if (seenIds.has(error.id)) continue;
      seenIds.add(error.id);

      const entry = counts.get(error.id) ?? { id: error.id, count: 0, severity: error.severity, message: error.message };
      entry.count += 1;
      counts.set(error.id, entry);
    }
  }

  return [...counts.values()].sort((a, b) => b.count - a.count);
}

// (b) The single most frequent error id, with how many reps it affected.
export function getMostCommonMistake(reps) {
  if (reps.length === 0) return null;
  const [worst] = countMistakesByRep(reps);
  if (!worst) return null;
  return { ...worst, percentage: Math.round((worst.count / reps.length) * 100) };
}

// Same idea as getMostCommonMistake but every error type, not just the
// worst one — feeds the summary screen's mistake breakdown list.
export function getMistakeBreakdown(reps) {
  if (reps.length === 0) return [];
  return countMistakesByRep(reps).map((mistake) => ({
    ...mistake,
    percentage: Math.round((mistake.count / reps.length) * 100),
  }));
}

// (c) First-third vs. last-third comparison across depth, tempo, and
// error rate. Needs at least minReps or the "thirds" are too small to
// mean anything.
export function detectFatigue(reps, config = ANALYTICS_CONFIG) {
  const { minReps, depthIncreaseThresholdDeg, durationIncreaseRatio, errorRateIncreaseThreshold } = config.fatigue;

  if (reps.length < minReps) {
    return { detected: false, indicators: [], fromRepNumber: null, reason: `Need at least ${minReps} reps to check for fatigue` };
  }

  const thirdSize = Math.floor(reps.length / 3);
  const firstThird = reps.slice(0, thirdSize);
  const lastThird = reps.slice(reps.length - thirdSize);
  const errorRate = (group) => group.filter((rep) => rep.errors.length > 0).length / group.length;

  const indicators = [];

  const depthFirst = average(firstThird.map((rep) => rep.minKneeAngle));
  const depthLast = average(lastThird.map((rep) => rep.minKneeAngle));
  if (depthLast - depthFirst > depthIncreaseThresholdDeg) {
    indicators.push({
      type: 'depth',
      message: `Depth got shallower — average knee angle rose from ${depthFirst.toFixed(0)}° to ${depthLast.toFixed(0)}°`,
    });
  }

  const durationFirst = average(firstThird.map((rep) => rep.totalDuration));
  const durationLast = average(lastThird.map((rep) => rep.totalDuration));
  if (durationLast > durationFirst * durationIncreaseRatio) {
    indicators.push({
      type: 'tempo',
      message: `Reps slowed down — average duration rose from ${durationFirst.toFixed(1)}s to ${durationLast.toFixed(1)}s`,
    });
  }

  const errorRateFirst = errorRate(firstThird);
  const errorRateLast = errorRate(lastThird);
  if (errorRateLast - errorRateFirst > errorRateIncreaseThreshold) {
    indicators.push({
      type: 'errors',
      message: `Form broke down more often — error rate rose from ${Math.round(errorRateFirst * 100)}% to ${Math.round(errorRateLast * 100)}%`,
    });
  }

  if (indicators.length === 0) {
    return { detected: false, indicators: [], fromRepNumber: null };
  }

  // The first rep of the "last third" window is where the decline
  // becomes visible in this comparison, so that's what gets reported.
  return { detected: true, indicators, fromRepNumber: lastThird[0].repNumber };
}

// (d) Standard deviation of depth and duration across VALID reps only —
// an invalid rep's numbers aren't a meaningful data point for "how
// repeatable is your good form".
export function getConsistency(reps, config = ANALYTICS_CONFIG) {
  const validReps = reps.filter((rep) => rep.valid);

  if (validReps.length < 2) {
    return { score: null, kneeAngleStdDev: null, durationStdDev: null, reason: 'Need at least 2 valid reps' };
  }

  const kneeAngleStdDev = standardDeviation(validReps.map((rep) => rep.minKneeAngle));
  const durationStdDev = standardDeviation(validReps.map((rep) => rep.totalDuration));

  const { kneeAngleStdDevScale, durationStdDevScale } = config.consistency;
  const penalty = kneeAngleStdDev * kneeAngleStdDevScale + durationStdDev * durationStdDevScale;
  const score = Math.round(Math.max(0, Math.min(100, 100 - penalty)));

  return { score, kneeAngleStdDev, durationStdDev };
}

// (e) Average descent/ascent across every completed rep — deliberately
// not limited to valid reps, since a rep's tempo is measurable even when
// it failed on depth or valgus.
export function getTempoBreakdown(reps, config = ANALYTICS_CONFIG) {
  const timed = reps.filter((rep) => rep.descentDuration != null && rep.ascentDuration != null);

  if (timed.length === 0) {
    return { avgDescent: null, avgAscent: null, ratio: null, tooFast: false };
  }

  const avgDescent = average(timed.map((rep) => rep.descentDuration));
  const avgAscent = average(timed.map((rep) => rep.ascentDuration));
  const ratio = avgAscent > 0 ? avgDescent / avgAscent : null;
  const tooFast = avgDescent < config.tempo.fastDescentThresholdSec;

  return { avgDescent, avgAscent, ratio, tooFast };
}

// (f) Ordered, capped, plain-language takeaways — fatigue first (it's
// the most actionable "change what you're doing" signal), then the
// worst recurring mistake (if it's common enough to be worth a slot),
// then a tempo call-out. Falls back to a positive note on a clean set
// rather than returning nothing.
export function generateInsights(reps, config = ANALYTICS_CONFIG) {
  if (reps.length === 0) return [];

  const candidates = [];

  const fatigue = detectFatigue(reps, config);
  if (fatigue.detected) {
    const depthIndicator = fatigue.indicators.find((indicator) => indicator.type === 'depth');
    candidates.push({
      impact: 3,
      text: depthIndicator
        ? `Your depth dropped after rep ${fatigue.fromRepNumber} — consider stopping the set earlier`
        : `Your form started slipping around rep ${fatigue.fromRepNumber} — consider a shorter set`,
    });
  }

  const mistake = getMostCommonMistake(reps);
  if (mistake && mistake.percentage >= config.insights.mistakeThresholdPercent) {
    const check = SQUAT_CONFIG.checks.find((c) => c.id === mistake.id);
    const tip = check?.tip ? ` — ${check.tip}` : '';
    candidates.push({
      impact: mistake.severity === 'critical' ? 2.5 : 2,
      text: `"${check?.message ?? mistake.message}" on ${mistake.count} of ${reps.length} reps${tip}`,
    });
  }

  const tempo = getTempoBreakdown(reps, config);
  if (tempo.tooFast) {
    candidates.push({
      impact: 1.5,
      text: `You're descending too quickly (${tempo.avgDescent.toFixed(1)}s) — aim for a controlled 2-second lowering phase`,
    });
  }

  if (candidates.length === 0) {
    candidates.push({ impact: 0, text: 'Solid set — no recurring form issues detected' });
  }

  return candidates
    .sort((a, b) => b.impact - a.impact)
    .slice(0, config.insights.maxInsights)
    .map((candidate) => candidate.text);
}

// Convenience bundle so callers (the summary screen) run the analysis
// once per completed set instead of re-deriving each piece separately.
export function analyzeSet(reps, config = ANALYTICS_CONFIG) {
  return {
    formScore: computeFormScore(reps, config),
    mostCommonMistake: getMostCommonMistake(reps),
    fatigue: detectFatigue(reps, config),
    consistency: getConsistency(reps, config),
    tempo: getTempoBreakdown(reps, config),
    insights: generateInsights(reps, config),
  };
}
