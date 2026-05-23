# Clarification Questions

Use this file as a selective menu. Do not ask every question.

Ask at most three questions in the first round unless the change is high risk.
Prefer explicit assumptions for low-risk UI, copy, filtering, sorting, or small
behavior changes.

## Product behavior

- What should trigger this feature?
- What should the user be able to do after the feature exists?
- Is this a visible workflow change or only a computed indicator?
- What should happen when there is no matching data?

## Domain model

- Does this require a new stored concept, or can it be derived from existing
  members, sessions, attendance, or timeline entries?
- Should this affect existing statuses, or remain separate from member status?
- Does the feature need history, or only current computed state?

## Persistence

- Should the data be stored, or recomputed from existing local records?
- Would existing `followupgc-data` in localStorage need a migration?
- Should seed data show this concept for development and manual QA?

## Privacy

- Does this expose pastoral notes, attendance patterns, or care concerns in a
  new place?
- Should any sensitive text be hidden, summarized, or omitted by default?
- Does the feature risk sending local data outside the browser?

## UI/UX

- Where should the feature appear in the current single-screen workflow?
- Is the main action review, create, edit, filter, or alert?
- Should the UI prioritize quick scanning or detailed entry?
- What Spanish label best matches the pastoral tone?

## Routing

- Does this require a separate route, or can it live in the current screen?
- Does the user need a shareable or restorable URL for this feature?

## Validation

- What inputs must be required?
- What invalid values need field-level feedback?
- Is Zod needed, or are browser constraints enough?

## Handoff

- Does this create follow-up work that should be tracked in
  `docs/ai/handoff/next-actions.md`?
- Does this reveal a new issue that belongs in
  `docs/ai/handoff/known-issues.md`?
