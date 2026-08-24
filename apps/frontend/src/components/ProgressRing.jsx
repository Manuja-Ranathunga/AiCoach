import './ProgressRing.css';

// Generic circular progress readout: an SVG ring whose fill sweeps
// clockwise from the top as `percent` rises. No exercise/setup-specific
// knowledge here — the caller decides what percent and labels mean.
function ProgressRing({ percent, size = 96, strokeWidth = 8, label }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle className="progress-ring-track" cx={center} cy={center} r={radius} strokeWidth={strokeWidth} />
        <circle
          className="progress-ring-fill"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="progress-ring-text">
        <span className="progress-ring-value">{Math.round(clamped)}%</span>
        {label && <span className="progress-ring-label">{label}</span>}
      </div>
    </div>
  );
}

export default ProgressRing;
