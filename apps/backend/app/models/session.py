from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"), index=True)

    target_reps: Mapped[int] = mapped_column(Integer)
    completed_reps: Mapped[int] = mapped_column(Integer)
    correct_reps: Mapped[int] = mapped_column(Integer)
    flagged_reps: Mapped[int] = mapped_column(Integer)
    score: Mapped[int] = mapped_column(Integer)
    duration_seconds: Mapped[int] = mapped_column(Integer)
    avg_tempo_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    deepest_angle_deg: Mapped[float | None] = mapped_column(Float, nullable=True)
    cues_spoken: Mapped[int] = mapped_column(Integer, default=0)

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship(back_populates="sessions")
    exercise: Mapped["Exercise"] = relationship(back_populates="sessions")
    reps: Mapped[list["Rep"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="Rep.rep_index"
    )
    form_issues: Mapped[list["FormIssue"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class Rep(Base):
    __tablename__ = "reps"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("workout_sessions.id", ondelete="CASCADE"), index=True
    )
    rep_index: Mapped[int] = mapped_column(Integer)
    quality_pct: Mapped[int] = mapped_column(Integer)
    flagged: Mapped[bool] = mapped_column(Boolean, default=False)

    session: Mapped["WorkoutSession"] = relationship(back_populates="reps")


class FormIssue(Base):
    __tablename__ = "form_issues"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("workout_sessions.id", ondelete="CASCADE"), index=True
    )
    issue_key: Mapped[str] = mapped_column(String(64))
    label: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(String(255), default="")
    occurrences: Mapped[int] = mapped_column(Integer, default=0)
    rep_indexes: Mapped[list[int]] = mapped_column(JSON, default=list)

    session: Mapped["WorkoutSession"] = relationship(back_populates="form_issues")
