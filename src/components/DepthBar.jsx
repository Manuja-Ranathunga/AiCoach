import './DepthBar.css';

// Vertical "how much lower" indicator: fill height reflects the live knee
// angle, with a marker line at the depth threshold. The fill is updated
// imperatively by the caller writing directly to fillRef.current.style
// inside the detection loop (see CameraView.jsx) rather than through
// React state — it changes essentially every frame, so routing it through
// setState would mean a re-render every frame just for this one bar.
function DepthBar({ markerPercent, ref: fillRef }) {
  return (
    <div className="depth-bar">
      <div className="depth-bar-track">
        <div className="depth-bar-marker" style={{ bottom: `${markerPercent * 100}%` }} />
        <div ref={fillRef} className="depth-bar-fill" style={{ height: '0%' }} />
      </div>
      <div className="depth-bar-label">DEPTH</div>
    </div>
  );
}

export default DepthBar;
