export interface User {
  id: string;
  email: string;
  display_name: string;
}

export interface Exercise {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_key: string;
  last_score: number | null;
  best_streak: number | null;
}

export interface ExerciseSettings {
  target_reps: number;
  countdown_seconds: number;
  inactivity_timeout_seconds: number;
  voice_coaching_enabled: boolean;
}

export interface FormIssue {
  issue_type: string;
  label: string;
  detail: string;
  occurrences: number;
  rep_numbers: number[];
}

export interface RepEvent {
  rep_index: number;
  correct: boolean;
  quality: number;
  tempo_seconds: number | null;
}

export interface ExerciseRef {
  id: string;
  slug: string;
  name: string;
}

export interface SessionListItem {
  id: string;
  started_at: string;
  exercise: ExerciseRef;
  target_reps: number;
  reps_completed: number;
  reps_correct: number;
  reps_flagged: number;
  score: number;
}

export interface SessionDetail extends SessionListItem {
  duration_seconds: number;
  avg_tempo_seconds: number;
  deepest_angle_degrees: number | null;
  cues_spoken_count: number;
  form_issues: FormIssue[];
  rep_events: RepEvent[];
  score_delta: number | null;
}

export interface SessionHistoryPage {
  items: SessionListItem[];
  total: number;
}

export interface SessionCreatePayload {
  exercise_id: string;
  target_reps: number;
  reps_completed: number;
  reps_correct: number;
  reps_flagged: number;
  score: number;
  duration_seconds: number;
  avg_tempo_seconds: number;
  deepest_angle_degrees: number | null;
  cues_spoken_count: number;
  discarded?: boolean;
  form_issues: FormIssue[];
  rep_events: RepEvent[];
}

export interface ScorePoint {
  date: string;
  score: number;
}

export interface IssueMixEntry {
  label: string;
  percentage: number;
}

export interface MostCommonMistake {
  label: string;
  detail: string;
  percentage: number;
  previous_percentage: number | null;
}

export interface Progress {
  exercise_slug: string;
  sessions_counted: number;
  avg_score: number | null;
  best_score: number | null;
  trend: number | null;
  points: ScorePoint[];
  most_common_mistake: MostCommonMistake | null;
  issue_mix: IssueMixEntry[];
}
