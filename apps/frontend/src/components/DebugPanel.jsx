import './DebugPanel.css';

function round(value) {
  return Math.round(value * 10) / 10;
}

const ROWS = [
  ['Knee L', 'kneeAngleL'],
  ['Knee R', 'kneeAngleR'],
  ['Knee avg', 'kneeAngleAvg'],
  ['Hip L', 'hipAngleL'],
  ['Hip R', 'hipAngleR'],
  ['Hip avg', 'hipAngleAvg'],
  ['Torso angle', 'torsoAngle'],
  ['Hip Y', 'hipY'],
  ['Knee Y', 'kneeY'],
  ['Depth ratio', 'depthRatio'],
  ['Knee symmetry diff', 'kneeSymmetryDiff'],
  ['Knee deviation L', 'kneeDeviationL'],
  ['Knee deviation R', 'kneeDeviationR'],
  ['Confidence', 'confidence'],
];

function formatErrors(errors) {
  if (!errors || errors.length === 0) return '—';
  return errors.map((error) => `${error.id} (${error.frameCount}f)`).join(', ');
}

// Live readout of squat metrics, active form errors, and completed reps —
// for verifying the angle engine, rep state machine, and form checks.
// Toggle with 'd'. Purely presentational — all math happens in core/.
function DebugPanel({ metrics, reps = [], activeErrors = [] }) {
  return (
    <div className="debug-panel">
      <div className="debug-panel-title">Debug (d to toggle)</div>

      {!metrics ? (
        <div className="debug-panel-warning">No metrics — landmarks missing or confidence too low</div>
      ) : (
        <table>
          <tbody>
            {ROWS.map(([label, key]) => (
              <tr key={key}>
                <td>{label}</td>
                <td>{round(metrics[key])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="debug-panel-title">Active errors ({activeErrors.length})</div>

      {activeErrors.length === 0 ? (
        <div className="debug-panel-warning">None</div>
      ) : (
        <ul className="debug-panel-active-errors">
          {activeErrors.map((error) => (
            <li key={error.id}>
              [{error.severity}] {error.id}: {round(error.value)}
            </li>
          ))}
        </ul>
      )}

      <div className="debug-panel-title">Reps ({reps.length})</div>

      {reps.length === 0 ? (
        <div className="debug-panel-warning">No completed reps yet</div>
      ) : (
        <div className="debug-panel-reps">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Valid</th>
                <th>Min knee</th>
                <th>Max torso</th>
                <th>Total (s)</th>
                <th>Errors</th>
              </tr>
            </thead>
            <tbody>
              {[...reps].reverse().map((rep) => (
                <tr key={rep.repNumber}>
                  <td>{rep.repNumber}</td>
                  <td>{rep.valid ? 'yes' : 'no'}</td>
                  <td>{round(rep.minKneeAngle)}</td>
                  <td>{round(rep.maxTorsoAngle)}</td>
                  <td>{round(rep.totalDuration)}</td>
                  <td>{formatErrors(rep.errors)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default DebugPanel;
