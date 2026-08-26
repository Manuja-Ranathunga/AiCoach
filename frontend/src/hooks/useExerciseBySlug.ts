import { useExercises } from './queries';

export function useExerciseBySlug(slug: string | undefined) {
  const { data: exercises, ...rest } = useExercises();
  const exercise = exercises?.find((e) => e.slug === slug);
  return { exercise, ...rest };
}
