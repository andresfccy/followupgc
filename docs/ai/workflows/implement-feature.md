# Workflow: Implement Feature

## Purpose

Use this workflow to coordinate feature work before selecting the most specific
skill.

If the feature request is informal, incomplete, or ambiguous, use
`docs/ai/skills/feature-intake/SKILL.md` first. Its output should become the
input for this workflow.

## Read First

1. `AGENTS.md`
2. `docs/ai/project-context.md`
3. `docs/ai/architecture.md`
4. The focused base doc for the area you will touch.

## Consider Skills

- Feature intake: `docs/ai/skills/feature-intake/SKILL.md`
- Attendance: `docs/ai/skills/add-attendance-feature/SKILL.md`
- Pastoral notes/timeline:
  `docs/ai/skills/add-pastoral-note-feature/SKILL.md`
- Persisted state: `docs/ai/skills/modify-zustand-store/SKILL.md`
- Form validation: `docs/ai/skills/add-zod-validation/SKILL.md`
- Component extraction: `docs/ai/skills/refactor-component/SKILL.md`

Load only the matching skill.

## Process

1. Use feature intake first if the request needs structure.
2. Identify the feature area and owner files.
3. Open the relevant implementation skill if one matches.
4. Make the smallest coherent change.
5. Update docs only when ownership, workflow, or behavior guidance changes.
6. Update handoff for significant work.

## Do Not Touch

- Backend, auth, cloud sync, analytics, or routing unless the feature explicitly
  requires it.
- Global abstractions before there are at least two real use cases.

## Validate

```bash
pnpm lint
pnpm build
```

For UI work, also run `pnpm dev` and check the affected flow.

## Handoff

Follow the selected skill's handoff instructions. If no skill applies, update
`docs/ai/handoff/current-state.md` and `docs/ai/handoff/next-actions.md`.
