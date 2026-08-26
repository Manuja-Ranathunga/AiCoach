import { apiClient } from './client';
import type { Progress } from '../types';

export async function getProgress(params: { exercise_slug: string; window?: number }) {
  const { data } = await apiClient.get<Progress>('/progress', { params });
  return data;
}
