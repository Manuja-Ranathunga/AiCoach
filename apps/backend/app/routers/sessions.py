from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.crud.exercises import get_exercise_by_slug
from app.crud.sessions import (
    create_session,
    get_session_detail,
    get_session_score_delta,
    list_sessions,
)
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.session import (
    FormIssueOut,
    RepOut,
    SessionCreate,
    SessionListItemOut,
    SessionListOut,
    SessionSummaryOut,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _to_summary(session, score_delta: int | None) -> SessionSummaryOut:
    return SessionSummaryOut(
        id=session.id,
        exercise_slug=session.exercise.slug,
        exercise_name=session.exercise.name,
        started_at=session.started_at,
        ended_at=session.ended_at,
        target_reps=session.target_reps,
        completed_reps=session.completed_reps,
        correct_reps=session.correct_reps,
        flagged_reps=session.flagged_reps,
        score=session.score,
        score_delta=score_delta,
        duration_seconds=session.duration_seconds,
        avg_tempo_seconds=session.avg_tempo_seconds,
        deepest_angle_deg=session.deepest_angle_deg,
        cues_spoken=session.cues_spoken,
        reps=[RepOut.model_validate(r) for r in session.reps],
        form_issues=[FormIssueOut.model_validate(i) for i in session.form_issues],
    )


@router.post("", response_model=SessionSummaryOut, status_code=status.HTTP_201_CREATED)
def submit_session(
    payload: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionSummaryOut:
    exercise = get_exercise_by_slug(db, payload.exercise_slug)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    score_delta = None
    session = create_session(db, current_user.id, exercise, payload)
    score_delta = get_session_score_delta(db, session)
    return _to_summary(session, score_delta)


@router.get("", response_model=SessionListOut)
def get_sessions(
    exercise: str | None = Query(default=None, description="Filter by exercise slug"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionListOut:
    items, total = list_sessions(db, current_user.id, exercise, limit, offset)
    return SessionListOut(
        items=[
            SessionListItemOut(
                id=s.id,
                exercise_slug=s.exercise.slug,
                exercise_name=s.exercise.name,
                started_at=s.started_at,
                target_reps=s.target_reps,
                completed_reps=s.completed_reps,
                correct_reps=s.correct_reps,
                flagged_reps=s.flagged_reps,
                score=s.score,
            )
            for s in items
        ],
        total=total,
    )


@router.get("/{session_id}", response_model=SessionSummaryOut)
def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionSummaryOut:
    session = get_session_detail(db, current_user.id, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    score_delta = get_session_score_delta(db, session)
    return _to_summary(session, score_delta)
