# Security Rules

This is a greenfield project — most of the concerns below don't have an established policy yet because the surface area doesn't exist. This section is an interim baseline, not a completed checklist; update it as each concern becomes real.

- Auth/authorization: no auth or session system exists yet. Once added, document the approach here and require it on every non-public route.
- Input validation: no user input is accepted yet (only `GET /api/health`). Once endpoints accept input, require validation at the route boundary.
- Database: none configured, so no query-injection surface yet. When a DB is added, require a query builder/ORM — no raw string-concatenated SQL.
- Secrets: none in use today. `.env` is gitignored in preparation for when they're introduced; never commit real secrets.
- CORS: `cors` middleware is enabled with default (permissive, allow-all-origins) config in `server/index.js`. TODO: lock down allowed origins before any production deployment.
- Webhooks: none exist yet.
