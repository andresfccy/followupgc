# Project Context

## Product Purpose

FollowUpGC helps a church cell-group leader follow people over time. Attendance
matters, but the deeper product value is a pastoral record: who came, who
missed, why a meeting did not happen, and what has happened in each person's
process.

The app is intentionally local-first. It should remain useful without accounts,
servers, sync, analytics, or network availability.

## Current Scope

- Manage group members and their process status.
- Register weekly group dates as held or cancelled.
- Track attendance for held meetings.
- Keep a chronological timeline per member.
- Configure the regular meeting weekday while allowing church-schedule
  exceptions.

Out of scope unless explicitly requested:

- Backend persistence.
- Authentication.
- Cloud sync.
- Analytics or tracking.
- Multi-page routing complexity.

## Stack

- Vite + React + TypeScript.
- Tailwind CSS v4 through `@tailwindcss/vite`.
- Zustand with persist for browser `localStorage`.
- date-fns for date formatting and weekday calculations.
- lucide-react for icons.
- Zod is installed for future form validation.
- TanStack Router is installed but not wired.

## Product Decisions

- Cancelled meetings are first-class records, not deleted sessions, because
  church-wide activities can explain gaps in attendance history.
- The regular meeting weekday is configurable, but exceptions are explicit
  session records.
- Attendance is captured from the selected session.
- Pastoral notes are captured from the selected member.
- The first UI is a dense operations screen, not a landing page, because this is
  a repeated-use admin tool.

## Verification Expectations

For any behavior change:

```bash
pnpm lint
pnpm build
```

For layout or interaction work, also run `pnpm dev` and manually check the main
flow at mobile and desktop widths.
