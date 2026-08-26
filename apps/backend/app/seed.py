from app.db import SessionLocal
from app.models import Exercise
from app.models.exercise import Difficulty, ExerciseStatus

EXERCISES = [
    {
        "name": "Squat",
        "slug": "squat",
        "description": "Bodyweight or loaded squat, tracked for form.",
        "difficulty": Difficulty.beginner,
        "muscle_group": "quads/glutes",
        "status": ExerciseStatus.available,
    },
    {
        "name": "Deadlift",
        "slug": "deadlift",
        "description": "Hip-hinge lift targeting the posterior chain.",
        "difficulty": Difficulty.advanced,
        "muscle_group": "posterior chain",
        "status": ExerciseStatus.coming_soon,
    },
    {
        "name": "Push-up",
        "slug": "push-up",
        "description": "Bodyweight press targeting chest, shoulders, and triceps.",
        "difficulty": Difficulty.intermediate,
        "muscle_group": "chest/triceps",
        "status": ExerciseStatus.coming_soon,
    },
    {
        "name": "Lunge",
        "slug": "lunge",
        "description": "Single-leg step exercise for lower-body strength and balance.",
        "difficulty": Difficulty.intermediate,
        "muscle_group": "legs/balance",
        "status": ExerciseStatus.coming_soon,
    },
    {
        "name": "Shoulder Press",
        "slug": "shoulder-press",
        "description": "Overhead press targeting the shoulders.",
        "difficulty": Difficulty.intermediate,
        "muscle_group": "shoulders",
        "status": ExerciseStatus.coming_soon,
    },
    {
        "name": "Plank",
        "slug": "plank",
        "description": "Isometric hold for core stability.",
        "difficulty": Difficulty.beginner,
        "muscle_group": "core stability",
        "status": ExerciseStatus.coming_soon,
    },
]


def seed() -> None:
    db = SessionLocal()
    try:
        for data in EXERCISES:
            if not db.query(Exercise).filter_by(slug=data["slug"]).first():
                db.add(Exercise(**data))
                print(f"Seeded: {data['name']}")
            else:
                print(f"{data['name']} already seeded, skipping")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
