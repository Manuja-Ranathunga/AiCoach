from datetime import date

from pydantic import BaseModel


class ProgressPointOut(BaseModel):
    date: date
    score: int


class IssueMixItemOut(BaseModel):
    issue_key: str
    label: str
    pct: int


class MostCommonIssueOut(BaseModel):
    issue_key: str
    label: str
    pct: int
    description: str
    previous_pct: int | None = None


class ProgressOut(BaseModel):
    exercise_slug: str
    exercise_name: str
    session_count: int
    avg: int | None
    best: int | None
    trend: int | None
    points: list[ProgressPointOut]
    most_common_issue: MostCommonIssueOut | None
    issue_mix: list[IssueMixItemOut]
