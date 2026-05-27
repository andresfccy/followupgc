# FollowUpGC Development Roadmap

## Current Production Status

FollowUpGC is deployed as a static Firebase Hosting SPA at:

```txt
https://followupgc.web.app
```

The production app remains local-first. Runtime group data is stored in the
browser through Zustand persist and `localStorage`. Firebase Auth is now
implemented for Google Sign-In and email/password, with minimal Firestore user
profiles. Group data, Storage, Cloud Functions, cloud sync, and real XLSX
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

## Current Phase

### Phase 4 - Firestore Data Model + Security Rules

Status: Planned

Tasks:

- Add Firestore collections from the approved model.
- Add group creation.
- Add first-owner membership creation.
- Add `users/{userId}/groupMemberships/{groupId}` lookup records.
- Add group selector.
- Add `defaultGroupId` validation flow.
- Write Firestore security rules.
- Add Firebase Emulator tests for owner, leader, viewer, inactive member, and
  unauthenticated access.
- Decide whether viewer access needs sanitized member projections.

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
- Design group selector for users with multiple groups.
- Design default group setting.
- Design role management UI for owners.
- Design viewer experience and decide whether viewer sees sensitive fields.
- Design clear privacy copy before uploading local data.

### Data And Architecture

- Approve Firestore collection structure.
- Decide whether `users/{userId}/groupMemberships/{groupId}` is required for
  v1.
- Define repository boundaries before adding Firebase calls.
- Define remote error handling and retry behavior.
- Define migration conflict format.
- Decide if local member `notes` becomes pastoral notes subcollection records.

### Security And Privacy

- Write conceptual allow/deny matrix for all roles.
- Add production Firestore rules only after tests are defined.
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
- Whether single-group users get `defaultGroupId` set automatically or through
  confirmation.
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

Phase 4 is done only when:

- Firestore rules are written for profiles, groups, memberships, members,
  meetings, attendance, and pastoral notes.
- Rules are tested with owner, leader, viewer, inactive member, and signed-out
  access cases.
- Group creation creates a first owner membership.
- `defaultGroupId` is validated against active membership.
- A basic group selector exists for users with multiple active groups.
- Local group data is still not migrated automatically.
