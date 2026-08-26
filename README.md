# FormSpotter

Real-time exercise form tracking with on-device pose detection. Camera frames
never leave the browser — the backend only stores aggregated session results.

## Stack

- **Frontend** — React + Vite (TypeScript), React Router, TanStack Query, Zustand, axios.
- **Backend** — FastAPI, SQLAlchemy 2.0 (async), Alembic, JWT auth (`python-jose` + `bcrypt`).
- **DB** — PostgreSQL 16 (via Docker Compose).
- **ML** — not included yet; see [`ml/README.md`](ml/README.md). The app runs
  fully end-to-end today against a mock pose engine
  (`frontend/src/lib/pose-engine/mockEngine.ts`) so every screen is already
  wired up — swap that engine out once the real one lands.

## Project layout

```
backend/    FastAPI app, SQLAlchemy models, Alembic migrations, seed script
frontend/   React + Vite app
ml/         Reserved for pose detection / skeleton tracking (see its README)
docker-compose.yml   Postgres for local dev
```

## Running it locally

### 1. Database

```bash
docker compose up -d db
```

Postgres is exposed on **5433** on the host (not 5432) to avoid clashing with
a locally-installed Postgres — see `docker-compose.yml` / `backend/.env.example`.

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env
python -m alembic upgrade head
python -m app.seed             # seeds the exercise catalog (squat, push-up, mountain climbers)
python -m uvicorn app.main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App at `http://localhost:5173`.

## Notes

- Auth is a single long-lived JWT (no refresh flow) — simple by design for a
  personal-use fitness app; revisit if this becomes multi-tenant/production.
- `best_streak` per exercise is computed from stored rep events (longest run
  of consecutive correct reps across a user's sessions for that exercise),
  not stored directly.
- Session `score` is supplied by the client per set (see
  `SessionCreatePayload.score`) — today the mock pose engine estimates it
  client-side; once the real ML engine lands it should own that number.
