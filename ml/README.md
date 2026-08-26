# ml

Reserved for the pose detection / skeleton tracking / model work (kept out of this build on purpose).

Expected integration points once this is filled in:

- **Frontend** (`apps/frontend`): the tracking screen (`src/features/tracking/`) expects something that, given camera frames, can report keypoints, rep counts and form-check results in real time. It currently renders the HUD (rep counter, set-progress ring, voice caption, live skeleton overlay canvas) against placeholder/mock data — see `src/features/tracking/usePoseEngine.js` for the seam to wire a real engine into.
- **Backend** (`apps/backend`): sessions are persisted via `POST /sessions` with a final summary shape (reps, correct/flagged counts, per-rep timeline, detected form issues, score). That schema is defined in `apps/backend/app/schemas/session.py` — whatever this package computes client-side should be mapped into that shape before it's submitted.

Nothing else in the repo imports from this folder yet.
