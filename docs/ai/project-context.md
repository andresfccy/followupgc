# Project Context

## Purpose

The app helps a church cell-group leader follow people over time. Attendance is important, but the deeper goal is a pastoral record: who came, who missed, why a meeting did not happen, and what has happened in each person's process.

## Core domain

- `Member`: a person in the group.
- `GroupSession`: a scheduled cell-group date. It may be `held` or `cancelled`.
- `AttendanceRecord`: one person's attendance result for a held session.
- `TimelineEntry`: a chronological note for a member's process.
- `GroupSettings`: group-level parameters, currently the regular meeting weekday and group name.

## Current data policy

Data is local-first and stored in browser `localStorage` through Zustand persist. This is intentional for the first iteration because it avoids premature backend choices while preserving clear domain boundaries.

When a backend is introduced, keep the type names stable and move persistence behind repository-style functions rather than spreading API calls through components.

## Product decisions

- Cancelled meetings are first-class records, not deleted sessions, because church-wide activities can explain gaps in attendance history.
- The regular meeting weekday is configurable, but exceptions are explicit session records.
- Attendance is captured from the selected session, while process notes are captured from the selected member.
- The first UI is a dense operations screen instead of a landing page because the app is a repeated-use admin tool.

## Verification expectations

For any change touching behavior:

- `pnpm lint`
- `pnpm build`
- Manual browser check through `pnpm dev` for layout or interaction work.
