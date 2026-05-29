# FollowUpGC Development Roadmap

## Current Production Status

FollowUpGC is deployed as a static Firebase Hosting SPA at:

```txt
https://followupgc.web.app
```

The production app remains local-first. Runtime group data is stored in the
browser through Zustand persist and `localStorage`. Firebase Auth is implemented
for Google Sign-In and email/password. Firestore now stores minimal remote group
identity, group memberships, user group lookup records, and `defaultGroupId`.
Pastoral group data, Storage, Cloud Functions, cloud sync, and real XLSX
parsing are not implemented yet.

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

## Current Phase

### Phase 5 - LocalStorage To Firestore Migration

Status: Planned

Tasks:

- Build a migration preview from current `followupgc-data`.
- Require explicit confirmation before upload.
- Let the user create a new remote group or choose an existing group where they
  are owner/leader.
- Preserve members, imported fields, meetings, cancelled meetings, attendance,
  and pastoral notes.
- Use `documentId` for imported-member upserts.
- Avoid aggressive full-name deduplication in v1.
- Show conflicts before merge when remote data already exists.
- Keep local-only data unless the user chooses to clear it.

### Phase 6 - Remote Sync With Zustand

Status: Planned

Tasks:

- Keep Zustand as UI/cache state.
- Add repository-style Firestore read/write functions.
- Connect selected remote group data to store actions.
- Handle write pending, success, and failure states.
- Decide whether to enable Firestore offline persistence for sensitive data.
- Avoid direct Firestore calls in UI components.
- Keep local-only mode functional.

### Phase 7 - XLSX Import Processing

Status: Planned

Tasks:

- Decide parser strategy: browser-local parser, Firebase Storage + Cloud
  Functions, or both behind the existing import contract.
- If using Storage + Functions, design short-lived file retention and strict
  Storage rules first.
- Generate `ImportPreview` from real `.xlsx` files.
- Confirm import before writing.
- Upsert imported members by `documentId`.
- Preserve pastoral and operational local data on reimport.

## Backlog

### Product And UX

- Design signed-in first-run flow.
- Design local-only versus cloud-enabled mode selection.
- Refine the basic group selector for users with multiple groups.
- Refine default group settings after owner-managed assignments exist.
- Design role management UI for owners.
- Design viewer experience and decide whether viewer sees sensitive fields.
- Design clear privacy copy before uploading local data.

### Data And Architecture

- Extend Firestore collection structure for real remote group data after
  migration scope is approved.
- Keep `users/{userId}/groupMemberships/{groupId}` as the v1 user lookup.
- Keep Firebase reads/writes behind repository-style functions.
- Define remote error handling and retry behavior.
- Define migration conflict format.
- Decide if local member `notes` becomes pastoral notes subcollection records.

### Security And Privacy

- Add emulator tests for the initial Firestore rules.
- Add emulator tests for document id and pastoral note access.
- Decide viewer access to `documentId`.
- Decide whether remote offline persistence is enabled.
- Confirm no analytics, tracking, or remote logging of sensitive data.

### Import

- Decide XLSX parser strategy.
- Keep original XLSX files out of app state and localStorage.
- If using Firebase Storage later, define retention and deletion behavior.
- Ensure import previews do not expose full document ids unnecessarily.

## Open Decisions

- Whether local-only mode remains the default path after Auth exists.
- Whether single-group users without `defaultGroupId` should be prompted more
  prominently to save a default.
- Whether viewers can read full member records or need sanitized projections.
- Whether Firestore offline persistence is acceptable for sensitive remote
  data.
- Whether invitations are owner-managed manually or implemented with pending
  invite documents.
- Whether Cloud Functions are acceptable for future XLSX parsing.
- Whether local data migration should prefer creating a new remote group over
  merging into existing groups.

## Risks

- Firestore rules cannot hide individual fields from readable documents, so
  viewer access to member data containing `documentId` needs careful design.
- Uploading local data to Firestore changes the privacy boundary and must never
  happen without explicit confirmation.
- Multi-leader groups increase exposure of pastoral notes.
- Denormalized membership lookup records can become stale if writes are not
  coordinated.
- Remote offline persistence may cache sensitive data on shared devices.
- Merging local and remote data can create duplicate members or conflicting
  attendance if preview/conflict handling is weak.

## Definition Of Done For Current Phase

Phase 5 is done only when:

- A migration preview reads current `followupgc-data` without uploading it.
- The user explicitly chooses a destination remote group or creates a new one.
- The user confirms before any member, meeting, attendance, note, import, or
  document-id data is written to Firestore.
- The preview reports counts and likely conflicts before writing.
- Migration writes are limited to groups where the user is `owner` or `leader`.
- Local-only data remains available after migration.
