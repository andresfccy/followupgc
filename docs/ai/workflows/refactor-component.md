# Workflow: Refactor Component

## Purpose

Use this workflow to coordinate component refactors. For the actual refactor
rules, use the component refactor skill.

## Read First

1. `AGENTS.md`
2. `docs/ai/architecture.md`
3. `docs/ai/component-graph.md`
4. `docs/ai/skills/refactor-component/SKILL.md`

## Process

1. Confirm the task is structural and should not change behavior.
2. Load only additional base docs needed by the component area.
3. Apply `docs/ai/skills/refactor-component/SKILL.md`.
4. Update `docs/ai/component-graph.md` if ownership changes.

## Validate

```bash
pnpm lint
pnpm build
```

For visual refactors, run `pnpm dev` and compare the affected screen manually.
