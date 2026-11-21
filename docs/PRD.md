# Product Requirements Document

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1     | TODO | Initial PRD |
| 0.2     | 2026-07-21 | Added Section 2: MongoDB Backend Connection |
| 0.3     | 2026-11-20 | Moved feature detail to docs/features/<slug>/; Section 2 is now the Feature Index |
| 0.4     | 2026-11-21 | Overview filled from PROJECT_CONTEXT.md |

---

## 1. Overview

A full-stack workforce management platform built with the MERN stack (MongoDB, Express.js, React, Node.js) that streamlines employee and HR operations: secure JWT authentication, role-based access control (Admin / HR / Employee), employee management, attendance tracking, leave requests, department administration and an analytics dashboard.

Vision, decided stack, roles, the 14-phase build order and feature specs: **[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)**. This PRD indexes each work item's approved requirements.

---

## 2. Feature Index

Each work item's full requirements live with its other lifecycle artifacts in `docs/features/<slug>/`. The `prd-writer` agent adds one row per work item.

| Slug | Feature | Requirements |
|------|---------|--------------|
| mongodb-backend-connection | MongoDB Backend Connection | [requirements](features/mongodb-backend-connection/requirements.md) |

---

<!-- prd-writer: add a Feature Index row per work item; feature detail lives in docs/features/<slug>/requirements.md -->
