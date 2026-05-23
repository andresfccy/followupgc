---
name: refactor-component
description: Use when splitting, simplifying, or reorganizing React components without changing behavior.
---

# Refactor Component

## When to use

Use this skill when a task asks to extract components, reduce `App.tsx`
complexity, reorganize feature UI, simplify props, or improve component
structure while preserving behavior.

## Required context

- `AGENTS.md`
- `docs/ai/component-graph.md`
- `docs/ai/ui-guidelines.md`
- `docs/ai/accessibility.md`
- The component file being changed.

## Rules

- Preserve behavior and visible copy unless the task asks otherwise.
- Keep components small, focused, and task-specific.
- Avoid global abstractions until at least two real use cases exist.
- Prefer feature folders for domain-specific UI.
- Keep store mutations in `src/store/groupStore.ts`.
- Preserve accessibility: labels, focus states, text statuses, and keyboard
  order.
- Preserve pastoral domain vocabulary.

## Steps

1. Identify the component responsibility to extract or simplify.
2. Confirm the refactor has a clear ownership benefit.
3. Move only cohesive markup and logic.
4. Type props explicitly.
5. Keep local UI state near the interaction that owns it.
6. Recheck imports and dependency direction.
7. Update `docs/ai/component-graph.md` if ownership changes.

## Validation

Run:

```bash
pnpm lint
pnpm build
```

For visual refactors, run `pnpm dev` and compare the affected screen manually.

## Handoff update

For significant refactors, update:

- `docs/ai/handoff/current-state.md`
- `docs/ai/handoff/next-actions.md`
- `docs/ai/handoff/known-issues.md` only for new UI or accessibility issues.
