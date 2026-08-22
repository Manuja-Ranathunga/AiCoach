import './RepositionOverlay.css';

// Shown when framing degrades badly mid-set (see CameraView's framing
// monitor). Reps are not counted while this is up; it clears itself once
// CameraView sees the framing checks pass again and moves to COUNTDOWN.
function RepositionOverlay({ hint }) {
  return (
    <div className="reposition-overlay">
      <div className="reposition-title">Paused</div>
      <div className="reposition-hint">{hint}</div>
    </div>
  );
}

export default RepositionOverlay;
