import { apiClient } from './client';
import type { Exercise, ExerciseSettings } from '../types';

export async function listExercises() {
  const { data } = await apiClient.get<Exercise[]>('/exercises');
  return data;
}

export async function getExerciseSettings(exerciseId: string) {
  const { data } = await apiClient.get<ExerciseSettings>(`/exercises/${exerciseId}/settings`);
  return data;
}

export async function updateExerciseSettings(exerciseId: string, payload: ExerciseSettings) {
  const { data } = await apiClient.put<ExerciseSettings>(`/exercises/${exerciseId}/settings`, payload);
  return data;
}
