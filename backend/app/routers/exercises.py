import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models.exercise import Exercise, ExerciseSettings
from app.models.user import User
from app.schemas.exercise import ExerciseOut, ExerciseSettingsOut, ExerciseSettingsUpdate
from app.services.stats import get_last_score_and_best_streak

router = APIRouter(prefix="/exercises", tags=["exercises"])


async def _get_exercise_or_404(db: AsyncSession, exercise_id: uuid.UUID) -> Exercise:
    exercise = await db.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exercise not found")
    return exercise


@router.get("", response_model=list[ExerciseOut])
async def list_exercises(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[ExerciseOut]:
    exercises = (await db.scalars(select(Exercise).order_by(Exercise.sort_order))).all()

    results = []
    for exercise in exercises:
        last_score, best_streak = await get_last_score_and_best_streak(db, current_user.id, exercise.id)
        results.append(
            ExerciseOut(
                id=exercise.id,
                slug=exercise.slug,
                name=exercise.name,
                description=exercise.description,
                icon_key=exercise.icon_key,
                last_score=last_score,
                best_streak=best_streak,
            )
        )
    return results


@router.get("/{exercise_id}/settings", response_model=ExerciseSettingsOut)
async def get_exercise_settings(
    exercise_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExerciseSettings:
    await _get_exercise_or_404(db, exercise_id)

    settings = await db.scalar(
        select(ExerciseSettings).where(
            ExerciseSettings.user_id == current_user.id,
            ExerciseSettings.exercise_id == exercise_id,
        )
    )
    if settings is None:
        settings = ExerciseSettings(user_id=current_user.id, exercise_id=exercise_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)

    return settings


@router.put("/{exercise_id}/settings", response_model=ExerciseSettingsOut)
async def update_exercise_settings(
    exercise_id: uuid.UUID,
    payload: ExerciseSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExerciseSettings:
    await _get_exercise_or_404(db, exercise_id)

    settings = await db.scalar(
        select(ExerciseSettings).where(
            ExerciseSettings.user_id == current_user.id,
            ExerciseSettings.exercise_id == exercise_id,
        )
    )
    if settings is None:
        settings = ExerciseSettings(user_id=current_user.id, exercise_id=exercise_id)
        db.add(settings)

    settings.target_reps = payload.target_reps
    settings.countdown_seconds = payload.countdown_seconds
    settings.inactivity_timeout_seconds = payload.inactivity_timeout_seconds
    settings.voice_coaching_enabled = payload.voice_coaching_enabled

    await db.commit()
    await db.refresh(settings)
    return settings
