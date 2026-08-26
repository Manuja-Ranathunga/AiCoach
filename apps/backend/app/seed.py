"""Seed the exercise catalog. Safe to run multiple times (upserts by slug)."""

from app.database import SessionLocal
from app.models.exercise import Exercise

EXERCISES = [
    dict(
        slug="squat",
        name="Squat",
        description="Knee & hip angle, depth",
        icon_key="squat",
        sort_order=1,
    ),
    dict(
        slug="pushup",
        name="Push-up",
        description="Elbow angle, hip alignment",
        icon_key="pushup",
        sort_order=2,
    ),
    dict(
        slug="mountain_climbers",
        name="Mountain Climbers",
        description="Cadence, hip height",
        icon_key="mountain_climbers",
        sort_order=3,
    ),
]


def seed() -> None:
    db = SessionLocal()
    try:
        existing = {e.slug: e for e in db.query(Exercise).all()}
        for data in EXERCISES:
            if data["slug"] in existing:
                exercise = existing[data["slug"]]
                for key, value in data.items():
                    setattr(exercise, key, value)
            else:
                db.add(Exercise(**data))
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
