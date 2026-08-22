import './StatsOverlay.css';

// Small HTML overlay (not drawn on canvas) showing FPS and whether a pose
// is currently detected. Purely presentational.
function StatsOverlay({ fps, detected }) {
  return (
    <div className="stats-overlay">
      <span>{fps} FPS</span>
      <span className={detected ? 'stats-detected' : 'stats-not-detected'}>
        {detected ? 'Pose detected' : 'No pose'}
      </span>
    </div>
  );
}

export default StatsOverlay;
