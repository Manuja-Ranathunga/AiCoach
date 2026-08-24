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

## Testing auth locally

Via `curl` (or use http://localhost:8000/docs — note the `/auth/login` and `/auth/signup` bodies are raw JSON, not the OAuth2 form the docs page defaults to, so use "Try it out" with a JSON body rather than the Authorize button for login):

```bash
# Sign up (creates a user, returns a token)
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"supersecret123"}'

# Log in (returns a token)
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"supersecret123"}'

# Call the protected route (replace TOKEN with the access_token from above)
curl http://localhost:8000/auth/me \
  -H "Authorization: Bearer TOKEN"

# Logout (stateless — just tells the client to discard the token; the token
# itself remains technically valid until it expires, since there's no
# server-side blocklist yet)
curl -X POST http://localhost:8000/auth/logout
```

Signup/login/logout are rate-limited to 5 requests/minute per IP; a 6th request within a minute returns `429 Too Many Requests`.

`GET /auth/me` is a throwaway route added only to prove the protected-route dependency works — safe to remove once real endpoints exist.

**Production note**: `JWT_SECRET_KEY` defaults to a dev-only value in `app/config.py`. Set a real secret via `.env` (or the environment) before deploying anywhere real.
