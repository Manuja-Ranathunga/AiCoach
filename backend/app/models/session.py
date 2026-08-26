import uuid
from datetime import datetime

from sqlalchemy import ARRAY, Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exercise_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False, index=True)

    target_reps: Mapped[int] = mapped_column(Integer, nullable=False)
    reps_completed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reps_correct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reps_flagged: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_tempo_seconds: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    deepest_angle_degrees: Mapped[float | None] = mapped_column(Float, nullable=True)
    cues_spoken_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    discarded: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="sessions")
    exercise: Mapped["Exercise"] = relationship()
    form_issues: Mapped[list["FormIssue"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    rep_events: Mapped[list["RepEvent"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="RepEvent.rep_index"
    )


class FormIssue(Base):
    """Aggregated count of a specific form mistake within one session."""

    __tablename__ = "form_issues"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workout_sessions.id", ondelete="CASCADE"), nullable=False, index=True)

    issue_type: Mapped[str] = mapped_column(String(60), nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    detail: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    occurrences: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rep_numbers: Mapped[list[int]] = mapped_column(ARRAY(Integer), nullable=False, default=list)

    session: Mapped["WorkoutSession"] = relationship(back_populates="form_issues")


class RepEvent(Base):
    """One completed rep within a session, used to render the rep timeline."""

    __tablename__ = "rep_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workout_sessions.id", ondelete="CASCADE"), nullable=False, index=True)

    rep_index: Mapped[int] = mapped_column(Integer, nullable=False)
    correct: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    quality: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    tempo_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)

    session: Mapped["WorkoutSession"] = relationship(back_populates="rep_events")
