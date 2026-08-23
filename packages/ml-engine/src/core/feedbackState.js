// Turns this frame's confirmed active errors into a render-ready object:
// which skeleton segments/joints to recolor, and the single cue message
// to show. Pure — no React, no canvas calls, just data in, data out.

import { SEVERITY_COLORS, segmentKey } from '../runtime/drawing';

function severityRank(severity) {
  return severity === 'critical' ? 2 : severity === 'warning' ? 1 : 0;
}

// Picks which active error to surface as "the" cue: highest severity
// wins; ties are broken by exerciseConfig.errorPriority (earlier = wins).
export function pickPrimaryError(activeErrors, errorPriority = []) {
  if (!activeErrors || activeErrors.length === 0) return null;

  const topSeverity = activeErrors.some((error) => error.severity === 'critical') ? 'critical' : 'warning';
  const candidates = activeErrors.filter((error) => error.severity === topSeverity);

  candidates.sort((a, b) => {
    const rankA = errorPriority.indexOf(a.id);
    const rankB = errorPriority.indexOf(b.id);
    return (rankA === -1 ? Infinity : rankA) - (rankB === -1 ? Infinity : rankB);
  });

  return candidates[0];
}

export function buildFeedbackState(activeErrors, exerciseConfig) {
  const segmentColors = new Map();
  const jointColors = new Map();

  if (activeErrors && activeErrors.length > 0) {
    const checksById = new Map(exerciseConfig.checks.map((check) => [check.id, check]));

    // Apply warnings first, then criticals — Map.set on an existing key
    // overwrites, so a segment touched by both ends up critical (as
    // required: critical overrides warning on the same segment).
    const bySeverityAscending = [...activeErrors].sort(
      (a, b) => severityRank(a.severity) - severityRank(b.severity)
    );

    for (const error of bySeverityAscending) {
      const check = checksById.get(error.id);
      if (!check) continue;

      const style = { color: SEVERITY_COLORS[error.severity], severity: error.severity };

      for (const [a, b] of check.affectedSegments ?? []) {
        segmentColors.set(segmentKey(a, b), style);
      }
      for (const joint of check.affectedJoints ?? []) {
        jointColors.set(joint, style);
      }
    }
  }

  const primary = pickPrimaryError(activeErrors, exerciseConfig.errorPriority);

  return {
    segmentColors,
    jointColors,
    primaryId: primary?.id ?? null,
    primaryMessage: primary?.message ?? null,
    primarySeverity: primary?.severity ?? null,
  };
}
