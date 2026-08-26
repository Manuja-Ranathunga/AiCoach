import { getSeverityColor } from '@ai-coach/ml-engine';
import './CueBanner.css';

// Large "what to fix right now" cue, colored by severity via the shared
// severity helper (see LiveMetrics.jsx and drawSkeleton for the other
// consumers of that same good/warning/critical -> color mapping). The
// container is always mounted; only its opacity and text change, so it
// crossfades in/out via CSS transition instead of popping.
function CueBanner({ message, severity }) {
  const visible = Boolean(message);
  const color = getSeverityColor(severity ?? 'warning');

  return (
    <div className={`cue-banner${visible ? ' cue-banner-visible' : ''}`} style={{ '--cue-color': color }}>
      {message}
    </div>
  );
}

export default CueBanner;
