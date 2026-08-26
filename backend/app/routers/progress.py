from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user
from app.database import get_db
from app.models.exercise import Exercise
from app.models.session import WorkoutSession
from app.models.user import User
from app.schemas.progress import IssueMixEntry, MostCommonMistake, ProgressOut, ScorePoint

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("", response_model=ProgressOut)
async def get_progress(
    exercise_slug: str = Query(...),
    window: int = Query(default=12, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProgressOut:
    exercise = await db.scalar(select(Exercise).where(Exercise.slug == exercise_slug))
    if exercise is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exercise not found")

    recent_desc = (
        await db.scalars(
            select(WorkoutSession)
            .options(selectinload(WorkoutSession.form_issues))
            .where(
                WorkoutSession.user_id == current_user.id,
                WorkoutSession.exercise_id == exercise.id,
                WorkoutSession.discarded.is_(False),
            )
            .order_by(WorkoutSession.started_at.desc())
            .limit(window)
        )
    ).all()

    sessions = list(reversed(recent_desc))  # oldest -> newest

    if not sessions:
        return ProgressOut(
            exercise_slug=exercise.slug,
            sessions_counted=0,
            avg_score=None,
            best_score=None,
            trend=None,
            points=[],
            most_common_mistake=None,
            issue_mix=[],
        )

    scores = [s.score for s in sessions]
    points = [ScorePoint(date=s.started_at, score=s.score) for s in sessions]
    avg_score = round(sum(scores) / len(scores))
    best_score = max(scores)
    trend = scores[-1] - scores[0]

    total_flagged = sum(s.reps_flagged for s in sessions) or 1
    occurrences_by_type: dict[str, int] = {}
    label_by_type: dict[str, str] = {}
    detail_by_type: dict[str, str] = {}
    for session in sessions:
        for issue in session.form_issues:
            occurrences_by_type[issue.issue_type] = occurrences_by_type.get(issue.issue_type, 0) + issue.occurrences
            label_by_type[issue.issue_type] = issue.label
            detail_by_type[issue.issue_type] = issue.detail

    issue_mix = sorted(
        (
            IssueMixEntry(label=label_by_type[t], percentage=round(count / total_flagged * 100, 1))
            for t, count in occurrences_by_type.items()
        ),
        key=lambda e: e.percentage,
        reverse=True,
    )

    most_common_mistake = None
    if occurrences_by_type:
        top_type = max(occurrences_by_type, key=lambda t: occurrences_by_type[t])
        mid = len(sessions) // 2
        earlier, later = sessions[:mid], sessions[mid:]

        def pct_for(subset: list[WorkoutSession]) -> float | None:
            flagged = sum(s.reps_flagged for s in subset)
            if flagged == 0:
                return None
            occ = sum(i.occurrences for s in subset for i in s.form_issues if i.issue_type == top_type)
            return round(occ / flagged * 100, 1)

        most_common_mistake = MostCommonMistake(
            label=label_by_type[top_type],
            detail=detail_by_type[top_type],
            percentage=round(occurrences_by_type[top_type] / total_flagged * 100, 1),
            previous_percentage=pct_for(earlier) if earlier and later else None,
        )

    return ProgressOut(
        exercise_slug=exercise.slug,
        sessions_counted=len(sessions),
        avg_score=avg_score,
        best_score=best_score,
        trend=trend,
        points=points,
        most_common_mistake=most_common_mistake,
        issue_mix=issue_mix,
    )
