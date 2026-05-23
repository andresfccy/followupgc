---
name: modify-zustand-store
description: Use when changing persisted Zustand state, store actions, data mutations, storage version, or stored shape.
---

# Modify Zustand Store

## When to use

Use this skill when a task changes `src/store/groupStore.ts`, persisted state,
store actions, mutation behavior, `GroupData`, localStorage compatibility, or
Zustand persist migrations.

## Required context

- `AGENTS.md`
- `docs/ai/architecture.md`
- `docs/ai/domain-model.md`
- `docs/ai/data-persistence.md`
- `docs/ai/security-and-privacy.md`
- `src/store/groupStore.ts`
- `src/domain/types.ts`

## Rules

- Keep persistent mutations inside `src/store/groupStore.ts`.
- Do not mutate `localStorage` from components.
- Preserve compatibility with existing `followupgc-data` when possible.
- Evaluate whether a persist migration is needed before changing stored shape.
- Bump persist version only with a real migration.
- Do not introduce backend services, remote sync, auth, analytics, or another
  state library.
- Keep pastoral data local unless a future task explicitly changes that product
  boundary.

## Steps

1. Identify whether the change is an action change, state shape change, or
   migration.
2. Check `GroupData` and related domain types.
3. Decide if existing localStorage data can still load.
4. Implement the smallest store change.
5. Add a migration only when old persisted data would otherwise break.
6. Update seed data only if a new domain concept needs a development example.
7. Update persistence docs if versioning or migration behavior changes.

## Validation

Run:

```bash
pnpm lint
pnpm build
```

For behavior changes, manually check the affected mutation in the browser and
reload to confirm persistence.

## Handoff update

For significant store work, update:

- `docs/ai/handoff/current-state.md`
- `docs/ai/handoff/next-actions.md`
- `docs/ai/handoff/known-issues.md` if migration or compatibility risk remains.
