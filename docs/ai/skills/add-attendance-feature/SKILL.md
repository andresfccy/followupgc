---
name: add-attendance-feature
description: Use when adding, changing, or reviewing attendance-related behavior, state, or UI.
---

# Add Attendance Feature

## When to use

Use this skill for features or reviews involving attendance records, attendance
status, held versus cancelled meetings, attendance UI, or attendance
persistence.

## Required context

- `AGENTS.md`
- `docs/ai/project-context.md`
- `docs/ai/domain-model.md`
- `docs/ai/data-persistence.md`
- `docs/ai/ui-guidelines.md`
- `src/domain/types.ts`
- `src/store/groupStore.ts` if persistence changes.

## Rules

- Attendance belongs to a member and a session.
- Attendance should only be recorded for sessions with `status: 'held'`.
- Cancelled sessions must remain visible as history but must not request
  attendance.
- Keep attendance consistent when members or sessions already exist.
- Keep mutations in the Zustand store.
- Keep UI clear enough for repeated weekly use.

## Steps

1. Identify the attendance scenario: record, edit, display, summarize, or
   review.
2. Check whether the change affects domain types or only UI behavior.
3. Preserve the held/cancelled session distinction.
4. Implement the smallest state or UI change in the owner file.
5. If store shape changes, apply `modify-zustand-store`.
6. If form validation changes, apply `add-zod-validation`.
7. Manually verify attendance on a held session and a cancelled session.

## Validation

Run:

```bash
pnpm lint
pnpm build
```

Manual checks:

- Held session allows attendance.
- Cancelled session does not show attendance controls.
- Existing members remain selectable.
- Reload preserves attendance data.

## Handoff update

For significant attendance work, update:

- `docs/ai/handoff/current-state.md`
- `docs/ai/handoff/next-actions.md`
- `docs/ai/handoff/known-issues.md` if attendance consistency risk remains.
