# Current State

## 2026-06-04: Firebase-Only Persistence Direction

Product direction updated:

- FollowUpGC should no longer preserve localStorage/demo mode as an ongoing
  product path.
- Firebase is the intended durable persistence layer for production data.
- Phase 5E should read remote members from Firestore for the selected remote
  group as the production source of truth.
- Phase 5F retires localStorage/demo persistence from the product flow.
- Existing `followupgc-data` should be cleared or ignored during the
  Firebase-only transition, not uploaded to Firestore.
- No local browser data needs to be preserved; the Firebase-backed app should
  start from an empty production state unless Firestore already has group data.

## 2026-06-04: Phase 5E Remote Member Read Implemented

The main app now reads production members from Firestore for the selected
remote group.

What changed:

- Added `src/lib/remoteMembers.ts` with a repository-style Firestore
  subscription for public member docs under `groups/{groupId}/members`.
- Updated `src/App.tsx` so the visible member list, selected member summary,
  and person metric use remote members, not Zustand/localStorage members.
- Added signed-out, unconfigured Firebase, no group, loading, error, and empty
  remote-member states.
- Stopped showing local seed sessions, attendance, and timeline entries in the
  production UI.
- Converted local durable write flows for manual members, sessions, attendance,
  notes, and settings into blocked/informational states until their Firebase
  write modules are implemented.
- Added `src/lib/legacyLocalStorage.ts` and clears the legacy
  `followupgc-data` key on app startup.
- Updated persistence, privacy, and component docs to reflect Firebase-only
  production persistence.

Validation:

- `CI=true pnpm install` passed after approving required pnpm build scripts for
  `@firebase/util` and `protobufjs`.
- `pnpm lint` passed.
- `pnpm build` passed with the existing Firebase/Vite chunk-size warning.
- `pnpm functions:build` passed.
- `pnpm dev --host 127.0.0.1` started successfully with escalated permissions,
  but a sandbox `curl` check could not connect back to the escalated server.

## 2026-06-04: Phase 5F LocalStorage Demo Persistence Removed

The local/demo persistence path has been removed from the production app.

What changed:

- Deleted `src/store/groupStore.ts`.
- Deleted `src/lib/memberImport.ts`.
- Deleted `src/domain/seed.ts`.
- Removed local import contract types from `src/domain/types.ts`.
- Removed direct `zustand` and `zod` dependencies from `package.json`.
- Updated base architecture, persistence, domain, component, roadmap, and
  handoff docs to point at Firebase repositories instead of Zustand/localStorage.

Remaining:

- Implement Firebase write/read modules for meetings, attendance, pastoral
  notes, and group settings before re-enabling those forms.

## 2026-06-04: Phase 5G Remote Meetings Implemented

Remote meetings are implemented as Firebase production data.

What changed:

- Added `src/lib/remoteMeetings.ts` for Firestore meeting subscriptions,
  create/update writes, and callable deletion requests.
- Added `functions/src/meetings.ts` with `deleteMeeting`.
- Exported `deleteMeeting` from `functions/src/index.ts`.
- Extended `firestore.rules` with a validated meeting shape:
  `date`, `status`, `title`, optional `comment`, `createdBy`, `createdAt`, and
  `updatedAt`.
- Firestore Rules allow active `owner` and `leader` to create/update meetings,
  active members to read, and deny direct client delete.
- `deleteMeeting` checks active owner/leader membership and refuses deletion
  when the meeting has child collection records such as attendance.
- Updated `src/App.tsx` so meetings load from Firestore and owner/leader users
  can create, edit, and request deletion.
- Attendance remains disabled until the remote attendance phase.

Validation:

- `pnpm lint` passed.
- `pnpm build` passed with the existing Firebase/Vite chunk-size warning.
- `pnpm functions:build` passed.

Remaining:

- Add remote group settings before re-enabling the parametros form.

## 2026-06-04: Phase 5H Remote Attendance Implemented

Remote attendance is implemented as Firebase production data under each held
meeting.

What changed:

- Added `src/lib/remoteAttendance.ts` for Firestore subscriptions and writes
  under `groups/{groupId}/meetings/{meetingId}/attendance/{memberId}`.
- Updated `src/App.tsx` so the selected held meeting loads attendance from
  Firestore and owner/leader users can mark present, absent, or excused.
- Cancelled meetings continue to hide attendance controls.
- Extended `firestore.rules` with a validated attendance shape:
  `meetingId`, `memberId`, `status`, optional `comment`, `recordedBy`,
  `recordedAt`, and `updatedAt`.
- Attendance writes require an active owner/leader, an existing held meeting,
  and an existing public member document.
- Added dedicated callable-core tests for `deleteMeetingRecord`, including
  active owner/leader success, denied viewer/inactive/stranger, missing meeting,
  and child-record precondition cases.
- Added `pnpm functions:test` for Cloud Functions unit tests.

Validation:

- `pnpm lint` passed.
- `pnpm build` passed with the existing Firebase/Vite chunk-size warning.
- `pnpm functions:lint` passed.
- `pnpm functions:test` passed: 4 executed, 4 passed, 0 failed.
- `pnpm test:rules` passed: 33 executed, 33 passed, 0 failed.

## 2026-06-04: Phase 5I Remote Pastoral Notes Implemented

Remote pastoral notes are implemented as Firebase production data under each
member.

What changed:

- Added `src/lib/remotePastoralNotes.ts` for Firestore subscriptions and
  creates under `groups/{groupId}/members/{memberId}/pastoralNotes/{noteId}`.
- Updated `src/App.tsx` so the selected member loads their pastoral notes from
  Firestore and owner/leader users can create note, care, prayer, or milestone
  entries.
- Viewer users cannot read or write pastoral notes.
- Extended `firestore.rules` with a validated pastoral note shape:
  `memberId`, `date`, `type`, `body`, `createdBy`, `createdAt`, and
  `updatedAt`.
- Pastoral note writes require an active owner/leader, an existing public
  member document, route `memberId` consistency, valid note type, non-empty
  body, and stable `createdBy`.
- Extended Firestore Rules tests with pastoral note access and shape coverage.

Validation:

- `pnpm lint` passed.
- `pnpm build` passed with the existing Firebase/Vite chunk-size warning.
- `pnpm test:rules` passed: 36 executed, 36 passed, 0 failed.

## 2026-06-04: Node 22 Runtime Alignment

The project now targets Node 22 because it is the newest stable runtime
currently supported by Firebase Cloud Functions.

What changed:

- Added root and functions `.nvmrc` / `.node-version` files with Node `22`.
- Updated root and functions `engines` to require Node 22.
- Updated Firebase Functions runtime from `nodejs20` to `nodejs22`.
- Added `scripts/with-node-22.sh` so project scripts load `nvm` and run under
  Node 22 when available.
- Wrapped root app, rules-test, and functions scripts with the Node 22 helper.
- Added root `functions:*` scripts so function commands can be run through the
  Node 22 wrapper before invoking `pnpm --dir functions ...`.

Validation:

- `CI=true pnpm install` passed after approving required pnpm build scripts for
  `@firebase/util` and `protobufjs`.
- `pnpm lint` passed.
- `pnpm build` passed with the existing Firebase/Vite chunk-size warning.
- `pnpm functions:build` passed.

## 2026-06-04: Java 21 Emulator Runtime Installed

OpenJDK 21 is installed through Homebrew for Firebase Emulator Suite support.

What changed:

- Installed `openjdk@21` with Homebrew.
- Updated `scripts/with-node-22.sh` to export Homebrew OpenJDK 21 as
  `JAVA_HOME` and prepend it to `PATH` when present.
- Updated rules-test scripts to run against explicit demo project
  `demo-followupgc-rules`.
- Updated `tests/storage.rules.test.mjs` to use the same demo project so
  Storage Rules can see Firestore membership fixtures.
- Created `~/.config` for Firebase CLI local config writes.

Validation:

- `scripts/with-node-22.sh node -v` reports `v22.22.3`.
- `scripts/with-node-22.sh java -version` reports OpenJDK `21.0.11`.
- `scripts/with-node-22.sh firebase --version` reports `15.19.1`.
- `pnpm test:rules` passed: 30 executed, 30 passed, 0 failed.
- `pnpm test:storage-rules` passed: 4 executed, 4 passed, 0 failed.

## 2026-05-22: Agent Harness Structure

The repository now has a modular agent harness under `docs/ai/`, with
`AGENTS.md` as the main entrypoint and `CLAUDE.md` as a compatibility pointer.

What changed:

- Added architecture, domain, persistence, routing, UI, testing,
  accessibility, and privacy docs.
- Added ADRs for local-first scope and Zustand persist.
- Added reusable workflows for feature work, bug fixes, component refactors,
  form validation, routing, and PR review.
- Added handoff documents for continuity.
- Added `scripts/ai/inspect-project.sh` and `scripts/ai/verify.sh`.

Why it changed:

- Future agents should load context just in time, respect ownership boundaries,
  and validate consistently without rediscovering the project shape.

Files touched:

- `AGENTS.md`
- `CLAUDE.md`
- `docs/ai/*`
- `scripts/ai/*`

Validation:

- `pnpm lint` passed.
- `pnpm build` passed.
- `scripts/ai/inspect-project.sh` passed after fixing shell quoting in the Node
  snippet.
- `scripts/ai/verify.sh` passed.

## 2026-05-22: Skill Layer Added

The harness now has three explicit layers:

- Base docs for stable system context.
- Workflows for broad process coordination.
- Skills under `docs/ai/skills/<skill-name>/SKILL.md` for repeatable task
  types.

What changed:

- Added a skills README and seven focused skills.
- Updated workflows to reference skills instead of duplicating implementation
  rules.
- Updated `AGENTS.md` with a skills protocol and the base/workflow/skill/script
  decision rule.
- Converted legacy `docs/ai/skills.md` into a pointer to the new skills index.
- Updated `scripts/ai/inspect-project.sh` so nested skill files appear in
  inspection output.

Validation:

- `pnpm lint` passed.
- `pnpm build` passed.
- `scripts/ai/inspect-project.sh` passed and now lists nested skill files.
- `scripts/ai/verify.sh` passed.

## 2026-05-22: Feature Intake Skill Added

The harness now includes `docs/ai/skills/feature-intake/` for converting
informal natural-language feature requests into actionable implementation
intake.

What changed:

- Added `feature-intake/SKILL.md`.
- Added a fillable feature request template.
- Added selective clarification questions grouped by risk area.
- Updated `AGENTS.md` with a feature intake protocol.
- Updated the skills index to explain that feature intake prepares
  `implement-feature` and selects specific skills.
- Updated `docs/ai/workflows/implement-feature.md` to run feature intake first
  when a request is informal or incomplete.

Validation:

- `pnpm lint` passed.
- `pnpm build` passed.
- `scripts/ai/inspect-project.sh` passed and lists the new feature intake
  files.
- `scripts/ai/verify.sh` passed.

## 2026-05-23: XLSX Member Import Intake Decision

The member import feature intake has one accepted domain decision:

- Excel fields are part of the `Member` domain model, not temporary import
  metadata.
- Imported rows must require `Documento` as `documentId`.
- Existing local members may still lack `documentId` for backwards
  compatibility.
- Reimports should upsert by `documentId`: update existing members with the
  same external document id, otherwise create new members.
- Do not deduplicate aggressively by full name in the first version.
- Do not add Firebase, Cloud Functions, Firestore, auth, cloud sync, routing, or
  Excel parsing dependencies without a separate implementation decision.

Expected import contract for implementation:

- `ChurchMemberImportRow`
- `ImportValidationError`
- `ImportPreview`
- `ImportResult`
- Conceptual flow: `parseImportFile(file) -> ImportPreview`, then
  `confirmImport(preview) -> ImportResult`.

## 2026-05-23: Import Contract And Member Domain Support

The first import phase is implemented as domain support and a normalized import
contract. It does not parse XLSX files yet.

What changed:

- `Member` now includes canonical fields for imported church-system data.
- Import contract types were added: `ChurchMemberImportRow`,
  `ImportValidationError`, `ImportPreview`, and `ImportResult`.
- `src/lib/memberImport.ts` validates and normalizes already-represented row
  objects and exposes `parseImportFile(file)` as a deliberate XLSX parser stub.
- Zustand persist was bumped to version `2` with safe member normalization for
  existing localStorage data.
- `upsertImportedMembers` and `confirmImport(preview)` upsert members by
  `documentId`.
- The member UI now shows imported administrative fields in the selected member
  summary and masks document ids.
- The import file control is present but reports that XLSX parsing is not
  implemented yet.

Preserved by import upserts:

- `id`
- `status`
- `phone`
- `notes`
- timeline entries
- sessions
- attendance
- `createdAt`
- local fields not owned by the Excel import

Validation:

- `pnpm lint` passed.
- `pnpm build` passed.
- `scripts/ai/verify.sh` passed.

## 2026-05-26: Firebase Auth Phase 3 Implementation

Firebase Phase 3 is implemented with Google Sign-In, email/password auth,
minimal Firestore user profiles, and initial remote group context lookup.

What changed:

- Added the official `firebase` dependency.
- Added `.env.example` for Vite Firebase configuration.
- Updated `.gitignore` so `.env` and `.env.*` stay untracked while
  `.env.example` remains committed.
- Added `src/lib/firebase.ts` for environment-based Firebase initialization.
- Added `src/lib/auth.ts` for Google Sign-In, email/password registration,
  email/password sign-in, sign-out, auth observation, profile upsert, and
  membership lookup.
- Added `src/lib/useAuthSession.ts` for user, profile, `defaultGroupId`,
  memberships, loading, error, and refresh state.
- Added a compact session panel in `src/App.tsx`.
- Added `docs/ai/firebase-auth-implementation.md`.
- Updated `docs/ai/development-roadmap.md` and
  `docs/ai/handoff/next-actions.md`.

Firestore usage in this phase:

- Creates or updates `users/{userId}` on sign-in with `uid`, `displayName`,
  `email`, `createdAt`, and `updatedAt`.
- Reads `users/{userId}/groupMemberships` to prepare future multi-group
  context.
- Does not create groups, memberships, members, meetings, attendance, pastoral
  notes, imports, Storage objects, or Cloud Functions.

Local-first boundary:

- Zustand/localStorage remains the source for current group data.
- Sign-in does not upload local members, meetings, attendance, notes, or import
  data.
- The app remains usable when Firebase is not configured or the user has no
  remote groups.

Validation:

- `pnpm lint` passed.
- `pnpm build` passed with the existing Vite chunk-size warning after adding
  Firebase SDK.
- `scripts/ai/verify.sh` passed with the same Vite chunk-size warning.

## 2026-05-29: Firebase Phase 4 Remote Groups And Memberships

Firebase Phase 4 is implemented as a minimal remote multi-group layer. It does
not migrate local FollowUpGC data.

What changed:

- Added `src/lib/remoteGroups.ts` as the repository-style Firestore layer for
  remote group creation, user group membership lookup, and `defaultGroupId`
  updates.
- Added remote group and membership types:
  `RemoteGroup`, `GroupRole`, `GroupMembership`, and `UserGroupMembership`.
- Group creation writes `groups/{groupId}`,
  `groups/{groupId}/memberships/{uid}`,
  `users/{uid}/groupMemberships/{groupId}`, and updates
  `users/{uid}.defaultGroupId` only when the user did not already have one.
- Updated `src/lib/useAuthSession.ts` to expose active memberships, current
  remote group, valid default membership, and a local current-group selector.
- Updated `src/App.tsx` session panel with signed-in group context, first group
  creation, active group list, current group switching, and default group
  updates.
- Added `firestore.rules` and wired it through `firebase.json`.
- Added `docs/ai/firebase-groups-memberships.md`.
- Updated the roadmap and next actions for Phase 5.

Security and privacy:

- Firestore rules do not allow public access.
- `defaultGroupId` is treated as a preference and must match active
  authoritative membership before it is used.
- User membership lookup records must mirror the authoritative group
  membership.
- Owner/leader/viewer role boundaries are reserved for future remote group
  data.
- No member, meeting, attendance, pastoral note, import, or document-id data is
  uploaded.

Remaining risk:

- Firestore rules have not been covered by emulator tests yet.
- Viewer access to future member documents still needs a sanitized projection
  or stricter role decision before uploading sensitive member data.
- Rules do not yet protect against removing the last owner.

Validation:

- `pnpm lint` passed.
- `pnpm build` passed with the existing Vite chunk-size warning after Firebase.
- `scripts/ai/verify.sh` passed with the same Vite chunk-size warning.
- `pnpm dev -- --host 127.0.0.1` started successfully after sandbox approval;
  `curl -L http://localhost:5173/` returned the Vite HTML shell. Full
  Firebase sign-in/group creation still needs configured `.env.local` values
  and browser interaction.

## 2026-05-29: Firebase Phase 4.5 Firestore Rules Tests

Firebase Phase 4.5 adds automated Firestore Rules tests as the security gate
before any sensitive Firestore writes.

What changed:

- Added `@firebase/rules-unit-testing` as a dev dependency.
- Added Firestore Emulator config to `firebase.json`.
- Added `pnpm test:rules`.
- Added `tests/firestore.rules.test.mjs` using Node's built-in test runner.
- Added `docs/ai/firestore-rules-testing.md`.
- Updated `docs/ai/development-roadmap.md`,
  `docs/ai/handoff/next-actions.md`, and
  `docs/ai/firebase-auth-implementation.md`.

Rules coverage:

- Signed-out denied for profiles, groups, group creation, and memberships.
- Users can only read/write their own profile.
- Invalid `defaultGroupId` is denied without active authoritative membership.
- Valid `defaultGroupId` is allowed with active authoritative membership.
- Valid group creation and same-batch initial owner membership are allowed.
- Group creation with another `createdBy` is denied.
- Initial owner membership for another user is denied.
- Later self-owner membership on an existing group is denied.
- Active owner/leader/viewer can read groups under current rules.
- Inactive and unaffiliated users cannot read groups.
- Fake membership mirrors are denied.
- Mirrors must match authoritative role and status.
- Only owners can change membership roles/statuses.
- Viewer, inactive, and unaffiliated users cannot write future group data.

Rules change:

- The initial self-owner membership condition now requires the group to not
  exist before the request and to be created in the same batch. This prevents a
  `createdBy` user without current membership from later re-creating an owner
  membership on an existing group.

Validation:

- `pnpm lint` passed.
- `pnpm build` passed with the existing Vite chunk-size warning after Firebase.
- `scripts/ai/verify.sh` passed with the same Vite chunk-size warning.
- `pnpm test:rules` passed locally with Java 21+.
- Rules tests executed: 17.
- Rules tests approved: 17.
- Rules tests failed: 0.
- Rules tests cancelled: 0.
- Rules tests omitted: 0.
- `pnpm test:rules` exit code: 0.
- Firestore Emulator started and shut down correctly.

Remaining risk:

- Last-owner protection is still not implemented. Firestore Rules cannot
  reliably count remaining owners; handle this later with controlled
  transactional writes and possibly Cloud Functions.
- Viewer access to future member documents with `documentId` must be defined
  before migrating members.
- Rules for `members`, `meetings`, `attendance`, and `pastoralNotes` have not
  been fully tested because those collections are not migrated or written yet.
- Membership mirrors must remain synchronized with the authoritative
  `groups/{groupId}/memberships/{uid}` records.
- Re-run and extend rules tests whenever new remote collections are added.
- Do not start any sensitive Firestore import or migration if
  `pnpm test:rules` fails.

## 2026-05-29: Initial Production Data Source Decision

Superseded on 2026-06-04 by the Firebase-only persistence direction above.

Product decision: the first real production data load will come from the
official church Excel file, not from localStorage.

Decision:

- localStorage is not the production source right now.
- localStorage remains available as local/demo/fallback mode.
- localStorage will not be migrated automatically.
- Seeds, demo data, local development data, and local test data must not be
  migrated as production data.
- localStorage to Firestore migration is deferred and optional. Revisit it only
  if users have real local data that must be preserved.

Approved production import direction:

```txt
Excel oficial de la iglesia
-> parser/normalizacion
-> preview obligatorio
-> confirmacion explicita
-> escritura controlada en Firestore
```

What changed in planning:

- `docs/ai/development-roadmap.md` now makes Phase 5A the Excel -> Firestore
  initial import design.
- Added `docs/ai/excel-to-firestore-initial-import-plan.md`.
- The next implementation step is Phase 5B: implement the local XLSX parser
  behind the existing `parseImportFile(file): Promise<ImportPreview>` contract.

Constraints for the next phases:

- Import must require a remote destination group.
- `defaultGroupId` can preselect, but permission must come from authoritative
  membership.
- Only `owner` and `leader` should import.
- `viewer` must not import.
- Preview and explicit confirmation are mandatory before writes.
- Do not upload or store the original Excel file.
- Before writing real members, define remote member/private profile model,
  rules, and rules tests.
- `pnpm test:rules` must pass before writing sensitive data.

Remaining risk:

- Viewer access over members with `documentId` must be designed before member
  migration/import writes.
- Last-owner protection remains unresolved.
- Membership mirrors must stay synchronized with authoritative memberships.
- Rules must be extended and re-tested when member/private profile collections
  are added.

## 2026-05-29: Firebase Phase 5B Backend XLSX Processing To Preview

Phase 5B moves XLSX processing to Firebase backend/serverless. The frontend no
longer owns XLSX parsing.

What changed:

- Added Firebase Functions TypeScript project under `functions/`.
- Added backend dependencies in `functions/package.json`:
  `firebase-admin`, `firebase-functions`, and `xlsx`.
- Added `processChurchXlsxImport`, a Storage finalize trigger for:
  `imports/{groupId}/{importRunId}/source.xlsx`.
- Added Firebase Storage runtime initialization in `src/lib/firebase.ts`.
- Added `src/lib/remoteImports.ts` for creating importRuns, uploading XLSX to
  Storage, and subscribing to importRun/previewRows.
- Updated `src/App.tsx` import UI to upload XLSX and show backend status,
  summary, errors, and preview rows.
- Added `storage.rules`.
- Updated `firebase.json` with Functions, Storage rules, and emulators.
- Updated `firestore.rules` and `tests/firestore.rules.test.mjs` for
  importRuns.
- Added `docs/ai/firebase-xlsx-backend-processing.md`.

Implemented flow:

```txt
owner/leader creates importRun
-> frontend uploads XLSX to Storage
-> Cloud Function marks processing
-> Cloud Function reads first sheet
-> validates required columns
-> normalizes rows
-> writes summary/errors/previewRows
-> marks preview_ready or failed
```

Storage path:

```txt
imports/{groupId}/{importRunId}/source.xlsx
```

Firestore paths:

```txt
groups/{groupId}/importRuns/{importRunId}
groups/{groupId}/importRuns/{importRunId}/previewRows/{rowId}
```

Not implemented:

- Final confirmed member writes.
- Member private profile model.
- Remote members as app source of truth.
- Meetings, attendance, or pastoral notes in Firestore.
- localStorage migration.
- Storage Rules tests.

Validation status:

- `pnpm lint` passed after adding Functions source.
- `pnpm build` passed with the existing Vite chunk-size warning.
- `scripts/ai/verify.sh` passed with the same Vite chunk-size warning.
- `functions`: `./node_modules/.bin/tsc` passed.
- At the time of the Phase 5B handoff, `pnpm test:rules` was not run because
  Java was not visible on `PATH`; Phase 5C later validated Java 21.0.11 and
  passing rules tests.
- `functions pnpm install` completed dependency installation but returned
  `ERR_PNPM_IGNORED_BUILDS` because pnpm blocked build scripts for
  `@firebase/util` and `protobufjs`.

Remaining risk:

- Storage file retention/deletion is not finalized.
- Preview update detection checks existing public member docs by
  `groups/{groupId}/members.documentIdHash`.
- Cloud Functions/Storage production deploy may require Blaze plan.
- Phase 5C rules/tests now gate final member writes.

## 2026-06-02: XLSX Preview Update Detection Fix

The backend XLSX preview now aligns with the Phase 5C member security model.

What changed:

- Fixed `functions/src/importXlsx.ts` so preview duplicate/update detection
  queries `groups/{groupId}/members` by `documentIdHash`.
- Removed the stale lookup against `groups/{groupId}/memberPrivateProfiles`,
  which is not the active rules/model path.
- Full `documentId` remains out of public member docs and preview rows.

Why it changed:

- Existing imported members store `documentIdHash` on the public member doc.
  Looking in the stale private-profile collection would make reimports mark
  existing rows as `create` instead of `update`.

Validation:

- `pnpm --dir functions lint` passed with the local Node 24 vs function Node 20
  engine warning.
- `pnpm --dir functions build` passed with the same engine warning.
- `pnpm lint` passed.
- `pnpm build` passed with the known Vite chunk-size warning.
- `pnpm test:rules` passed: 27 tests executed, 27 passed, 0 failed.
- `pnpm test:storage-rules` passed: 4 tests executed, 4 passed, 0 failed.

Remaining risk:

- Final confirmed import write was still pending at this point; it is covered by
  the Phase 5D entry below.
- A dedicated Cloud Function unit/integration test for preview `create` versus
  `update` detection is still pending.

## 2026-06-02: Firebase Phase 5D Confirmed XLSX Import Writes

Phase 5D implements explicit preview approval and controlled backend writes for
official church Excel imports.

What changed:

- Added `confirmChurchXlsxImport`, a callable Cloud Function that:
  - requires authenticated active `owner` or `leader` membership;
  - accepts only `groupId` and `importRunId` from the client;
  - requires `preview_ready` status with no blocking preview errors;
  - re-reads the source XLSX from Storage;
  - reuses the backend normalization path;
  - verifies preview rows still match the source file;
  - writes public member docs and private profile docs in Firestore batches;
  - stores confirmation result metadata on the importRun.
- Public member docs receive operational church-system fields,
  `documentIdHash`, `importedFrom`, `lastImportRunId`, and timestamps.
- Private profiles receive the full `documentId` and birthday.
- The frontend now exposes `confirmExcelImportRun` through
  `src/lib/remoteImports.ts`.
- The import UI now opens a review popup with the full create/update table
  before approving the write.
- The UI no longer displays `documentIdHash`.
- Preview row storage now writes all preview rows in batches instead of
  truncating to the first 400 rows.

Files touched:

- `functions/src/importXlsx.ts`
- `functions/src/index.ts`
- `src/lib/firebase.ts`
- `src/lib/remoteImports.ts`
- `src/App.tsx`
- `docs/ai/security-and-privacy.md`
- `docs/ai/development-roadmap.md`
- `docs/ai/firebase-xlsx-backend-processing.md`
- `docs/ai/excel-to-firestore-initial-import-plan.md`
- `docs/ai/firestore-members-security-model.md`
- `docs/ai/handoff/current-state.md`
- `docs/ai/handoff/next-actions.md`

Validation status:

- `pnpm --dir functions lint` passed with the local Node 24 vs function Node 20
  engine warning.
- `pnpm --dir functions build` passed with the same engine warning.
- `pnpm lint` passed.
- `pnpm build` passed with the known Vite chunk-size warning.
- `pnpm test:rules` passed: 27 tests executed, 27 passed, 0 failed.
- `pnpm test:storage-rules` passed: 4 tests executed, 4 passed, 0 failed.
- `pnpm dev -- --host 127.0.0.1` started after sandbox approval; `curl -L
  http://localhost:5173/` returned the Vite HTML shell. The server was stopped
  afterward.

Remaining risk:

- Dedicated Cloud Function tests for `confirmChurchXlsxImport` are still
  pending.
- Storage source file retention/deletion is still not finalized.
- Remote members are written but not yet read into the main app UI; Phase 5E
  remains next.

## 2026-05-29: Firebase Phase 5C Rules, Storage Tests, And Member Security Model

Phase 5C prepares the remote member security model before confirmed imported
member writes. It does not write final members.

What changed:

- Added/updated Firestore Rules for:
  `groups/{groupId}/members/{memberId}` and
  `groups/{groupId}/members/{memberId}/private/profile`.
- Public member docs allow `firstName`, `lastName`, `fullName`, operational
  import fields, and `documentIdHash`; they reject full `documentId`.
- Private profile docs can hold `documentId`, `phone`, and `birthday` and are
  restricted to active `owner`/`leader`.
- `previewRows` remain client-read only for active `owner`/`leader`; client
  writes are denied because Cloud Functions/Admin SDK writes preview data.
- Storage Rules now restrict XLSX uploads/reads to active `owner`/`leader`,
  limit uploads to 20 MB, require XLSX-compatible content type, and deny client
  overwrite/delete.
- Added Storage Rules tests in `tests/storage.rules.test.mjs`.
- Expanded Firestore Rules tests in `tests/firestore.rules.test.mjs` for
  previewRows, public members, private profiles, and role boundaries.
- Added `docs/ai/firestore-members-security-model.md`.

Validation status:

- Java detected: OpenJDK 21.0.11.
- `pnpm lint` passed.
- `pnpm build` passed with the known Vite chunk-size warning.
- `pnpm test:rules` passed: 27 tests executed, 27 passed, 0 failed.
- `pnpm test:storage-rules` passed: 4 tests executed, 4 passed, 0 failed.
- `scripts/ai/verify.sh` passed with the known Vite chunk-size warning.
- Functions TypeScript build passed with `./node_modules/.bin/tsc`.

Remaining risk:

- Final confirmed import write was still pending at this point; it is covered by
  the Phase 5D entry above.
- Last-owner protection is still pending.
- Viewer can read public member docs; this is safe only while full
  `documentId`, phone, birthday, and pastoral notes stay out of that document.
- Decide whether `documentIdHash` should remain viewer-readable before broad
  production use.
- Storage source file retention/deletion remains pending.
- Meetings, attendance, and pastoral notes still need rules/tests before they
  move remote.

## 2026-05-23: Firebase Hosting Static Deployment Config

Firebase Hosting phase 1 is complete. FollowUpGC is deployed as a static SPA at:

```txt
https://followupgc.web.app
```

What changed:

- Added `firebase.json` with `dist` as the public directory and SPA rewrite to
  `/index.html`.
- Added `.firebaserc` with `followupgc-placeholder` as the default project id.
- Added `docs/ai/deployment-firebase.md` with project setup, deploy commands,
  validation commands, and out-of-scope Firebase services.

No runtime Firebase SDK, Auth, Firestore, Storage, Cloud Functions, cloud sync,
or XLSX processing was added. The app remains local-first with Zustand persist
and `localStorage`.

Redeploy command:

```bash
pnpm build
firebase deploy --only hosting
```

Validation:

- `pnpm lint` passed.
- `pnpm build` passed.
- `scripts/ai/verify.sh` passed.

## 2026-05-26: Firebase Auth And Firestore Phase 2 Design

Superseded on 2026-06-04 for persistence mode: Firebase is now the intended
durable production layer, not an optional remote layer preserving local-only
mode.

Firebase Phase 2 is documented as a design-only phase for Auth, Firestore,
multi-group support, roles, default groups, migration, privacy, and future XLSX
processing.

What changed:

- Added `docs/ai/firebase-auth-firestore-plan.md` with the recommended Firebase
  Auth + Firestore architecture.
- Added `docs/ai/development-roadmap.md` as the central backlog and phase
  tracker.
- The design recommends Firebase Auth plus Firestore as an optional remote
  layer while preserving local-only mode.
- Multi-group access is modeled with `groups/{groupId}` and per-group
  memberships.
- `users/{userId}.defaultGroupId` is a user preference, not an authorization
  grant.
- Role boundaries are defined for `owner`, `leader`, and `viewer`.
- LocalStorage migration must be manual and confirmed before any data upload.

No Firebase SDK, Auth, Firestore, Storage, Cloud Functions, XLSX parser, source
code, or runtime behavior was implemented in this phase.

Validation:

- `pnpm lint` passed.
- `pnpm build` passed.
- `scripts/ai/verify.sh` passed.
