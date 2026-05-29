# Current State

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
