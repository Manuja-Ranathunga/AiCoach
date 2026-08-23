# AI Workout Coach

A Vite + React app that uses MediaPipe pose detection for real-time squat form checking.

## Layout

This is an npm workspaces monorepo:

```
apps/
  frontend/       # the React + Vite app (@ai-coach/frontend)
packages/
  ml-engine/       # placeholder for extracted pose/ML logic (@ai-coach/ml-engine)
```

`apps/backend` and a `docker-compose.yml` will be added in a later branch.

## Getting started

Install dependencies once from the repo root:

```
npm install
```

Run the dev server:

```
npm run dev
```

Build for production:

```
npm run build
```

Preview a production build:

```
npm run preview
```

All of the above run against `apps/frontend` via npm workspaces.
