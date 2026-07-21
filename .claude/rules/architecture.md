# Architecture Rules

## Project Structure

- API endpoints: `server/index.js` — currently a single file, no `/routes` split yet.
- Business logic: not yet separated from route handlers (only one route exists: `GET /api/health`).
- Data access layer: none — no database is configured yet.
- External integrations: none.

As the server grows, split routes/services/models out of `server/index.js` and update this section to describe the actual boundaries.

## Hard Constraints

TODO: no cross-module boundaries exist yet since the backend is a single file. Define constraints here once the codebase grows past that point (e.g. routes must not contain business logic, no direct DB access from route handlers, etc.).
