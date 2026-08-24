import './ExerciseIcon.css';

// Small stick-figure skeleton per exercise, all sharing one joint/bone
// drawing style (a circle per joint, a line per bone) so a new exercise
// is just a new set of coordinates below. Purely decorative — coordinates
// are hand-placed to suggest each exercise's characteristic pose, not
// derived from any real pose data.
const POSES = {
  squat: {
    joints: {
      head: [50, 14],
      shoulder: [50, 26],
      hip: [50, 48],
      kneeL: [38, 66],
      ankleL: [36, 88],
      kneeR: [62, 66],
      ankleR: [64, 88],
      elbowL: [36, 36],
      wristL: [28, 48],
      elbowR: [64, 36],
      wristR: [72, 48],
    },
    bones: [
      ['shoulder', 'hip'],
      ['hip', 'kneeL'],
      ['kneeL', 'ankleL'],
      ['hip', 'kneeR'],
      ['kneeR', 'ankleR'],
      ['shoulder', 'elbowL'],
      ['elbowL', 'wristL'],
      ['shoulder', 'elbowR'],
      ['elbowR', 'wristR'],
    ],
  },
  deadlift: {
    joints: {
      head: [36, 18],
      shoulder: [40, 28],
      hip: [58, 50],
      kneeL: [56, 72],
      ankleL: [54, 90],
      kneeR: [62, 72],
      ankleR: [64, 90],
      wristL: [32, 58],
      wristR: [38, 58],
      barL: [24, 60],
      barR: [50, 60],
    },
    bones: [
      ['shoulder', 'hip'],
      ['hip', 'kneeL'],
      ['kneeL', 'ankleL'],
      ['hip', 'kneeR'],
      ['kneeR', 'ankleR'],
      ['shoulder', 'wristL'],
      ['shoulder', 'wristR'],
      ['barL', 'barR'],
    ],
  },
  pushup: {
    joints: {
      head: [16, 46],
      shoulder: [30, 52],
      hip: [62, 52],
      knee: [76, 50],
      ankle: [90, 46],
      elbow: [30, 68],
      wrist: [30, 82],
    },
    bones: [
      ['shoulder', 'hip'],
      ['hip', 'knee'],
      ['knee', 'ankle'],
      ['shoulder', 'elbow'],
      ['elbow', 'wrist'],
    ],
  },
  lunge: {
    joints: {
      head: [46, 14],
      shoulder: [46, 26],
      hip: [46, 48],
      kneeFront: [32, 66],
      ankleFront: [28, 88],
      kneeBack: [60, 70],
      ankleBack: [68, 92],
      elbowL: [38, 36],
      wristL: [34, 46],
      elbowR: [54, 36],
      wristR: [58, 46],
    },
    bones: [
      ['shoulder', 'hip'],
      ['hip', 'kneeFront'],
      ['kneeFront', 'ankleFront'],
      ['hip', 'kneeBack'],
      ['kneeBack', 'ankleBack'],
      ['shoulder', 'elbowL'],
      ['elbowL', 'wristL'],
      ['shoulder', 'elbowR'],
      ['elbowR', 'wristR'],
    ],
  },
  shoulder_press: {
    joints: {
      head: [50, 16],
      shoulder: [50, 28],
      hip: [50, 52],
      kneeL: [44, 74],
      ankleL: [42, 92],
      kneeR: [56, 74],
      ankleR: [58, 92],
      elbowL: [34, 18],
      wristL: [30, 4],
      elbowR: [66, 18],
      wristR: [70, 4],
    },
    bones: [
      ['shoulder', 'hip'],
      ['hip', 'kneeL'],
      ['kneeL', 'ankleL'],
      ['hip', 'kneeR'],
      ['kneeR', 'ankleR'],
      ['shoulder', 'elbowL'],
      ['elbowL', 'wristL'],
      ['shoulder', 'elbowR'],
      ['elbowR', 'wristR'],
    ],
  },
  plank: {
    joints: {
      head: [16, 46],
      shoulder: [28, 48],
      hip: [60, 48],
      ankle: [90, 46],
      elbow: [28, 66],
      wrist: [28, 80],
    },
    bones: [
      ['shoulder', 'hip'],
      ['hip', 'ankle'],
      ['shoulder', 'elbow'],
      ['elbow', 'wrist'],
    ],
  },
};

function ExerciseIcon({ exercise, className = '' }) {
  const pose = POSES[exercise] ?? POSES.squat;

  return (
    <svg viewBox="0 0 100 100" className={`exercise-icon ${className}`} aria-hidden="true">
      {pose.bones.map(([a, b]) => {
        const [x1, y1] = pose.joints[a];
        const [x2, y2] = pose.joints[b];
        return <line key={`${a}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
      {Object.entries(pose.joints).map(([name, [x, y]]) => (
        <circle key={name} cx={x} cy={y} r={name === 'head' ? 6 : 3} className={name === 'head' ? 'exercise-icon-head' : 'exercise-icon-joint'} />
      ))}
    </svg>
  );
}

export default ExerciseIcon;
