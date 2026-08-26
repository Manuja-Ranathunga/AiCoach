import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class FormIssueIn(BaseModel):
    issue_type: str
    label: str
    detail: str = ""
    occurrences: int = 0
    rep_numbers: list[int] = Field(default_factory=list)


class FormIssueOut(FormIssueIn):
    model_config = {"from_attributes": True}


class RepEventIn(BaseModel):
    rep_index: int
    correct: bool
    quality: float = 1.0
    tempo_seconds: float | None = None


class RepEventOut(RepEventIn):
    model_config = {"from_attributes": True}


class SessionCreate(BaseModel):
    exercise_id: uuid.UUID
    target_reps: int = Field(ge=1)
    reps_completed: int = Field(ge=0)
    reps_correct: int = Field(ge=0)
    reps_flagged: int = Field(ge=0)
    score: int = Field(ge=0, le=100)
    duration_seconds: int = Field(ge=0)
    avg_tempo_seconds: float = 0
    deepest_angle_degrees: float | None = None
    cues_spoken_count: int = 0
    discarded: bool = False
    form_issues: list[FormIssueIn] = Field(default_factory=list)
    rep_events: list[RepEventIn] = Field(default_factory=list)


class ExerciseRef(BaseModel):
    id: uuid.UUID
    slug: str
    name: str

    model_config = {"from_attributes": True}


class SessionListItem(BaseModel):
    id: uuid.UUID
    started_at: datetime
    exercise: ExerciseRef
    target_reps: int
    reps_completed: int
    reps_correct: int
    reps_flagged: int
    score: int

    model_config = {"from_attributes": True}


class SessionDetail(SessionListItem):
    duration_seconds: int
    avg_tempo_seconds: float
    deepest_angle_degrees: float | None
    cues_spoken_count: int
    form_issues: list[FormIssueOut]
    rep_events: list[RepEventOut]
    score_delta: int | None = None


class SessionHistoryPage(BaseModel):
    items: list[SessionListItem]
    total: int
