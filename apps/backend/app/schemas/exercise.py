from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    description: str
    icon_key: str
    last_score: int | None = None
    best_streak: int | None = None
    last_session_at: datetime | None = None
