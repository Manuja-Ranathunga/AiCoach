# AiCoach Backend

FastAPI backend for AiCoach. Separate Python project, not part of the npm workspace.

## Run locally

From `apps/backend`:

```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux

docker compose up -d         # starts Postgres on localhost:5433
alembic upgrade head         # creates users/exercises tables
python -m app.seed           # seeds the "Squat" exercise

uvicorn app.main:app --reload --port 8000
```

Verify: open http://localhost:8000/health — should return `{"status": "ok"}`.

Note: Postgres is mapped to host port **5433**, not the default 5432 — this machine already has a native Postgres service bound to 5432, so the container avoids the conflict. If you don't have a conflicting local Postgres, you can change the port mapping back in `docker-compose.yml` and `.env`.
