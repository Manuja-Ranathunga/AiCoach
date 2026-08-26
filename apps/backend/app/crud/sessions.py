from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.exercise import Exercise
from app.models.session import FormIssue, Rep, WorkoutSession
from app.schemas.session import SessionCreate


def _previous_score(db: Session, user_id: int, exercise_id: int, before) -> int | None:
    return db.scalar(
        select(WorkoutSession.score)
        .where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.exercise_id == exercise_id,
            WorkoutSession.started_at < before,
        )
        .order_by(WorkoutSession.started_at.desc())
        .limit(1)
    )


def create_session(
    db: Session, user_id: int, exercise: Exercise, payload: SessionCreate
) -> WorkoutSession:
    session = WorkoutSession(
        user_id=user_id,
        exercise_id=exercise.id,
        target_reps=payload.target_reps,
        completed_reps=payload.completed_reps,
        correct_reps=payload.correct_reps,
        flagged_reps=payload.flagged_reps,
        score=payload.score,
        duration_seconds=payload.duration_seconds,
        avg_tempo_seconds=payload.avg_tempo_seconds,
        deepest_angle_deg=payload.deepest_angle_deg,
        cues_spoken=payload.cues_spoken,
        started_at=payload.started_at,
        ended_at=payload.ended_at,
        reps=[
            Rep(rep_index=r.rep_index, quality_pct=r.quality_pct, flagged=r.flagged)
            for r in payload.reps
        ],
        form_issues=[
            FormIssue(
                issue_key=i.issue_key,
                label=i.label,
                description=i.description,
                occurrences=i.occurrences,
                rep_indexes=i.rep_indexes,
            )
            for i in payload.form_issues
        ],
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_session_score_delta(db: Session, session: WorkoutSession) -> int | None:
    previous = _previous_score(db, session.user_id, session.exercise_id, session.started_at)
    return None if previous is None else session.score - previous


def get_session_detail(db: Session, user_id: int, session_id: int) -> WorkoutSession | None:
    return db.scalar(
        select(WorkoutSession)
        .options(selectinload(WorkoutSession.reps), selectinload(WorkoutSession.form_issues))
        .where(WorkoutSession.id == session_id, WorkoutSession.user_id == user_id)
    )


def list_sessions(
    db: Session,
    user_id: int,
    exercise_slug: str | None,
    limit: int,
    offset: int,
) -> tuple[list[WorkoutSession], int]:
    query = (
        select(WorkoutSession)
        .join(Exercise)
        .where(WorkoutSession.user_id == user_id)
        .order_by(WorkoutSession.started_at.desc())
    )
    if exercise_slug:
        query = query.where(Exercise.slug == exercise_slug)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = list(db.scalars(query.limit(limit).offset(offset)))
    return items, total
