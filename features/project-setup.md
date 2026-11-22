# Project setup

> Phase 1 · work item: [`mongodb-backend-connection`](../docs/features/mongodb-backend-connection/) · status: built and tested, awaiting release

## What it does
It sets up the foundation every later feature builds on: a React frontend, an Express backend that connects to MongoDB before it accepts requests, one consistent API response format, central error handling, automated tests, and linting/formatting. There are no user-facing features yet. The only endpoint is a health check that shows whether the server and database are up.

## How it works

```mermaid
flowchart LR
  A[npm run dev:server] --> B[src/server.js]
  B -->|1. load server/.env| C[dotenv]
  B -->|2. getEnv| D[config/env.js]
  B -->|3. connectDB| E[config/db.js] --> F[(MongoDB)]
  B -->|4. listen| G[src/app.js]
  G --> H[/api/health] --> I[health.controller.js] -->|getDbStatus| E
  G --> J[notFound → errorHandler]
```

1. **Start.** `src/server.js` loads `server/.env` with dotenv.
2. **Read config.** `config/env.js` is the only file that reads `process.env`. If `MONGODB_URI` is missing or empty, it throws an error that tells you to copy `server/.env.example`.
3. **Connect.** `config/db.js` calls `mongoose.connect` with a 5-second timeout. If that fails, the server logs a clear error (password hidden) and exits with code 1. It never runs half-working.
4. **Listen.** Only after the database is connected does the app start accepting requests.
5. **At runtime.** If MongoDB drops later, the server keeps running, logs `MongoDB disconnected`, and the health check reports `"db": "disconnected"` until it reconnects.
6. **Errors.** Any route can throw `new ApiError(status, message)`. One `errorHandler` turns every error into the same JSON shape. Unknown URLs get a 404, and unexpected bugs get a generic 500 with no stack trace in the response.

## Files
| File | Responsibility |
|---|---|
| `server/src/server.js` | Entry point: env → connect DB → listen. Exits 1 if startup fails. |
| `server/src/app.js` | Builds the Express app (CORS, JSON body, routes, 404, error handler). Never calls `listen`, so tests can use it. |
| `server/src/config/env.js` | Reads and validates environment variables (`PORT` defaults to 5000; `MONGODB_URI` is required). |
| `server/src/config/db.js` | `connectDB`, `getDbStatus`, `redactUri`; registers connection event logs once. |
| `server/src/routes/health.routes.js` | Maps `GET /api/health` to the controller. |
| `server/src/controllers/health.controller.js` | Builds the health response. |
| `server/src/middleware/notFound.js` | Turns an unmatched URL into a 404 `ApiError`. |
| `server/src/middleware/errorHandler.js` | The one place errors become JSON responses. |
| `server/src/utils/ApiError.js` | An `Error` that carries an HTTP status (and optional field errors). |
| `server/tests/*.test.js` | 51 Jest + supertest tests (no real database needed). |
| `server/.env.example` | Documents `PORT` and `MONGODB_URI`. Copy it to `server/.env`, which is never committed. |
| `server/eslint.config.js`, `.prettierrc.json` | Lint rules (server) and code formatting (whole repo). |

## API
Every response uses one envelope:

```json
{ "success": true,  "message": "…", "data": { } }
{ "success": false, "message": "…", "errors": [{ "field": "email", "message": "…" }] }
```

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/api/health` | public | `200 { success: true, message: "Service healthy", data: { status: "ok", db: "connected" \| "disconnected" } }` |
| any | unknown path | public | `404 { success: false, message: "Route not found: GET /x" }` |

## How to run and test it
```bash
npm install
cp server/.env.example server/.env    # set MONGODB_URI (local or Atlas)
npm run dev                           # client :5173, server :5000
curl localhost:5000/api/health        # → data.db: "connected"
```

```bash
npm test --workspace server           # 51 tests
npm run lint --workspace server       # ESLint
npm run format                        # Prettier rewrites client + server code
npm run verify                        # everything above + client lint/build + harness checks
```

## Design decisions
- **Fail at startup, survive at runtime.** A database that's unreachable at boot means the config is wrong, so the server exits loudly. A blip later is an outage the app should survive and report.
- **`app.js` is separate from `server.js`.** Tests import the app and call it with supertest without opening a port or connecting to a real database.
- **Only `server.js` may call `process.exit`.** `db.js` rejects with an error instead, so it stays unit-testable and the entry point decides what happens.
- **One response envelope plus a central error handler.** The frontend handles every response the same way, and error formatting lives in one file.
- **Credentials never reach the logs.** `redactUri` turns `mongodb+srv://user:pass@host` into `mongodb+srv://***@host`.
- **The health check returns 200 even when the DB is down.** Its job is to *report* the status. Monitoring reads `data.db`.

## What to understand (interview prep)
- **Why connect before `listen`?** So the server never accepts requests it can't serve. A broken config shows up immediately instead of on the first user request.
- **What is `mongoose.connection.readyState`?** 0 disconnected, 1 connected, 2 connecting, 3 disconnecting. Only 1 counts as connected.
- **How does Express know a function is an error handler?** It has four parameters `(err, req, res, next)`, which is why the unused `next` stays.
- **Do you need `try/catch` or an `asyncHandler` in async routes?** Not in Express 5: a rejected promise is forwarded to the error handler automatically.
- **How do you test a server without a database?** Mock `mongoose.connect`, drive `readyState`, and use supertest on the exported app. The `require.main === module` guard stops `server.js` from starting when a test requires it.
- **ESLint vs Prettier?** ESLint finds likely bugs (it caught a dropped error `cause` here). Prettier only formats. `eslint-config-prettier` stops the two from fighting.

## Not included yet
No database models or collections, no authentication, no frontend pages (the client is still the Vite starter). Those arrive in Phase 2 onward.
