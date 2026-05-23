---
name: prepare-pr-summary
description: Use when preparing a pull request description, change summary, validation report, risks, and final checklist.
---

# Prepare PR Summary

## When to use

Use this skill when a task asks for PR copy, a merge summary, release notes for
current changes, validation evidence, risk notes, or a final review checklist.

## Required context

- `AGENTS.md`
- `docs/ai/handoff/current-state.md`
- `docs/ai/handoff/known-issues.md`
- `docs/ai/handoff/next-actions.md`
- `git status --short`
- `git diff --stat`
- Changed files as needed.

## Rules

- Summarize what changed, not every line edited.
- Call out user-facing behavior separately from docs or harness changes.
- Include validation commands exactly as run.
- Include screenshots or visual notes only when UI changed.
- List risks honestly and briefly.
- Do not claim tests or manual checks that were not run.

## Steps

1. Inspect changed files and group them by area.
2. Read handoff docs for current state and known risks.
3. Run or collect validation results.
4. Draft a concise summary.
5. List main changes, touched areas, validation, risks, and checklist.

## Validation

Prefer current results from:

```bash
pnpm lint
pnpm build
```

If available, include `scripts/ai/verify.sh` as the combined verification.

## Handoff update

Usually no handoff update is required for PR text only. If preparing the summary
reveals a new issue or follow-up, update:

- `docs/ai/handoff/known-issues.md`
- `docs/ai/handoff/next-actions.md`

## Output template

```md
## Summary
- ...

## Main changes
- ...

## Files / areas touched
- ...

## Validation
- ...

## Risks
- ...

## Screenshots / visual notes
- ...

## Checklist
- [ ] ...
```
