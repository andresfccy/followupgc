# Workflow: Review PR

## Purpose

Use this workflow for broad PR review. Use focused skills when the change area
matches them.

## Read First

1. `AGENTS.md`
2. `docs/ai/project-context.md`
3. Changed files only.
4. Focused docs for touched areas.

## Consider Skills

- Local-first, persistence, privacy, or stored shape:
  `docs/ai/skills/review-local-first-change/SKILL.md`
- Attendance changes: `docs/ai/skills/add-attendance-feature/SKILL.md`
- Pastoral note changes:
  `docs/ai/skills/add-pastoral-note-feature/SKILL.md`
- Component refactor: `docs/ai/skills/refactor-component/SKILL.md`
- PR description after review: `docs/ai/skills/prepare-pr-summary/SKILL.md`

## Review Priorities

- Behavioral regressions.
- Local-first boundary violations.
- Persistence shape changes without migration thought.
- Domain vocabulary drift.
- Accessibility regressions in forms and status UI.
- Missing validation checks.

## Output

Lead with findings, ordered by severity. Include file and line references.
Mention validation gaps after findings. Keep summaries brief.

## Validate Locally When Practical

```bash
pnpm lint
pnpm build
```
