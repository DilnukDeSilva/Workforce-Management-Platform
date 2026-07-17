# Workforce Management Platform

Full-stack app with a React (Vite) frontend and a Node/Express backend, managed as an npm workspaces monorepo.

## Structure

```
.
├── client/   # React frontend (Vite)
└── server/   # Node/Express backend
```

## Setup

```bash
npm install
```

This installs dependencies for both `client` and `server` via npm workspaces.

## Development

Run both frontend and backend together:

```bash
npm run dev
```

Or individually:

```bash
npm run dev:client   # http://localhost:5173
npm run dev:server   # http://localhost:5000
```

## Backend API

- `GET /api/health` — health check endpoint
