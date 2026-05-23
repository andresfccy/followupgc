# FollowUpGC Agent Guide

## Mission

FollowUpGC is a local-first React app for tracking church cell-group members,
weekly meetings, attendance, cancelled meetings, and chronological pastoral
notes. Keep it private, offline-friendly, simple, and easy to maintain.

## Start Here

Use just-in-time context. Before editing code, always read:

1. `AGENTS.md`
2. `docs/ai/project-context.md`
3. `docs/ai/architecture.md`

Then load only the task-specific docs:

- Components/UI: `docs/ai/component-graph.md`, `docs/ai/ui-guidelines.md`
- Domain/data shape: `docs/ai/domain-model.md`
- Zustand/localStorage: `docs/ai/data-persistence.md`
- Forms/validation: `docs/ai/testing-strategy.md`
- Routing: `docs/ai/routing-strategy.md`
- Accessibility: `docs/ai/accessibility.md`
- Privacy: `docs/ai/security-and-privacy.md`
- Broad process: `docs/ai/workflows/*.md`
- Repeatable task skill: `docs/ai/skills/<skill-name>/SKILL.md`

## Skills Protocol

For repeatable task types, check `docs/ai/skills/` before implementing.

Use a skill when its `description` matches the task. Prefer the most specific
skill available. If no skill applies, use the relevant workflow from
`docs/ai/workflows/`.

Do not load every skill by default. Open only the skill that matches the task.
A workflow may coordinate multiple skills, but a skill should stay focused on
one repeatable task type.

## Feature Intake Protocol

When a feature request is informal or incomplete, use
`docs/ai/skills/feature-intake/SKILL.md` before implementation.

Infer reasonable defaults from the existing project context.

Ask clarification questions only when missing information could change
architecture, domain model, persistence, privacy, routing, or user experience.

For low-risk UI, copy, or small behavior changes, proceed with stated
assumptions instead of blocking on questions.

Use this decision rule:

- Base docs explain the system.
- Workflows coordinate broad processes.
- Skills execute repeatable task types.
- Scripts verify or automate.

## Ownership Boundaries

- Domain vocabulary lives in `src/domain/types.ts`.
- Seed examples live in `src/domain/seed.ts`.
- Persistent mutations live in `src/store/groupStore.ts`.
- Date and weekday logic lives in `src/lib/date.ts`.
- Generic utilities only live in `src/lib/utils.ts`.
- Keep `src/App.tsx` single-screen until route-level complexity is justified.

## Hard Rules

- Do not add backend services, auth, cloud sync, analytics, or complex routing
  unless the task explicitly asks for it.
- Do not replace Zustand, Tailwind, or localStorage.
- Do not introduce new dependencies without explicit need and approval.
- Do not rename domain concepts casually.
- Prefer explicit TypeScript types. Do not weaken types or introduce `any`
  unless the reason is documented.
- Make the smallest coherent change that solves the task.
- Keep UI copy clear, pastoral, and non-corporate.

## Validation

After code changes run:

```bash
pnpm lint
pnpm build
```

For UI behavior, also run `pnpm dev` and manually check the affected flow.
You may use `scripts/ai/verify.sh` as the default verification wrapper.

If validation fails, report the exact failure, fix only the relevant issue, and
re-run the failed command.

## Handoff

For significant work, update:

- `docs/ai/handoff/current-state.md`
- `docs/ai/handoff/next-actions.md`
- `docs/ai/handoff/known-issues.md` only when a new issue is discovered

Record what changed, why, files touched, validation run, and remaining risk.

## Useful Commands

```bash
pnpm dev
pnpm lint
pnpm build
scripts/ai/inspect-project.sh
scripts/ai/verify.sh
```
