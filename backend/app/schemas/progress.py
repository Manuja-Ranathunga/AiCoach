from datetime import datetime

from pydantic import BaseModel


class ScorePoint(BaseModel):
    date: datetime
    score: int


class IssueMixEntry(BaseModel):
    label: str
    percentage: float


class MostCommonMistake(BaseModel):
    label: str
    detail: str
    percentage: float
    previous_percentage: float | None = None


class ProgressOut(BaseModel):
    exercise_slug: str
    sessions_counted: int
    avg_score: int | None
    best_score: int | None
    trend: int | None
    points: list[ScorePoint]
    most_common_mistake: MostCommonMistake | None
    issue_mix: list[IssueMixEntry]
