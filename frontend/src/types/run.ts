export interface RunSettings {
  exerciseId: string;
  exerciseSlug: string;
  exerciseName: string;
  targetReps: number;
  countdownSeconds: number;
  inactivityTimeoutSeconds: number;
  voiceCoachingEnabled: boolean;
}
