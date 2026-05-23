# Workflow: Fix Bug

## Purpose

Use this workflow to isolate and fix a defect with the narrowest reasonable
change.

## Read First

1. `AGENTS.md`
2. `docs/ai/project-context.md`
3. `docs/ai/architecture.md`
4. The smallest source area that reproduces the bug.

## Consider Skills

- Persisted state/localStorage: `docs/ai/skills/modify-zustand-store/SKILL.md`
- Attendance behavior: `docs/ai/skills/add-attendance-feature/SKILL.md`
- Pastoral notes/timeline:
  `docs/ai/skills/add-pastoral-note-feature/SKILL.md`
- Component-only defect: `docs/ai/skills/refactor-component/SKILL.md`
- Local-first risk review:
  `docs/ai/skills/review-local-first-change/SKILL.md`

## Diagnose

- Identify whether the bug is UI state, persisted state, date logic, or domain
  shape.
- Reproduce with current code when practical.
- Avoid broad rewrites while investigating.

## Touch

- Fix the owning file first.
- Add or adjust docs only if the bug reveals an ownership or workflow gap.

## Do Not Touch

- Unrelated formatting.
- Stored data shape unless the bug is caused by persistence.
- Dependencies unless there is no local fix.

## Validate

Run the smallest relevant check, then:

```bash
pnpm lint
pnpm build
```

Report any remaining manual verification that was not possible.

## Handoff

Follow the selected skill's handoff instructions. If no skill applies, update
handoff only when the bug fix is significant or leaves follow-up work.
