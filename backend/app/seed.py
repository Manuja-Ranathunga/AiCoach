"""Seed reference data (the fixed exercise catalog). Safe to run repeatedly."""

import asyncio

from sqlalchemy import select

from app.database import async_session_maker
from app.models.exercise import Exercise

EXERCISES = [
    {
        "slug": "squat",
        "name": "Squat",
        "description": "Knee & hip angle, depth",
        "icon_key": "squat",
        "sort_order": 0,
    },
    {
        "slug": "push-up",
        "name": "Push-up",
        "description": "Elbow angle, hip alignment",
        "icon_key": "push-up",
        "sort_order": 1,
    },
    {
        "slug": "mountain-climbers",
        "name": "Mountain Climbers",
        "description": "Cadence, hip height",
        "icon_key": "mountain-climbers",
        "sort_order": 2,
    },
]


async def seed() -> None:
    async with async_session_maker() as db:
        for data in EXERCISES:
            existing = await db.scalar(select(Exercise).where(Exercise.slug == data["slug"]))
            if existing is None:
                db.add(Exercise(**data))
        await db.commit()
    print(f"Seeded {len(EXERCISES)} exercises.")


if __name__ == "__main__":
    asyncio.run(seed())
