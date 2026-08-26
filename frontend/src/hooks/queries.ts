import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as exercisesApi from '../api/exercises';
import * as progressApi from '../api/progress';
import * as sessionsApi from '../api/sessions';
import type { ExerciseSettings, SessionCreatePayload } from '../types';

export function useExercises() {
  return useQuery({ queryKey: ['exercises'], queryFn: exercisesApi.listExercises });
}

export function useExerciseSettings(exerciseId: string | undefined) {
  return useQuery({
    queryKey: ['exercise-settings', exerciseId],
    queryFn: () => exercisesApi.getExerciseSettings(exerciseId!),
    enabled: !!exerciseId,
  });
}

export function useUpdateExerciseSettings(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ExerciseSettings) => exercisesApi.updateExerciseSettings(exerciseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-settings', exerciseId] });
    },
  });
}

export function useSessions(params: { exercise_slug?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['sessions', params],
    queryFn: () => sessionsApi.listSessions(params),
  });
}

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionsApi.getSession(sessionId!),
    enabled: !!sessionId,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SessionCreatePayload) => sessionsApi.createSession(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });
}

export function useDiscardSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => sessionsApi.discardSession(sessionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.setQueryData(['session', data.id], data);
    },
  });
}

export function useProgress(exerciseSlug: string | undefined, window = 12) {
  return useQuery({
    queryKey: ['progress', exerciseSlug, window],
    queryFn: () => progressApi.getProgress({ exercise_slug: exerciseSlug!, window }),
    enabled: !!exerciseSlug,
  });
}
