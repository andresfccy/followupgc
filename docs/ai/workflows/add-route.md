# Workflow: Add Route

## Purpose

Use this workflow only when routing is explicitly requested or route-level
complexity is clearly justified.

## Read First

1. `AGENTS.md`
2. `docs/ai/routing-strategy.md`
3. `docs/ai/architecture.md`
4. `docs/ai/component-graph.md`

## Consider Skills

- Component extraction during routing:
  `docs/ai/skills/refactor-component/SKILL.md`
- Local-first risk review if URL/state persistence changes:
  `docs/ai/skills/review-local-first-change/SKILL.md`

## Gate

Do not add routing unless the task explicitly asks for a route or the product
need clearly requires separate route-level screens.

## Rules

- Use TanStack Router because it is already installed.
- Keep existing single-screen behavior intact unless replacement is requested.
- Do not add route-level remote loading.
- Keep routes typed and minimal.
- Update docs after changing ownership.

## Validate

```bash
pnpm lint
pnpm build
```

Run `pnpm dev` and check direct navigation, reload, and back/forward behavior.
