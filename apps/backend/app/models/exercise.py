import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Difficulty(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class ExerciseStatus(str, enum.Enum):
    available = "available"
    coming_soon = "coming_soon"


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    difficulty: Mapped[Difficulty] = mapped_column(Enum(Difficulty, name="difficulty"), nullable=False)
    muscle_group: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[ExerciseStatus] = mapped_column(
        Enum(ExerciseStatus, name="exercise_status"), nullable=False, default=ExerciseStatus.coming_soon
    )
    required_keypoints: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    default_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
