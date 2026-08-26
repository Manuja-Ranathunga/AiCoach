import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user
from app.database import get_db
from app.models.exercise import Exercise
from app.models.session import FormIssue, RepEvent, WorkoutSession
from app.models.user import User
from app.schemas.session import SessionCreate, SessionDetail, SessionHistoryPage, SessionListItem

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionDetail, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutSession:
    exercise = await db.get(Exercise, payload.exercise_id)
    if exercise is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exercise not found")

    previous_score = await db.scalar(
        select(WorkoutSession.score)
        .where(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.exercise_id == payload.exercise_id,
            WorkoutSession.discarded.is_(False),
        )
        .order_by(WorkoutSession.started_at.desc())
        .limit(1)
    )

    session = WorkoutSession(
        user_id=current_user.id,
        exercise_id=payload.exercise_id,
        target_reps=payload.target_reps,
        reps_completed=payload.reps_completed,
        reps_correct=payload.reps_correct,
        reps_flagged=payload.reps_flagged,
        score=payload.score,
        duration_seconds=payload.duration_seconds,
        avg_tempo_seconds=payload.avg_tempo_seconds,
        deepest_angle_degrees=payload.deepest_angle_degrees,
        cues_spoken_count=payload.cues_spoken_count,
        discarded=payload.discarded,
    )
    session.form_issues = [FormIssue(**issue.model_dump()) for issue in payload.form_issues]
    session.rep_events = [RepEvent(**event.model_dump()) for event in payload.rep_events]

    db.add(session)
    await db.commit()
    await db.refresh(session, attribute_names=["form_issues", "rep_events", "exercise"])

    detail = SessionDetail.model_validate(session)
    detail.score_delta = None if previous_score is None else session.score - previous_score
    return detail


@router.get("", response_model=SessionHistoryPage)
async def list_sessions(
    exercise_slug: str | None = Query(default=None),
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SessionHistoryPage:
    base_query = select(WorkoutSession).where(
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.discarded.is_(False),
    )
    count_query = select(func.count()).select_from(WorkoutSession).where(
        WorkoutSession.user_id == current_user.id,
        WorkoutSession.discarded.is_(False),
    )

    if exercise_slug is not None:
        base_query = base_query.join(Exercise).where(Exercise.slug == exercise_slug)
        count_query = count_query.join(Exercise).where(Exercise.slug == exercise_slug)

    total = await db.scalar(count_query) or 0

    sessions = (
        await db.scalars(
            base_query.options(selectinload(WorkoutSession.exercise))
            .order_by(WorkoutSession.started_at.desc())
            .limit(limit)
            .offset(offset)
        )
    ).all()

    return SessionHistoryPage(items=[SessionListItem.model_validate(s) for s in sessions], total=total)


@router.patch("/{session_id}/discard", response_model=SessionDetail)
async def discard_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SessionDetail:
    session = await db.scalar(
        select(WorkoutSession)
        .options(
            selectinload(WorkoutSession.exercise),
            selectinload(WorkoutSession.form_issues),
            selectinload(WorkoutSession.rep_events),
        )
        .where(WorkoutSession.id == session_id, WorkoutSession.user_id == current_user.id)
    )
    if session is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")

    session.discarded = True
    await db.commit()
    await db.refresh(session)

    detail = SessionDetail.model_validate(session)
    detail.score_delta = None
    return detail


@router.get("/{session_id}", response_model=SessionDetail)
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SessionDetail:
    session = await db.scalar(
        select(WorkoutSession)
        .options(
            selectinload(WorkoutSession.exercise),
            selectinload(WorkoutSession.form_issues),
            selectinload(WorkoutSession.rep_events),
        )
        .where(WorkoutSession.id == session_id, WorkoutSession.user_id == current_user.id)
    )
    if session is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")

    previous_score = await db.scalar(
        select(WorkoutSession.score)
        .where(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.exercise_id == session.exercise_id,
            WorkoutSession.discarded.is_(False),
            WorkoutSession.started_at < session.started_at,
        )
        .order_by(WorkoutSession.started_at.desc())
        .limit(1)
    )

    detail = SessionDetail.model_validate(session)
    detail.score_delta = None if previous_score is None else session.score - previous_score
    return detail
