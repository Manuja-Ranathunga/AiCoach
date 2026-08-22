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

// Live readout of squat metrics for verifying the angle engine. Toggle
// with 'd'. Purely presentational — all math happens in core/.
function DebugPanel({ metrics }) {
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
    </div>
  );
}

export default DebugPanel;
