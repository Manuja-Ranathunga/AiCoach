from pydantic import BaseModel, ConfigDict

from app.models.exercise import Difficulty, ExerciseStatus


class ExerciseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str | None
    difficulty: Difficulty
    muscle_group: str
    status: ExerciseStatus
