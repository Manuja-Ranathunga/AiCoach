// Exercise catalog for the picker grid. Only 'squat' actually has a rule
// engine behind it (see @ai-coach/ml-engine's SQUAT_CONFIG) — the rest
// are listed with status 'coming_soon' so the picker can show what's on
// the way without pretending they're usable yet.
//
// A GET /exercises endpoint returning this same shape is being built on a
// separate backend branch. getExercises() is the ONLY thing callers
// should use — swapping the body below for a fetch() call is meant to be
// a one-line change with no ripple effect on SetupFlow or anywhere else.
const EXERCISES = [
  {
    id: 'squat',
    name: 'Squat',
    difficulty: 'Beginner',
    muscle_group: 'Quads / Glutes',
    description: 'Tracks knee angle, squat depth, and torso lean to check your form in real time.',
    status: 'available',
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    difficulty: 'Advanced',
    muscle_group: 'Posterior Chain',
    description: 'Hip-hinge and bar-path tracking for deadlift form.',
    status: 'coming_soon',
  },
  {
    id: 'pushup',
    name: 'Push-up',
    difficulty: 'Intermediate',
    muscle_group: 'Chest / Triceps',
    description: 'Elbow angle and body-line tracking for push-ups.',
    status: 'coming_soon',
  },
  {
    id: 'lunge',
    name: 'Lunge',
    difficulty: 'Intermediate',
    muscle_group: 'Legs / Balance',
    description: 'Front-knee angle and balance tracking for lunges.',
    status: 'coming_soon',
  },
  {
    id: 'shoulder_press',
    name: 'Shoulder Press',
    difficulty: 'Intermediate',
    muscle_group: 'Shoulders',
    description: 'Arm path and lockout tracking for shoulder press.',
    status: 'coming_soon',
  },
  {
    id: 'plank',
    name: 'Plank',
    difficulty: 'Beginner',
    muscle_group: 'Core Stability',
    description: 'Hip and shoulder alignment tracking for planks.',
    status: 'coming_soon',
  },
];

export function getExercises() {
  return Promise.resolve(EXERCISES);
}
