# Feature Intake

## Original request

<Paste or summarize the user's original request.>

## Inferred feature summary

<One or two sentences describing the feature the agent inferred.>

## User goal

<What the user is trying to accomplish in product terms.>

## Scope

- <Included behavior or deliverable.>

## Out of scope

- <Explicitly excluded behavior, especially backend, auth, sync, analytics, or
  routing unless requested.>

## Affected areas

- Domain: <members, sessions, attendance, timeline, settings, or none.>
- UI: <current screen, panel, form, list, or none.>
- Store: <Zustand/localStorage impact or none.>
- Docs/handoff: <expected updates or none.>

## Relevant workflow

- `docs/ai/workflows/implement-feature.md`

## Relevant skills

- `<skill path>`

## Data and persistence impact

<Describe whether the feature reads, writes, or changes persisted data. Note
whether a migration might be needed.>

## Privacy impact

<Describe whether member, attendance, or pastoral note data exposure changes.>

## UI/UX impact

<Describe visible changes, expected user flow, and responsive/manual QA needs.>

## Risks

- <Risk and mitigation.>

## Assumptions

- <Assumption the agent can safely proceed with.>

## Clarification questions

- <Only blocking questions. Write "No blocking questions." if none.>

## Implementation plan

1. <Step.>

## Validation plan

- `pnpm lint`
- `pnpm build`
- <Manual checks if UI or behavior changes.>

## Handoff updates

- <Handoff files to update if implementation is significant.>
