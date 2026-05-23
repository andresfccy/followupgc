# Testing Strategy

## Current State

There is no test runner configured. The minimum validation is:

```bash
pnpm lint
pnpm build
```

Use `scripts/ai/verify.sh` to run both commands.

## Manual QA

For behavior or UI changes, run `pnpm dev` and check the affected path:

- Add a member.
- Register a held session.
- Register a cancelled session.
- Mark attendance for a held session.
- Confirm attendance controls are hidden for a cancelled session.
- Add a timeline entry for a selected member.
- Change the meeting weekday.

## Zod Guidance

Zod is installed for future form validation but not wired. Add it only when form
rules become non-trivial or shared across more than one place. Keep schema files
near the owning feature or domain area.

## When To Add Automated Tests

Add tests when logic becomes shared, date-sensitive, migration-sensitive, or
hard to verify manually. Do not add a test stack only for documentation changes.
