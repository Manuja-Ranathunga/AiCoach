from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.exercise import Exercise
from app.models.session import WorkoutSession
from app.schemas.stats import IssueMixItemOut, MostCommonIssueOut, ProgressOut, ProgressPointOut


def get_progress(db: Session, user_id: int, exercise: Exercise, limit: int) -> ProgressOut:
    sessions = list(
        db.scalars(
            select(WorkoutSession)
            .options(selectinload(WorkoutSession.form_issues))
            .where(
                WorkoutSession.user_id == user_id,
                WorkoutSession.exercise_id == exercise.id,
            )
            .order_by(WorkoutSession.started_at.desc())
            .limit(limit)
        )
    )
    sessions.reverse()  # oldest -> newest within the window

    scores = [s.score for s in sessions]
    avg = round(sum(scores) / len(scores)) if scores else None
    best = max(scores) if scores else None
    trend = (scores[-1] - scores[0]) if len(scores) >= 2 else None
    points = [
        ProgressPointOut(date=s.started_at.date(), score=s.score) for s in sessions
    ]

    occurrences_by_issue: dict[str, int] = defaultdict(int)
    label_by_issue: dict[str, str] = {}
    half = max(1, len(sessions) // 2)
    earlier_sessions, later_sessions = sessions[:half], sessions[half:] or sessions[:half]
    earlier_occurrences: dict[str, int] = defaultdict(int)
    later_occurrences: dict[str, int] = defaultdict(int)

    for session in sessions:
        for issue in session.form_issues:
            occurrences_by_issue[issue.issue_key] += issue.occurrences
            label_by_issue[issue.issue_key] = issue.label
    for session in earlier_sessions:
        for issue in session.form_issues:
            earlier_occurrences[issue.issue_key] += issue.occurrences
    for session in later_sessions:
        for issue in session.form_issues:
            later_occurrences[issue.issue_key] += issue.occurrences

    total_occurrences = sum(occurrences_by_issue.values())
    issue_mix = [
        IssueMixItemOut(
            issue_key=key,
            label=label_by_issue[key],
            pct=round(100 * count / total_occurrences) if total_occurrences else 0,
        )
        for key, count in sorted(occurrences_by_issue.items(), key=lambda kv: -kv[1])
    ]

    most_common_issue = None
    if issue_mix:
        top = issue_mix[0]
        earlier_total = sum(earlier_occurrences.values())
        later_total = sum(later_occurrences.values())
        previous_pct = (
            round(100 * earlier_occurrences[top.issue_key] / earlier_total)
            if earlier_total
            else None
        )
        current_pct = (
            round(100 * later_occurrences[top.issue_key] / later_total) if later_total else top.pct
        )
        most_common_issue = MostCommonIssueOut(
            issue_key=top.issue_key,
            label=top.label,
            pct=top.pct,
            description=(
                f"Present in {top.pct}% of flagged reps across the last "
                f"{len(sessions)} session{'s' if len(sessions) != 1 else ''}."
            ),
            previous_pct=previous_pct if previous_pct != current_pct else None,
        )

    return ProgressOut(
        exercise_slug=exercise.slug,
        exercise_name=exercise.name,
        session_count=len(sessions),
        avg=avg,
        best=best,
        trend=trend,
        points=points,
        most_common_issue=most_common_issue,
        issue_mix=issue_mix,
    )
