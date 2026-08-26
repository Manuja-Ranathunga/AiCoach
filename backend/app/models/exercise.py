import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint, func, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    icon_key: Mapped[str] = mapped_column(String(60), nullable=False, default="generic")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    settings: Mapped[list["ExerciseSettings"]] = relationship(back_populates="exercise")


class ExerciseSettings(Base):
    """Per-user, per-exercise session defaults (carried forward from the last run)."""

    __tablename__ = "exercise_settings"
    __table_args__ = (UniqueConstraint("user_id", "exercise_id", name="uq_exercise_settings_user_exercise"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exercise_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False)

    target_reps: Mapped[int] = mapped_column(Integer, nullable=False, default=12)
    countdown_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    inactivity_timeout_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    voice_coaching_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="exercise_settings")
    exercise: Mapped["Exercise"] = relationship(back_populates="settings")
