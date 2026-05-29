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
- Firebase Hosting Phase 1 is complete at `https://followupgc.web.app`.
  Redeploy with `pnpm build` and `firebase deploy --only hosting`. Use
  `firebase use --add` if the local Firebase project alias needs to be changed.
- Firebase Auth + Firestore Phase 2 design now lives in
  `docs/ai/firebase-auth-firestore-plan.md`.
- Use `docs/ai/development-roadmap.md` as the central roadmap/backlog for phase
  status, open decisions, risks, and next tasks.
- Before implementing Firebase Auth, decide the initial provider: Google
  Sign-In only, email/password only, or both.
- Firebase Auth Phase 3 now supports both Google Sign-In and email/password.
  Configure real values in `.env.local` from `.env.example` before local auth
  testing.
- Enable Google and Email/Password providers in Firebase Console before
  testing sign-in against the production Firebase project.
- Firebase Phase 4 now has minimal remote groups, first-owner memberships,
  user group lookup records, `defaultGroupId` validation, a basic selector, and
  initial Firestore rules.
- Add emulator tests for the Phase 4 rules before storing real pastoral data in
  Firestore. Cover owner, leader, viewer, inactive member, and signed-out
  access cases.
- Review viewer access before remote member sync because Firestore rules cannot
  hide individual fields such as `documentId` inside readable documents.
- Add owner-managed leader/viewer assignment before inviting or assigning more
  users to a group.
- Before remote migration, build an explicit localStorage migration preview and
  require user confirmation before uploading any local data.
