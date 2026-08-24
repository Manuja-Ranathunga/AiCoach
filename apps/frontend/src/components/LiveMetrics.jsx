import { pickPrimaryError, getSeverityColor, getSeverityLabel } from '@ai-coach/ml-engine';
import './LiveMetrics.css';

function formatNumber(value, unit) {
  return unit === '°' ? `${Math.round(value)}${unit}` : value.toFixed(2);
}

// A small live readout of whichever check is currently flagged: its
// value, its target threshold, and a severity badge — everything already
// computed by the rep state machine's active-error tracking, just
// surfaced here instead of only being visible in the dev-only
// DebugPanel. Shows nothing while no check is active, same as CueBanner.
function LiveMetrics({ activeErrors, exerciseConfig }) {
  const primary = pickPrimaryError(activeErrors, exerciseConfig.errorPriority);
  if (!primary) return null;

  const check = exerciseConfig.checks.find((c) => c.id === primary.id);
  const unit = check?.unit ?? '';
  const threshold = check ? exerciseConfig.thresholds[check.thresholdKey] : null;
  const color = getSeverityColor(primary.severity);
  const label = getSeverityLabel(primary.severity);

  return (
    <div className="live-metrics" style={{ '--live-metrics-color': color }}>
      <div className="live-metrics-header">
        <span className="live-metrics-title">Live metric</span>
        <span className="live-metrics-badge">{label}</span>
      </div>
      <div className="live-metrics-value">
        {check?.message ?? primary.id}: {formatNumber(primary.value, unit)}
      </div>
      {threshold != null && <div className="live-metrics-threshold">Target: below {formatNumber(threshold, unit)}</div>}
    </div>
  );
}

export default LiveMetrics;
