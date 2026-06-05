# FollowUpGC Development Roadmap

## Current Production Status

FollowUpGC is deployed as a static Firebase Hosting SPA at:

```txt
https://followupgc.web.app
```

The production app remains local-first for pastoral data until remote import is
implemented. Runtime local/demo data is stored in the browser through Zustand
persist and `localStorage`. Firebase Auth is implemented for Google Sign-In and
email/password. Firestore now stores minimal remote group identity, group
memberships, user group lookup records, and `defaultGroupId`.

Product decision: Firebase is now the intended persistence layer for production
use. The localStorage/demo version should be retired from the product flow, not
preserved as an ongoing mode. The first real production data load should come
from the official church Excel file through parsing, normalization, mandatory
preview, explicit confirmation, and controlled Firestore writes. Seeds, local
development data, demo data, and localStorage test data must not be migrated as
production data.

## Completed Phases

### Phase 0 - Local-First App Foundation

Status: Completed

- Built the single-screen React app for members, meetings, attendance,
  cancelled meetings, pastoral notes, and group settings.
- Chose Zustand persist with `localStorage`.
- Preserved local-only privacy boundaries.
- Added domain support for imported church-system member fields.
- Added a normalized member import contract without real XLSX parsing.

### Phase 1 - Firebase Hosting

Status: Completed

- Added Firebase Hosting configuration for a static Vite SPA.
- Deployed production URL: `https://followupgc.web.app`.
- Kept all runtime data local.
- Did not add Firebase SDK, Auth, Firestore, Storage, Cloud Functions, or
  remote sync.

### Phase 2 - Firebase Auth + Firestore Design

Status: Completed

Goal: define the remote architecture before implementation.

Current design outputs:

- `docs/ai/firebase-auth-firestore-plan.md`
- `docs/ai/development-roadmap.md`

Tasks:

- Define Auth provider recommendation.
- Define `users/{userId}` profile shape.
- Define multi-group model.
- Define default group behavior.
- Define memberships and per-group roles.
- Define conceptual Firestore security rules.
- Define localStorage to Firestore migration strategy.
- Define Zustand and Firestore coexistence.
- Define privacy limits for document ids, attendance, service data, and
  pastoral notes.
- Define future XLSX processing direction without implementation.

### Phase 3 - Firebase Auth Implementation

Status: Completed

Tasks:

- Added Firebase SDK.
- Added Vite environment-based Firebase config.
- Added Google Sign-In.
- Added email/password registration and sign-in.
- Added sign-out.
- Created or updated `users/{userId}` on sign-in.
- Read `users/{userId}/groupMemberships`.
- Kept local-only mode available.
- Added signed-in empty state for users without remote groups.
- Avoided writing local group data remotely.

### Phase 4 - Firestore Data Model + Security Rules

Status: Completed

Tasks:

- Added the minimal remote group model for:
  `groups/{groupId}`, `groups/{groupId}/memberships/{userId}`,
  `users/{userId}/groupMemberships/{groupId}`, and
  `users/{userId}.defaultGroupId`.
- Added group creation for authenticated users.
- Added first-owner membership creation.
- Added `users/{userId}/groupMemberships/{groupId}` lookup records.
- Added a basic group selector in the existing session panel.
- Added `defaultGroupId` validation against active memberships.
- Added initial Firestore security rules and wired them through `firebase.json`.
- Documented model and manual checks in
  `docs/ai/firebase-groups-memberships.md`.

Not completed in this phase:

- Firebase Emulator tests for owner, leader, viewer, inactive member, and
  unauthenticated access.
- Final viewer data projection decision.
- Local data migration or remote sync.

### Phase 4.5 - Firestore Rules Tests

Status: Completed

Tasks:

- Added Firebase Emulator configuration for Firestore.
- Added `@firebase/rules-unit-testing`.
- Added `pnpm test:rules`.
- Added Node-based rules tests in `tests/firestore.rules.test.mjs`.
- Covered signed-out denial, profile ownership, `defaultGroupId` validation,
  group creation, initial owner membership, group reads by role, inactive
  denial, fake membership mirrors, mirror role/status matching, and critical
  write boundaries.
- Tightened the initial self-owner membership rule so it only applies while the
  group is created in the same request/batch.
- Documented setup and limitations in `docs/ai/firestore-rules-testing.md`.

Validation:

- `pnpm test:rules` passed locally with Java 21+.
- Tests executed: 17.
- Tests approved: 17.
- Tests failed: 0.
- Exit code: 0.
- Firestore Emulator started and shut down correctly.

Migration gate:

- Phase 5 must not start uploading sensitive imported data if `pnpm test:rules`
  fails.
- Rules must be re-tested each time new remote collections or permissions are
  added.

Phase 5C expanded the current rules gate:

- `pnpm test:rules`: 27 executed, 27 passed, 0 failed.
- `pnpm test:storage-rules`: 4 executed, 4 passed, 0 failed.
- Java: OpenJDK 21.0.11.
- Final member writes must not start if either rules test command fails.

## Current Phase

### Phase 5A - Excel To Firestore Initial Import Design

Status: Completed

Tasks:

- Define the official Excel file as the first production data source.
- Define the import flow:
  Excel oficial de la iglesia -> parser/normalizacion -> preview obligatorio
  -> confirmacion explicita -> escritura controlada en Firestore.
- Require a remote destination group before import.
- Restrict import to `owner` and `leader`; `viewer` cannot import.
- Decide that XLSX processing happens in Firebase Storage + Cloud Functions,
  not in the browser.
- Define remote member and private profile shape before writing.
- Define duplicate and conflict handling around `documentId`.
- Require Firestore rules and rules tests for member/private profile writes
  before any real member data is written.
- Keep localStorage as local/demo/fallback, not as the production source.

### Phase 5B - Storage + Cloud Functions XLSX Processing To ImportPreview

Status: Completed

Tasks:

- Add Firebase Functions backend for XLSX processing.
- Add Firebase Storage upload path:
  `imports/{groupId}/{importRunId}/source.xlsx`.
- Add `groups/{groupId}/importRuns/{importRunId}`.
- Frontend creates importRun, uploads file, listens to status/preview, and does
  not parse XLSX.
- Cloud Function parses the official church Excel columns:
  `Nombre`, `Apellidos`, `Documento`, `Genero` / `Género`, `Cumpleaños`,
  `En Grupo Desde`, `Rol en Grupo`, `Asistencias Semestre`, `Servidor`, and
  `Esta Sirviendo`.
- Generate preview summary, errors, and previewRows.
- Do not write final members.
- Document Storage lifecycle/deletion as pending.

### Phase 5C - Firestore Rules And Tests For ImportRuns, Members And Private Profiles

Status: Completed

Tasks:

- Added Firestore rules for `groups/{groupId}/members/{memberId}` public docs.
- Added Firestore rules for
  `groups/{groupId}/members/{memberId}/private/profile`.
- Kept full `documentId` out of public member docs and previewRows.
- Allowed active `viewer` memberships to read public member docs only because
  the public doc excludes full document ids and private fields.
- Restricted private profiles and previewRows to active `owner` and `leader`.
- Kept client writes to previewRows denied; Cloud Functions/Admin SDK owns
  preview generation.
- Added Storage Rules tests for XLSX upload/read boundaries.
- Added `docs/ai/firestore-members-security-model.md`.
- Require `pnpm test:rules` and `pnpm test:storage-rules` to pass before final
  member writes are enabled.

### Phase 5D - Confirmed Backend Write Of Imported Members To Firestore

Status: Implemented

Tasks:

- Added backend confirmation through `confirmChurchXlsxImport`.
- Writes imported members only after backend-generated preview and explicit
  confirmation.
- Requires a destination remote group and active `owner` or `leader`
  membership.
- Revalidates the source XLSX in Cloud Functions instead of parsing in the
  browser.
- Upserts by `documentIdHash` within the destination group while storing the
  full `documentId` only in `members/{memberId}/private/profile`.
- Stores import metadata on the public member doc and confirmation result on
  the importRun.
- Added a review popup with the full create/update table before approval.

Remaining:

- Add dedicated Cloud Function tests for create/update confirmation behavior.
- Define source XLSX deletion/retention.

### Phase 5E - Read Remote Members From Firestore

Status: Completed

Tasks:

- Read remote members for the selected remote group.
- Treat Firestore members as the production source of truth.
- Stop presenting local/demo data as the operational member list once a remote
  group is active.
- Avoid mixing local test data with remote production data.
- Add empty, loading, signed-out, and unconfigured-Firebase states that make it
  clear persistence requires Firebase.

### Phase 5F - Retire LocalStorage Demo Persistence

Status: Completed

Tasks:

- Remove the product dependency on Zustand persist/localStorage for members,
  meetings, attendance, and pastoral notes.
- Keep only short-lived UI state in React, and route all durable reads and
  writes through Firebase repository functions.
- Remove or isolate seed/demo data so it cannot appear as production data.
- Remove local import confirmation paths that write imported members into
  localStorage.
- Update UI copy that currently says local mode remains available.
- Clear or discard existing `followupgc-data` during the Firebase-only
  transition; do not upload it to Firestore.

Completed so far:

- Main UI reads members from Firestore via `src/lib/remoteMembers.ts`.
- Main UI no longer displays local seed members, sessions, attendance, or
  timeline entries as production data.
- Local durable write forms now show blocked/informational states until remote
  write modules exist.
- Legacy `followupgc-data` is cleared on app startup.
- Removed `src/store/groupStore.ts`, `src/lib/memberImport.ts`, and
  `src/domain/seed.ts`.
- Removed direct `zustand` and `zod` dependencies from the app package.

### Phase 5G - Remote Member Create/Edit

Status: Planned

Tasks:

- Add controlled remote member create/edit flows.
- Respect role permissions.
- Keep sensitive fields out of logs and dense UI.

### Phase 5G - Remote Meetings

Status: Completed

Tasks:

- Added remote meetings under `groups/{groupId}/meetings`.
- Added `src/lib/remoteMeetings.ts` for read/create/update and delete
  requests.
- Re-enabled meeting create/update UI for active `owner` and `leader` roles.
- Active `viewer` can read meetings but cannot write them.
- Direct client delete is denied in Firestore Rules.
- Added callable `deleteMeeting`, which deletes only when the meeting has no
  child collection records such as attendance.
- Attendance remains disabled until the next phase.

Validation:

- `pnpm lint` passed.
- `pnpm build` passed with the existing Firebase/Vite chunk-size warning.
- `pnpm --dir functions build` passed with local Node 26 warning because
  functions target Node 20.
- `pnpm test:rules` could not run in this environment because `firebase` CLI is
  not installed.

### Phase 5H - Remote Attendance

Status: Planned

Tasks:

- Add remote attendance after remote meetings are stable.
- Store attendance under
  `groups/{groupId}/meetings/{meetingId}/attendance/{memberId}`.
- Extend rules and tests before writes.

### Phase 5I - Remote Pastoral Notes

Status: Planned

Tasks:

- Add remote pastoral notes after member, meeting, and attendance security is
  settled.
- Restrict pastoral notes to `owner` and `leader`.
- Extend rules and tests before writes.

### Phase 5F.1 - LocalStorage Cleanup

Status: Planned

Tasks:

- Start the Firebase-only app from an empty production state unless Firestore
  already has data for the selected remote group.
- Clear or ignore the legacy `followupgc-data` key.
- Do not use localStorage as a production data source.
- Do not migrate seeds, demo data, local development data, or local test data.
- Do not upload localStorage contents to Firestore.

### Phase 6 - Remote Repository Expansion

Status: Planned

Tasks:

- Add repository-style Firestore read/write functions.
- Connect selected remote group data to store actions.
- Handle write pending, success, and failure states.
- Decide whether to enable Firestore offline persistence for sensitive data.
- Avoid direct Firestore calls in UI components.
- Do not preserve local-only production mode.

### Phase 7 - Extended XLSX Import Processing

Status: Planned

Tasks:

- Continue extending the backend import pipeline after confirmed member writes
  are stable.
- Keep XLSX parsing in Firebase Storage + Cloud Functions, not the browser.
- Define short-lived file retention or deletion after preview/import.
- Add richer conflict review if the first confirmed import exposes real-world
  duplicate patterns.
- Upsert imported members by `documentId`.
- Preserve pastoral and operational local data on reimport.

## Backlog

### Product And UX

- Design signed-in first-run flow.
- Design signed-in Firebase-required first-run flow.
- Design official Excel initial import UX with destination group, preview, and
  confirmation.
- Refine the basic group selector for users with multiple groups.
- Refine default group settings after owner-managed assignments exist.
- Design role management UI for owners.
- Design viewer experience and decide whether viewer sees sensitive fields.
- Design clear privacy copy before uploading local data.

### Data And Architecture

- Extend Firestore collection structure for official Excel-imported members and
  private profiles before writes are enabled.
- Keep `users/{userId}/groupMemberships/{groupId}` as the v1 user lookup.
- Keep Firebase reads/writes behind repository-style functions.
- Define remote import error handling and retry behavior.
- Define Excel import conflict format.
- Decide if local member `notes` becomes pastoral notes subcollection records.

### Security And Privacy

- Keep `pnpm test:rules` passing before any sensitive Firestore import,
  migration, or new remote collection write.
- Keep `pnpm test:storage-rules` passing before XLSX uploads are relied on.
- Add emulator tests for pastoral note access before pastoral notes move
  remote.
- Do not place full `documentId` in public member docs.
- Design last-owner protection.
- Keep membership mirrors synchronized with authoritative memberships.
- Decide whether remote offline persistence is enabled.
- Confirm no analytics, tracking, or remote logging of sensitive data.

### Import

- Keep XLSX parsing in Firebase Cloud Functions, not the browser.
- Keep original XLSX files out of app state and localStorage.
- Define Storage retention/deletion behavior for uploaded source files.
- Ensure import previews do not expose full document ids unnecessarily.

## Open Decisions

- Whether single-group users without `defaultGroupId` should be prompted more
  prominently to save a default.
- Whether viewers can read full member records or need sanitized projections.
- Whether viewers should continue reading `documentIdHash` in public member
  docs, or whether the hash should move to a stricter private/lookup path.
- Whether Firestore offline persistence is acceptable for sensitive remote
  data.
- Whether invitations are owner-managed manually or implemented with pending
  invite documents.
- Whether the Storage source file should be deleted immediately after preview
  generation or retained for a short audit window.
- Exact lifecycle for uploaded XLSX source files after preview or confirmed
  import.

## Risks

- Firestore rules cannot hide individual fields from readable documents, so
  viewer-readable member docs must never include full `documentId`.
- Uploading official Excel data to Firestore changes the privacy boundary and
  must never happen without preview, destination group, role check, passing
  rules tests, and explicit confirmation.
- Multi-leader groups increase exposure of pastoral notes.
- Denormalized membership lookup records can become stale if writes are not
  coordinated.
- Remote offline persistence may cache sensitive data on shared devices.
- Importing Excel data can create duplicate members or conflicts if
  `documentId` matching, preview, and conflict handling are weak.

## Definition Of Done For Current Phase

Phase 5C is done only when:

- No final member records are written.
- Firestore Rules protect importRuns, previewRows, public members, and private
  profiles.
- Storage Rules protect XLSX uploads and reads.
- Firestore Rules tests cover owner, leader, viewer, inactive, signed-out, and
  unaffiliated access.
- Storage Rules tests cover owner/leader upload/read, denied roles, content
  type, overwrite, and delete boundaries.
- Documentation explains the member/private profile model, privacy, and
  remaining risks.
