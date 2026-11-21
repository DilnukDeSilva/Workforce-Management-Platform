---
paths:
  - "server/**"
  - "client/src/**"
  - "**/.env.example"
  - "docs/features/**/design.md"
---
# Security Rules

Partly hook-enforced (secret files, git). Auth defaults come from `docs/PROJECT_CONTEXT.md` §7 (★ recommendations) and become binding when the `auth` work item's design is approved.

## Always
- **Secrets:** only in `server/.env` (gitignored; agents never read it). Every variable documented in `server/.env.example` with placeholders. Never log connection strings or tokens; redact credentials (`mongodb+srv://***@host`).
- **Input:** validate every request field at the route boundary (type, length, format, enum); reject unknown fields; validate ObjectIds before queries.
- **NoSQL injection:** build Mongoose filters from validated scalars only; never accept `$`-prefixed keys from users.
- **Errors:** failure envelope only (`architecture.md`). No stack traces, driver errors, or internal details in responses.
- **CORS:** permissive today; from the auth work item on, allow only `CLIENT_URL` with `credentials: true` (needed for the refresh cookie).
- **Dependencies:** new packages need the user's confirmation (hook asks); prefer the decided list in `architecture.md`.

## Authentication (Phase 2 onward)
- Passwords: `bcrypt` hash (cost ≥ 10) before save; `passwordHash` has `select: false` and never appears in any response.
- Access token: JWT, ~15 min, sent as `Authorization: Bearer <token>`, kept **in memory** on the client (not localStorage: XSS).
- Refresh token: ~7 days, in an **httpOnly, secure (in production), sameSite** cookie scoped to the refresh path; stored **hashed** on the user so a DB leak can't be replayed; rotated on every refresh; cleared on logout.
- `role` is always set by the server (default `employee`); ignore any `role` in register requests.
- Login failures return one generic message, "Invalid email or password", whether the email or the password was wrong.
- Logout is idempotent: logging out twice returns success.
- Auth middleware: missing/invalid/expired token → 401 with the failure envelope; valid → `req.user = { id, role }`.

## Authorization (Phase 3 onward)
- Role middleware after auth middleware; 403 for an authenticated user with the wrong role. Object-level checks (an employee can see only their own records) live in controllers/services and are tested.
