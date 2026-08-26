import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.session import RepEvent, WorkoutSession


def longest_correct_streak(rep_events: list[RepEvent]) -> int:
    best = current = 0
    for event in sorted(rep_events, key=lambda e: e.rep_index):
        if event.correct:
            current += 1
            best = max(best, current)
        else:
            current = 0
    return best


async def get_last_score_and_best_streak(
    db: AsyncSession, user_id: uuid.UUID, exercise_id: uuid.UUID
) -> tuple[int | None, int | None]:
    sessions = (
        await db.scalars(
            select(WorkoutSession)
            .options(selectinload(WorkoutSession.rep_events))
            .where(
                WorkoutSession.user_id == user_id,
                WorkoutSession.exercise_id == exercise_id,
                WorkoutSession.discarded.is_(False),
            )
            .order_by(WorkoutSession.started_at.desc())
        )
    ).all()

    if not sessions:
        return None, None

    last_score = sessions[0].score
    best_streak = max((longest_correct_streak(s.rep_events) for s in sessions), default=0)
    return last_score, best_streak or None
