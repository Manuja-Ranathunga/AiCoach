from app.db import SessionLocal
from app.models import Exercise


def seed() -> None:
    db = SessionLocal()
    try:
        if not db.query(Exercise).filter_by(name="Squat").first():
            db.add(Exercise(name="Squat", description="Bodyweight or loaded squat, tracked for form."))
            db.commit()
            print("Seeded: Squat")
        else:
            print("Squat already seeded, skipping")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
