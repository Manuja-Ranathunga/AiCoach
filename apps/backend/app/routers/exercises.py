from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.crud.exercises import get_exercise_by_slug, list_exercises_with_user_stats
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.exercise import ExerciseOut

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("", response_model=list[ExerciseOut])
def list_exercises(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[ExerciseOut]:
    return list_exercises_with_user_stats(db, current_user.id)


@router.get("/{slug}", response_model=ExerciseOut)
def get_exercise(
    slug: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> ExerciseOut:
    exercise = get_exercise_by_slug(db, slug)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")
    return next(e for e in list_exercises_with_user_stats(db, current_user.id) if e.slug == slug)
