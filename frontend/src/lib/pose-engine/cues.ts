import type { FormIssueEvent } from './types';

interface ExerciseCueBank {
  correctCaptions: string[];
  possibleIssues: (FormIssueEvent & { warnCaption: string })[];
}

export const CUE_BANKS: Record<string, ExerciseCueBank> = {
  squat: {
    correctCaptions: ['Good depth — hold that tempo', 'Clean rep — knees tracking well', 'Solid — keep that pace'],
    possibleIssues: [
      {
        type: 'insufficient_depth',
        label: 'Insufficient depth',
        detail: 'Knee angle stopped short of target depth',
        warnCaption: 'Go a little deeper',
      },
      {
        type: 'knee_valgus_left',
        label: 'Knee valgus (left)',
        detail: 'Left knee tracked inside the ankle line',
        warnCaption: 'Push your left knee out',
      },
      {
        type: 'torso_lean',
        label: 'Torso lean',
        detail: 'Torso pitched forward past the target range',
        warnCaption: 'Keep your chest up',
      },
    ],
  },
  'push-up': {
    correctCaptions: ['Full range — nice control', 'Good elbow path', 'Clean rep'],
    possibleIssues: [
      {
        type: 'shallow_range',
        label: 'Shallow range',
        detail: 'Elbow angle stayed above target at the bottom',
        warnCaption: 'Lower your chest a bit more',
      },
      {
        type: 'hip_sag',
        label: 'Hip sag',
        detail: 'Hips dropped below the shoulder-ankle line',
        warnCaption: 'Brace your core, hips up',
      },
    ],
  },
  'mountain-climbers': {
    correctCaptions: ['Good cadence', 'Hips staying level'],
    possibleIssues: [
      {
        type: 'hip_height',
        label: 'Hip height drift',
        detail: 'Hips rose above the target plank line',
        warnCaption: 'Keep your hips down',
      },
      {
        type: 'uneven_cadence',
        label: 'Uneven cadence',
        detail: 'Left/right drive tempo diverged from target',
        warnCaption: 'Even out your pace',
      },
    ],
  },
};

export function cuesFor(exerciseSlug: string): ExerciseCueBank {
  return CUE_BANKS[exerciseSlug] ?? CUE_BANKS.squat;
}
