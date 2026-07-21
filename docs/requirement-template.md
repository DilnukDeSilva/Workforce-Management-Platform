# Requirement Template

Copy this, fill it in, and hand it to Claude as your feature request (paste it directly in chat, or save it as a file and point Claude at it). It maps directly onto the fields `prd-writer` and `ba-analyst` need — filling it in up front means less back-and-forth and a more accurate PRD/use-cases on the first pass.

You don't need every field for a small feature — leave a field as "N/A" rather than skip it, so it's clear it was considered, not missed.

```markdown
## Feature Name
<short name, e.g. "Time-Off Request Approval">

## Summary
<1-2 sentences: what it does and why it's needed>

## User Story
As a <user type>, I want <action> so that <benefit>.

## Actors / Roles Involved
<who interacts with this — e.g. Employee, Manager, Admin — and what each can/can't do>

## Functional Requirements
1. <specific, testable behavior>
2. <specific, testable behavior>
3. ...

## Non-Functional Requirements
<performance, security, scalability constraints — or "N/A" if none apply yet>

## Acceptance Criteria
- [ ] <verifiable condition for "done">
- [ ] <verifiable condition for "done">

## Affected Areas
- **API endpoints**: <new/modified routes, or "N/A">
- **Database/schema**: <new tables/columns, or "N/A — no DB yet">
- **UI**: <pages/components/flows affected>

## Known Edge Cases / Error Scenarios
<what should happen on invalid input, unauthorized access, empty states, duplicate actions, etc. — list what you already know; ba-analyst will expand this>

## Out of Scope
<explicitly what this feature does NOT include, to prevent scope creep>
```

## Example (filled in)

```markdown
## Feature Name
Time-Off Request Approval

## Summary
Employees submit time-off requests; their manager approves or rejects them.

## User Story
As an employee, I want to request time off so that my manager can review and approve it.
As a manager, I want to approve or reject my reports' time-off requests so that I control team coverage.

## Actors / Roles Involved
- Employee: can submit/view their own requests, cannot approve
- Manager: can approve/reject requests from their direct reports only
- Admin: can view all requests (read-only for now)

## Functional Requirements
1. Employee can submit a request with start date, end date, and reason
2. Manager sees a list of pending requests from their direct reports
3. Manager can approve or reject a request, optionally with a comment
4. Employee is notified of the decision (in-app, not email — no email service yet)
5. Approved requests appear on a simple team calendar view

## Non-Functional Requirements
N/A for v1 — no specific performance/scale targets yet.

## Acceptance Criteria
- [ ] Employee cannot approve their own request
- [ ] Manager cannot approve a request from someone outside their team
- [ ] Rejected requests show the manager's comment to the employee
- [ ] Overlapping approved requests for the same employee are prevented

## Affected Areas
- API endpoints: POST /api/time-off, GET /api/time-off, PATCH /api/time-off/:id
- Database/schema: new `time_off_requests` table (no DB currently configured — this will require picking one first)
- UI: new "Time Off" page, request form, manager approval queue

## Known Edge Cases / Error Scenarios
- Start date after end date
- Requesting time off in the past
- Manager tries to approve a request that's already been approved/rejected
- Employee with no manager assigned

## Out of Scope
- Email notifications
- PTO balance tracking/accrual
- Calendar integration (Google/Outlook)
```
