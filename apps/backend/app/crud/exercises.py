from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.exercise import Exercise
from app.models.session import WorkoutSession
from app.schemas.exercise import ExerciseOut

STREAK_SCORE_THRESHOLD = 70


def _best_streak(scores: list[int]) -> int:
    best = current = 0
    for score in scores:
        if score >= STREAK_SCORE_THRESHOLD:
            current += 1
            best = max(best, current)
        else:
            current = 0
    return best


def list_exercises(db: Session) -> list[Exercise]:
    return list(db.scalars(select(Exercise).order_by(Exercise.sort_order)))


def get_exercise_by_slug(db: Session, slug: str) -> Exercise | None:
    return db.scalar(select(Exercise).where(Exercise.slug == slug))


def list_exercises_with_user_stats(db: Session, user_id: int) -> list[ExerciseOut]:
    exercises = list_exercises(db)
    results: list[ExerciseOut] = []
    for exercise in exercises:
        sessions = list(
            db.scalars(
                select(WorkoutSession)
                .where(
                    WorkoutSession.exercise_id == exercise.id,
                    WorkoutSession.user_id == user_id,
                )
                .order_by(WorkoutSession.started_at)
            )
        )
        scores = [s.score for s in sessions]
        results.append(
            ExerciseOut(
                id=exercise.id,
                slug=exercise.slug,
                name=exercise.name,
                description=exercise.description,
                icon_key=exercise.icon_key,
                last_score=scores[-1] if scores else None,
                best_streak=_best_streak(scores) if scores else None,
                last_session_at=sessions[-1].started_at if sessions else None,
            )
        )
    return results
