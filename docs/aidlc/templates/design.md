<!-- aidlc:template -->
# Design: <feature name>

> Inception · owner: `architect` · sources: [requirements](requirements.md), [use cases](use-cases.md), `.claude/rules/architecture.md`.

## Verdict
**PASS | FAIL** — <one line>

## Component design
<which layers change (`server/src` routes → controllers → (services) → models; client pages → hooks → services), new modules, dependency direction. A small mermaid diagram if it clarifies.>

## API contract
| Method | Path | Auth | Request | Success (`{ success, message, data }`) | Errors (`{ success: false, message, errors? }`) |
|---|---|---|---|---|---|

## Data model
<Mongoose schemas, fields, validation, indexes, migration/backfill — or "none">

## Decisions (ADR-lite)
### D1: <decision>
- **Context:** · **Options:** · **Chosen:** · **Consequences:** · **Interview one-liner:** <how the owner would explain this choice in one sentence>

## Risks & security notes
- <threat / failure mode> → <mitigation> → <unit that implements it>

## Structural action items
- [STRUCTURAL] <only if boundaries must move>
