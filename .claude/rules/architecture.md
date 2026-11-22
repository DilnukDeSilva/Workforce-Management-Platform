---
paths:
  - "server/**"
  - "client/**"
  - "docs/features/**/design.md"
  - "docs/features/**/plan.md"
---
# Architecture Rules

Structure and conventions decided in `docs/PROJECT_CONTEXT.md` §3 and §8. Owned by the `architect` agent. Existing code moves into this layout only through plan units, never as drive-by refactors.

## Current state (2026-11-21)
- `server/src/`: entry `server.js` (env → connect DB → listen), `app.js`, `config/{env,db}.js`, health route/controller, `notFound` + `errorHandler`, `utils/ApiError.js`. Tests in `server/tests/` (Jest + supertest).
- Lint/format: ESLint flat config in `server/eslint.config.js`, oxlint in the client, one root Prettier config (`.prettierrc.json`). Run `npm run format` before handing back.
- `client/`: React 19 + Vite default scaffold. No router, API layer or styling system yet.

## Server layout (`server/src/`, CommonJS)
```
server/src/
  server.js            # entry: load env, connect DB, app.listen — nothing else
  app.js               # build the express app: middleware, mount routes, 404 + error handler; exported for tests
  config/              # db.js (Mongoose connection), env.js (read + validate process.env once)
  routes/              # <area>.routes.js: URL + middleware chain → controller
  controllers/         # <area>.controller.js: read validated input, call model/service, send response
  models/              # <Entity>.js: Mongoose schema, indexes, model methods
  middleware/          # auth.js, role.js, validate.js, errorHandler.js, notFound.js
  services/            # optional: only when logic is shared by several controllers or too big for one
  utils/               # ApiError, asyncHandler (if needed), response helpers, token helpers
server/tests/          # mirrors src/: <name>.test.js
```
- Dependency direction: `routes → controllers → (services) → models`. Models never import controllers; routes contain no logic.
- `app.js` never calls `listen()`, so tests drive it with `supertest` without a port.
- Config: read `process.env` only in `config/env.js` (validate required vars at startup, fail loud). Everything else imports from it.

## API conventions
- REST under `/api/<resource>`, plural nouns, standard verbs. Status codes: 200, 201, 204, 400 (validation), 401 (not authenticated), 403 (not allowed), 404, 409 (conflict/duplicate), 500.
- **Response envelope (every endpoint, including health):**
  - success: `{ "success": true, "message": "Human-readable summary", "data": <payload or null> }`
  - failure: `{ "success": false, "message": "Human-readable error", "errors": [{ "field": "email", "message": "..." }] }` (`errors` only for validation)
- Controllers throw `ApiError(status, message, errors?)`. One `errorHandler` middleware turns errors into the failure envelope. Unknown errors → 500 with a generic message (details only in server logs).
- Validate request input in `middleware/validate.js` with a schema before it reaches the controller. Never pass `req.body` objects straight into Mongoose queries.

## Client layout (`client/src/`)
```
components/   reusable UI (Button, Input, ProtectedRoute, Layout)
pages/        one component per route (LoginPage, DashboardPage)
hooks/        custom hooks (useAuth, useFetch)
services/     api.js (one Axios instance + interceptors) and <area>.service.js call wrappers
context/      AuthContext and other app-wide state (Context API; Redux only if truly needed)
utils/  assets/  styles/
```
- Components never call Axios directly; they use `services/` (directly or through a hook).
- Base URL from `import.meta.env.VITE_API_URL`. Routing with React Router; forms with React Hook Form; styling with Tailwind (from the first UI work item).
- Every data-driven screen handles loading, error, empty and success states.

## Decided libraries (still installed per work item, with the user's confirmation)
Server: express, mongoose, dotenv, cors, bcrypt, jsonwebtoken, cookie-parser, zod (validation, pending auth gate), multer + cloudinary (Phase 11). Client: react-router-dom, axios, react-hook-form, tailwindcss, recharts (Phase 9). Tooling: jest, supertest, eslint (+ @eslint/js, globals, eslint-config-prettier), prettier, nodemon, oxlint (client). Anything not on this list is a design decision for the user.
