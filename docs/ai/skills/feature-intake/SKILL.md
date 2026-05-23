---
name: feature-intake
description: Use this skill when a feature request is informal, incomplete, ambiguous, or written in natural language and needs to be converted into an actionable implementation plan before coding.
---

# Feature Intake Skill

## When to use

Use this skill before implementation when the user asks for a new feature or
behavior change in natural language and the request needs structure.

Examples:

- "Quiero agregar seguimiento a miembros que han faltado varias reuniones."
- "Seria bueno ver alertas para personas que necesitan cuidado."
- "Agrega algo para manejar excepciones de reuniones."

Do not use this skill for direct bug fixes, pure documentation edits, or
already-structured tasks with clear scope, files, and validation.

## Required context

Read only what is needed:

1. `AGENTS.md`
2. `docs/ai/project-context.md`
3. `docs/ai/architecture.md`
4. `docs/ai/domain-model.md`
5. `docs/ai/workflows/implement-feature.md`
6. `docs/ai/skills/README.md`

Then load only matching skills, for example:

- Attendance: `docs/ai/skills/add-attendance-feature/SKILL.md`
- Pastoral notes: `docs/ai/skills/add-pastoral-note-feature/SKILL.md`
- Persisted state: `docs/ai/skills/modify-zustand-store/SKILL.md`
- Validation: `docs/ai/skills/add-zod-validation/SKILL.md`
- Component refactor: `docs/ai/skills/refactor-component/SKILL.md`

## Intake process

1. Restate the original request in one sentence.
2. Infer the user goal from the product context.
3. Identify in-scope behavior and explicit out-of-scope boundaries.
4. Map the request to affected domain areas.
5. Identify expected files or areas, not exact edits.
6. Select the relevant workflow and skills.
7. Assess data, privacy, routing, UI, and validation impact.
8. Write assumptions for low-risk unknowns.
9. Ask clarification questions only when required by the clarification rules.
10. Produce a structured intake using `feature-request-template.md`.

## Inference rules

- Default to local-first behavior with Zustand persist and `localStorage`.
- Default to the existing single-screen app unless route-level navigation is
  explicitly needed.
- Default to existing domain vocabulary in `src/domain/types.ts`.
- Default to small, focused UI changes in the current screen.
- Default to no backend, auth, cloud sync, analytics, or remote logging.
- Default to Spanish pastoral UI copy consistent with the app.
- Default to explicit assumptions for low-risk gaps instead of blocking.
- Select the most specific existing skill that matches the inferred feature.

## Clarification rules

Do not ask for everything. Ask only when missing information could change:

- Architecture.
- Domain model.
- Persistence or migration needs.
- Privacy boundary.
- Routing strategy.
- Main UX behavior.
- Functional scope.

For low-risk UI, copy, filtering, sorting, labels, or small display changes,
proceed with stated assumptions.

Ask at most three questions in the first round unless the change is high risk.
Use `clarification-questions.md` as a menu, not a questionnaire.

## Output format

Use this structure:

```md
# Feature Intake

## Original request

## Inferred feature summary

## User goal

## Scope

## Out of scope

## Affected areas

## Relevant workflow

## Relevant skills

## Data and persistence impact

## Privacy impact

## UI/UX impact

## Risks

## Assumptions

## Clarification questions

## Implementation plan

## Validation plan

## Handoff updates
```

If no questions are needed, write "No blocking questions." under
`Clarification questions`.

## Validation plan

The intake should propose validation, not run it unless implementation also
happens in the same task.

Default validation:

```bash
pnpm lint
pnpm build
```

For UI changes, include manual checks through `pnpm dev`.

## Handoff update

For intake-only work, no handoff update is required unless it creates a durable
decision or follow-up.

For intake plus implementation, update:

- `docs/ai/handoff/current-state.md`
- `docs/ai/handoff/next-actions.md`
- `docs/ai/handoff/known-issues.md` only if a new issue or unresolved risk is
  discovered.
