# AI Workout Coach

A Vite + React app that uses MediaPipe pose detection for real-time squat form checking.

## Layout

This is an npm workspaces monorepo:

```
apps/
  frontend/       # the React + Vite app (@ai-coach/frontend)
packages/
  ml-engine/       # pose/rep/form logic, framework-free (@ai-coach/ml-engine)
    src/core/       # pure logic — runs headlessly in plain Node
    src/runtime/     # browser APIs (canvas drawing, speech synthesis), no React
```

`@ai-coach/frontend` depends on `@ai-coach/ml-engine` via the workspace and
imports it only as `@ai-coach/ml-engine` — never via a deep internal path.

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

Run the `@ai-coach/ml-engine` unit tests:

```
npm test
```
