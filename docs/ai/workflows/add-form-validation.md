# Workflow: Add Form Validation

## Purpose

Use this workflow to coordinate validation work. Use the Zod validation skill
for implementation details.

## Read First

1. `AGENTS.md`
2. `docs/ai/skills/add-zod-validation/SKILL.md`

## Consider Related Skills

- Store or persisted shape changes:
  `docs/ai/skills/modify-zustand-store/SKILL.md`
- Attendance forms: `docs/ai/skills/add-attendance-feature/SKILL.md`
- Pastoral note forms:
  `docs/ai/skills/add-pastoral-note-feature/SKILL.md`

## Process

1. Identify the form and whether Zod is warranted.
2. Apply `docs/ai/skills/add-zod-validation/SKILL.md`.
3. Add related skills only if the validation change touches their area.

## Validate

```bash
pnpm lint
pnpm build
```

Manually check valid input, missing required input, and one invalid value.
