import uuid

from pydantic import BaseModel, Field


class ExerciseOut(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    description: str
    icon_key: str
    last_score: int | None = None
    best_streak: int | None = None

    model_config = {"from_attributes": True}


class ExerciseSettingsOut(BaseModel):
    target_reps: int
    countdown_seconds: int
    inactivity_timeout_seconds: int
    voice_coaching_enabled: bool

    model_config = {"from_attributes": True}


class ExerciseSettingsUpdate(BaseModel):
    target_reps: int = Field(ge=1, le=200)
    countdown_seconds: int = Field(ge=0, le=30)
    inactivity_timeout_seconds: int = Field(ge=5, le=600)
    voice_coaching_enabled: bool
