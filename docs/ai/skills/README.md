# AI Skills

Skills are task-specific operating guides for repeatable work in FollowUpGC.
They sit between stable project documentation and broad workflows.

## When To Use A Skill

Use a skill when the task matches a skill `description` in
`docs/ai/skills/<skill-name>/SKILL.md`. Prefer the most specific skill
available and load only that skill plus its required context.

Use `feature-intake` before implementation when a feature request is written in
natural language, incomplete, or ambiguous. It does not replace
`implement-feature`; it prepares a structured intake that becomes input for the
implementation workflow. It does not replace specific skills; it selects which
ones apply.

Use a workflow when the task is broad, spans multiple areas, or needs process
coordination before a specific skill is obvious.

## Decision Rule

- Base docs explain the system.
- Workflows coordinate broad processes.
- Skills execute repeatable task types.
- Scripts verify or automate.

## Available Skills

- `feature-intake`: convert informal feature requests into an actionable
  specification and identify missing questions only when they matter.
- `add-zod-validation`: add or change Zod-backed form validation.
- `modify-zustand-store`: change persisted Zustand state, actions, or
  migrations.
- `refactor-component`: split, simplify, or reorganize React components.
- `add-attendance-feature`: change attendance behavior or UI.
- `add-pastoral-note-feature`: change pastoral notes or member timeline
  behavior.
- `review-local-first-change`: review changes affecting local-first behavior,
  persisted shape, privacy, or offline use.
- `prepare-pr-summary`: prepare a PR description, validation summary, risks,
  and checklist.

## Creating New Skills

Create a new skill when the same task type is likely to repeat more than twice
and the instructions are more specific than a workflow. Keep the skill focused.
If it coordinates too many responsibilities, split it into smaller skills.

Each skill must include `SKILL.md` with:

- `name`
- `description`
- when to use it
- required context
- rules
- steps
- validation
- handoff update
