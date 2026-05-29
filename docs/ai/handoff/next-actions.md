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
  decision and the 2026-05-29 initial production data source decision in
  `docs/ai/handoff/current-state.md`.
- The next priority is official church Excel -> Firestore, not localStorage ->
  Firestore migration.
- Product decision updated: XLSX processing happens in Firebase Storage + Cloud
  Functions, not in the browser.
- Phase 5B now uploads XLSX to Storage and uses Cloud Functions to generate
  import preview.
- Phase 5C now defines the remote member/private profile security model and
  adds Firestore Rules plus Storage Rules tests.
- Next recommended phase: Phase 5D - confirmed backend write from ImportPreview
  to Firestore members after explicit confirmation.
- Do not implement confirmed member writes unless `pnpm test:rules` and
  `pnpm test:storage-rules` are passing.
- Define Storage source file retention/deletion before broad production use.
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
- Firebase Phase 4.5 now has Firestore Rules tests in
  `tests/firestore.rules.test.mjs` and a `pnpm test:rules` script.
- `pnpm test:rules` passed locally with Java 21+: 27 executed, 27 passed,
  0 failed, exit code 0.
- `pnpm test:storage-rules` passed locally with Java 21+: 4 executed, 4 passed,
  0 failed, exit code 0.
- Do not start any sensitive Firestore import or migration if
  `pnpm test:rules` fails.
- Do not rely on XLSX upload access if `pnpm test:storage-rules` fails.
- Review viewer access before remote member sync because Firestore rules cannot
  hide individual fields such as `documentId` inside readable documents.
- Design last-owner protection before advanced role administration. Firestore
  Rules alone cannot reliably count remaining owners.
- Extend rules tests when `members`, `meetings`, `attendance`, or
  `pastoralNotes` begin writing to Firestore.
- Keep user membership mirrors synchronized with authoritative group
  memberships.
- Add owner-managed leader/viewer assignment before inviting or assigning more
  users to a group.
- Before writing imported members to Firestore, use the Phase 5C
  member/private profile model, require backend-generated preview, and require
  explicit confirmation.
- localStorage -> Firestore migration is deferred/optional. Revisit only if
  users have real local data to preserve. Do not migrate seeds, demo data,
  local development data, or local test data.
