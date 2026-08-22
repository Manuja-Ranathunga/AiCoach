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
  ['Confidence', 'confidence'],
];

// Live readout of squat metrics + completed reps, for verifying the
// angle engine and rep state machine. Toggle with 'd'. Purely
// presentational — all math happens in core/.
function DebugPanel({ metrics, reps = [] }) {
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

      <div className="debug-panel-title">Reps ({reps.length})</div>

      {reps.length === 0 ? (
        <div className="debug-panel-warning">No completed reps yet</div>
      ) : (
        <div className="debug-panel-reps">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Min knee</th>
                <th>Max torso</th>
                <th>Total (s)</th>
              </tr>
            </thead>
            <tbody>
              {[...reps].reverse().map((rep) => (
                <tr key={rep.repNumber}>
                  <td>{rep.repNumber}</td>
                  <td>{round(rep.minKneeAngle)}</td>
                  <td>{round(rep.maxTorsoAngle)}</td>
                  <td>{round(rep.totalDuration)}</td>
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
