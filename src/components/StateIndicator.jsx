import './StateIndicator.css';

// Small, low-contrast readout of the rep state machine's current state
// and the manual orientation toggle — mostly useful for debugging, so it
// stays out of the way of the actual workout HUD.
function StateIndicator({ state, orientation }) {
  return (
    <div className="state-indicator">
      {state} · {orientation} (o) · debug (d)
    </div>
  );
}

export default StateIndicator;
