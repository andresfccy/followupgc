---
name: add-pastoral-note-feature
description: Use when adding, changing, or reviewing pastoral notes, member timeline behavior, or note privacy.
---

# Add Pastoral Note Feature

## When to use

Use this skill for work involving `TimelineEntry`, member timelines, pastoral
notes, note types, chronological display, note editing, or note deletion.

Editing or deletion should be implemented only when explicitly requested.

## Required context

- `AGENTS.md`
- `docs/ai/domain-model.md`
- `docs/ai/security-and-privacy.md`
- `docs/ai/ui-guidelines.md`
- `docs/ai/data-persistence.md`
- `src/domain/types.ts`
- `src/store/groupStore.ts` if persistence changes.

## Rules

- Notes belong to a member and should remain chronological.
- Treat pastoral notes as private data.
- Do not send note content to external services.
- Use respectful, pastoral UI copy.
- Keep persistence local.
- Do not add editing or deletion unless the task explicitly asks for it.
- If editing or deletion is added, preserve compatibility with existing notes.

## Steps

1. Identify whether the task changes note creation, display, types, ordering,
   editing, deletion, or privacy.
2. Check domain and persistence impact.
3. Implement the smallest change in the owning component/store.
4. Preserve chronological order and selected-member behavior.
5. If stored shape changes, apply `modify-zustand-store`.
6. If form validation changes, apply `add-zod-validation`.
7. Manually verify notes for at least one selected member.

## Validation

Run:

```bash
pnpm lint
pnpm build
```

Manual checks:

- A note is tied to the selected member.
- Timeline order remains correct.
- Reload preserves notes.
- No note content is exposed outside local UI/storage.

## Handoff update

For significant note work, update:

- `docs/ai/handoff/current-state.md`
- `docs/ai/handoff/next-actions.md`
- `docs/ai/handoff/known-issues.md` if privacy or data risk remains.
