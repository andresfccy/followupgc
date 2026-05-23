---
name: review-local-first-change
description: Use to review changes affecting localStorage, Zustand persist, privacy, offline behavior, or persisted data shape.
---

# Review Local-First Change

## When to use

Use this skill for code review or risk review of changes that affect
localStorage, Zustand persist, stored domain shape, migrations, privacy,
offline-first behavior, exports/imports, or any possible remote data flow.

## Required context

- `AGENTS.md`
- `docs/ai/architecture.md`
- `docs/ai/domain-model.md`
- `docs/ai/data-persistence.md`
- `docs/ai/security-and-privacy.md`
- Changed files only.

## Rules

- Review as a risk assessment, not a rewrite plan.
- Classify risk as `low`, `medium`, or `high`.
- Prioritize privacy leaks, data loss, migration breaks, and local-first
  boundary violations.
- Do not require backend, auth, or sync as a fix.
- Keep optional improvements separate from required fixes.

## Steps

1. List files reviewed.
2. Identify whether persisted shape or storage key/version changed.
3. Check for direct `localStorage` access outside the store.
4. Check for remote data flow, analytics, or logging of pastoral data.
5. Check offline behavior and reload compatibility.
6. Produce required fixes and optional improvements.

## Validation

When practical, run:

```bash
pnpm lint
pnpm build
```

If commands are not run, state that clearly.

## Handoff update

If the review reveals new risks, update:

- `docs/ai/handoff/known-issues.md`
- `docs/ai/handoff/next-actions.md`

## Output format

```md
Risk level: low | medium | high

Files reviewed:
- ...

Problems found:
- ...

Required fixes:
- ...

Optional improvements:
- ...
```
