import './StateIndicator.css';

// Small, low-contrast readout of the rep state machine's current state
// and which form checks are actually active for the chosen camera view
// — mostly useful for debugging, so it stays out of the way of the
// actual workout HUD.
function StateIndicator({ state, orientation, activeCheckNames }) {
  return (
    <div className="state-indicator">
      {state} · {orientation} · checking: {activeCheckNames.length > 0 ? activeCheckNames.join(', ') : 'none'} ·
      debug (d)
    </div>
  );
}

export default StateIndicator;
