# Changelog

All notable changes to this project, newest first. Entries are grouped by UTC date.

## 2026-11-20

### AI-DLC development lifecycle — 18:17 UTC
**Summary:** The AI assistant now works in clear stages and waits for a person to approve the plan and the release, with safety checks that it cannot skip.
**Details:** Replaces the prose-only pipeline with an AI-Driven Development Lifecycle. Each change is a tracked work item with human approval gates for requirements, design and release. Automatic guardrails block AI commits, self-approval, access to secret files, and code changes before the design is approved. A single `npm run verify` command runs every quality check. A /retro step turns lessons into harness improvements.

