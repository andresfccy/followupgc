---
name: add-zod-validation
description: Use when adding or changing form validation with Zod for members, meetings, attendance, or pastoral notes.
---

# Add Zod Validation

## When to use

Use this skill when a task asks for Zod schemas, stronger form validation,
field-level error messages, or validation changes for members, meetings,
attendance, or pastoral notes.

Do not use it for simple documentation changes or for browser-only constraints
that do not need Zod.

## Required context

- `AGENTS.md`
- `docs/ai/project-context.md`
- `docs/ai/domain-model.md`
- `docs/ai/testing-strategy.md`
- The form owner in `src/App.tsx` or the relevant feature component.
- `docs/ai/data-persistence.md` if validated data reaches persisted state or
  changes stored shape.

## Rules

- Keep schemas close to the owning form until at least two forms share the same
  schema.
- Do not weaken domain types to fit form data.
- Validate before calling Zustand actions.
- Avoid persisting invalid data.
- Use clear Spanish error copy close to the field.
- Preserve existing domain vocabulary: personas, reuniones, asistencia,
  bitacora, cuidado, oracion.

## Steps

1. Identify the form and the domain type it writes.
2. Define the smallest Zod schema that covers required fields and invalid
   values.
3. Parse form data before mutation.
4. Show field-level errors without clearing valid user input.
5. Keep successful submission behavior consistent with the current app.
6. If stored data shape changes, evaluate a Zustand persist migration.
7. Update focused docs if the validation pattern becomes reusable.

## Validation

Run:

```bash
pnpm lint
pnpm build
```

Manually check valid input, missing required input, and one invalid value for
each changed form.

## Handoff update

For significant validation work, update:

- `docs/ai/handoff/current-state.md`
- `docs/ai/handoff/next-actions.md`
- `docs/ai/handoff/known-issues.md` only for new validation gaps or bugs.
