from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RepIn(BaseModel):
    rep_index: int
    quality_pct: int = Field(ge=0, le=100)
    flagged: bool = False


class FormIssueIn(BaseModel):
    issue_key: str
    label: str
    description: str = ""
    occurrences: int = 0
    rep_indexes: list[int] = Field(default_factory=list)


class SessionCreate(BaseModel):
    exercise_slug: str
    target_reps: int = Field(ge=1)
    completed_reps: int = Field(ge=0)
    correct_reps: int = Field(ge=0)
    flagged_reps: int = Field(ge=0)
    score: int = Field(ge=0, le=100)
    duration_seconds: int = Field(ge=0)
    avg_tempo_seconds: float | None = None
    deepest_angle_deg: float | None = None
    cues_spoken: int = 0
    started_at: datetime
    ended_at: datetime
    reps: list[RepIn] = Field(default_factory=list)
    form_issues: list[FormIssueIn] = Field(default_factory=list)


class RepOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rep_index: int
    quality_pct: int
    flagged: bool


class FormIssueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    issue_key: str
    label: str
    description: str
    occurrences: int
    rep_indexes: list[int]


class SessionListItemOut(BaseModel):
    id: int
    exercise_slug: str
    exercise_name: str
    started_at: datetime
    target_reps: int
    completed_reps: int
    correct_reps: int
    flagged_reps: int
    score: int


class SessionListOut(BaseModel):
    items: list[SessionListItemOut]
    total: int


class SessionSummaryOut(BaseModel):
    id: int
    exercise_slug: str
    exercise_name: str
    started_at: datetime
    ended_at: datetime
    target_reps: int
    completed_reps: int
    correct_reps: int
    flagged_reps: int
    score: int
    score_delta: int | None = None
    duration_seconds: int
    avg_tempo_seconds: float | None
    deepest_angle_deg: float | None
    cues_spoken: int
    reps: list[RepOut]
    form_issues: list[FormIssueOut]
