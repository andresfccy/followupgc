# Project Context

## Product Purpose

FollowUpGC helps a church cell-group leader follow people over time. Attendance
matters, but the deeper product value is a pastoral record: who came, who
missed, why a meeting did not happen, and what has happened in each person's
process.

The app now uses Firebase as the production persistence layer. It should remain
private, simple, and maintainable, but production data depends on Firebase Auth,
Firestore, Storage, and Cloud Functions.

## Current Scope

- Manage group members and their process status.
- Register weekly group dates as held or cancelled.
- Track attendance for held meetings.
- Keep a chronological timeline per member.
- Configure the regular meeting weekday while allowing church-schedule
  exceptions.

Out of scope unless explicitly requested:

- Analytics or tracking.
- Multi-page routing complexity.

## Stack

- Vite + React + TypeScript.
- Tailwind CSS v4 through `@tailwindcss/vite`.
- Firebase Auth, Firestore, Storage, and Cloud Functions.
- date-fns for date formatting and weekday calculations.
- lucide-react for icons.
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
- Legacy localStorage/demo data is not production data and must not be migrated
  to Firestore.

## Verification Expectations

For any behavior change:

```bash
pnpm lint
pnpm build
```

For layout or interaction work, also run `pnpm dev` and manually check the main
flow at mobile and desktop widths.
