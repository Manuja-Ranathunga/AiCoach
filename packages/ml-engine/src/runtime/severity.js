// Single "given a severity level, what color/label represents it" table.
// Shared by the canvas skeleton (via SEVERITY_COLORS, through
// feedbackState.js), the cue banner, and the live metrics panel, so a new
// severity-driven UI element never has to reinvent this mapping.

import { SEVERITY_COLORS } from './drawing.js';

const DEFAULT_SEVERITY = 'good';

const SEVERITY_LABELS = {
  good: 'Good',
  warning: 'Borderline',
  critical: 'Problem',
};

export function getSeverityColor(severity) {
  return SEVERITY_COLORS[severity] ?? SEVERITY_COLORS[DEFAULT_SEVERITY];
}

export function getSeverityLabel(severity) {
  return SEVERITY_LABELS[severity] ?? SEVERITY_LABELS[DEFAULT_SEVERITY];
}
