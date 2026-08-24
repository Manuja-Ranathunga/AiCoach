import { describe, it, expect } from 'vitest';
import { getSeverityColor, getSeverityLabel } from '../src/runtime/severity.js';
import { SEVERITY_COLORS } from '../src/runtime/drawing.js';

describe('severity display helper', () => {
  it('maps each known severity to its drawing.js color', () => {
    expect(getSeverityColor('good')).toBe(SEVERITY_COLORS.good);
    expect(getSeverityColor('warning')).toBe(SEVERITY_COLORS.warning);
    expect(getSeverityColor('critical')).toBe(SEVERITY_COLORS.critical);
  });

  it('gives each known severity a distinct label', () => {
    const labels = ['good', 'warning', 'critical'].map(getSeverityLabel);
    expect(new Set(labels).size).toBe(3);
  });

  it('falls back to the good/default styling for an unknown or missing severity', () => {
    expect(getSeverityColor(undefined)).toBe(SEVERITY_COLORS.good);
    expect(getSeverityColor('not-a-severity')).toBe(SEVERITY_COLORS.good);
    expect(getSeverityLabel(undefined)).toBe(getSeverityLabel('good'));
  });
});
