import { apiClient } from './client';
import type { SessionCreatePayload, SessionDetail, SessionHistoryPage } from '../types';

export async function createSession(payload: SessionCreatePayload) {
  const { data } = await apiClient.post<SessionDetail>('/sessions', payload);
  return data;
}

export async function listSessions(params: { exercise_slug?: string; limit?: number; offset?: number }) {
  const { data } = await apiClient.get<SessionHistoryPage>('/sessions', { params });
  return data;
}

export async function getSession(sessionId: string) {
  const { data } = await apiClient.get<SessionDetail>(`/sessions/${sessionId}`);
  return data;
}

export async function discardSession(sessionId: string) {
  const { data } = await apiClient.patch<SessionDetail>(`/sessions/${sessionId}/discard`);
  return data;
}
