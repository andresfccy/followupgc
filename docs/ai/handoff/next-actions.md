# Next Actions

- Consider adding automated tests only when shared logic or persistence
  migration complexity appears.
- Consider splitting `src/App.tsx` only after a feature area becomes difficult
  to maintain in place.
- If form validation is requested, start with
  `docs/ai/workflows/add-form-validation.md` and
  `docs/ai/skills/add-zod-validation/SKILL.md`.
- When a repeatable task appears more than twice, consider adding a focused
  skill under `docs/ai/skills/`.
- For informal feature requests, start with
  `docs/ai/skills/feature-intake/SKILL.md` before implementation.
- For XLSX member import implementation, start from the 2026-05-23 intake
  decision in `docs/ai/handoff/current-state.md`. Preserve optional new member
  fields for existing localStorage data, require `documentId` only for imported
  rows, and do not add an Excel parser dependency until explicitly approved.
- Decide a future XLSX parsing strategy: local parser dependency, Firebase
  Storage + Cloud Functions, or both behind the existing import contract.
- Replace `followupgc-placeholder` in `.firebaserc` with the real Firebase
  project id or run `firebase use --add` before the first Hosting deploy.
- For the next Firebase phase, design Auth and Firestore explicitly before
  changing persistence away from localStorage.
