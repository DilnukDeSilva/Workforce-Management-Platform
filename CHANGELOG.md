# Changelog

All notable changes to this project, newest first. Entries are grouped by UTC date.

## 2026-11-22

### Project setup: database connection, server structure, tests and linting — 04:07 UTC
**Summary:** The backend now connects to its database before taking requests, and automated checks keep the code healthy.
**Details:** The server stops with a clear error if the database is unreachable at start, and keeps running and reporting status if it drops later. The health check shows server and database status in a standard response format. Code follows a standard folder structure with central error handling. 51 automated tests and code-style checks run in one command. Plain-language feature guides were added. No screens or data changes.
**Technical details:** Backend-only change: startup now depends on a successful MongoDB connection, and one public health endpoint reports server and database state. Introduces the standard server layering, a unified API response format and a test and lint quality gate. No user-facing screens, schema changes or deployment changes.

## 2026-11-20

### AI-DLC development lifecycle — 18:17 UTC
**Summary:** The AI assistant now works in clear stages and waits for a person to approve the plan and the release, with safety checks that it cannot skip.
**Details:** Replaces the prose-only pipeline with an AI-Driven Development Lifecycle. Each change is a tracked work item with human approval gates for requirements, design and release. Automatic guardrails block AI commits, self-approval, access to secret files, and code changes before the design is approved. A single `npm run verify` command runs every quality check. A /retro step turns lessons into harness improvements.

