from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.crud.exercises import get_exercise_by_slug
from app.crud.stats import get_progress
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.stats import ProgressOut

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/progress", response_model=ProgressOut)
def progress(
    exercise: str = Query(..., description="Exercise slug"),
    limit: int = Query(default=12, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProgressOut:
    exercise_obj = get_exercise_by_slug(db, exercise)
    if exercise_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")
    return get_progress(db, current_user.id, exercise_obj, limit)
