# AiCoach Backend

FastAPI backend for AiCoach. Separate Python project, not part of the npm workspace.

## Run locally

From `apps/backend`:

```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

Verify: open http://localhost:8000/health — should return `{"status": "ok"}`.
