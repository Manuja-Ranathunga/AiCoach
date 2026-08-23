import './CueBanner.css';

// Large "what to fix right now" cue, colored by severity. The container
// is always mounted; only its opacity and text change, so it crossfades
// in/out via CSS transition instead of popping.
function CueBanner({ message, severity }) {
  const visible = Boolean(message);
  const severityClass = `cue-banner-${severity ?? 'warning'}`;

  return <div className={`cue-banner ${severityClass} ${visible ? 'cue-banner-visible' : ''}`}>{message}</div>;
}

export default CueBanner;
