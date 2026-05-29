# Firebase Auth And Firestore Plan

## Purpose

This document designs Firebase Phase 2 for FollowUpGC before implementation.
It defines the recommended authentication model, Firestore data model,
multi-group access model, role boundaries, optional localStorage migration
considerations, Zustand coexistence, and privacy limits.

Phase 2 is a design phase only. It must not add Firebase SDK, Auth,
Firestore, Storage, Cloud Functions, XLSX parsing, remote sync, or changes
under `src/`.

## Current Baseline

- Production Hosting URL: `https://followupgc.web.app`.
- Runtime data is still local-first in browser `localStorage` through Zustand
  persist.
- Current storage key: `followupgc-data`.
- Current persist version: `2`.
- Member import has a domain contract, but real `.xlsx` parsing is not
  implemented.
- The app stores sensitive pastoral data: document ids, attendance, pastoral
  notes, member status, service data, and meeting history.

## Recommended Architecture

Firebase should become an optional authenticated remote layer while preserving
the local-first product principle.

Recommended shape:

- Firebase Auth identifies users.
- Firestore stores remote group data per group.
- Zustand remains the client-side state layer for UI state, optimistic local
  cache, selected group, loading/error states, and local-only mode.
- Firestore becomes the remote source of truth only after a user explicitly
  signs in and chooses or creates a remote group.
- Existing localStorage data must not be uploaded automatically.
- Multi-group support is modeled around `groups/{groupId}` documents and
  per-group membership records.

Do not spread Firebase reads and writes through UI components when
implementation begins. Add repository-style data functions first, then connect
them to the store.

## Auth Strategy

### Providers

Recommended first implementation:

- Google Sign-In for low-friction church leader access.
- Email/password as an optional second provider if leaders need access without
  Google accounts.

Allowing both is acceptable, but implementation should start with one provider
unless the user base clearly needs both. Google Sign-In is the simplest first
choice because it gives a verified display name/email and avoids password reset
support decisions in the first remote phase.

### User Document

Store only the minimum profile and app settings:

```txt
users/{userId}
  displayName
  email
  defaultGroupId
  createdAt
  updatedAt
```

Do not store member data, pastoral notes, attendance, or document ids under
`users/{userId}`.

### First Sign-In

When a user signs in and no `users/{userId}` document exists:

1. Create `users/{userId}` with display name, email, timestamps, and no
   `defaultGroupId`.
2. Query or load their group memberships.
3. If they have no active memberships, show an empty state that lets them
   create a first group or wait for an invitation.

### First Group And First Owner

When a user creates the first group:

1. Create `groups/{groupId}`.
2. Create `groups/{groupId}/memberships/{userId}` with `role: owner` and
   `status: active`.
3. Create `users/{userId}/groupMemberships/{groupId}` as a user-facing lookup
   record.
4. Set `users/{userId}.defaultGroupId` to the new group id.

### Inviting Or Adding Leaders

Recommended first version:

- Owners add another leader/viewer by email.
- If the user already exists, create membership records immediately.
- If the user does not exist yet, store a pending invitation document in a
  future phase.

Avoid email delivery, invite tokens, or Cloud Functions in the initial Auth
implementation unless explicitly scoped. Manual owner-managed assignment is
enough for the first remote version.

### No Groups After Sign-In

If a user signs in and has no active groups:

- Do not show any group data.
- Offer clear actions: create a group, accept/request assignment, or continue
  using local-only data.
- Do not auto-create a group unless the user explicitly chooses to do so.

## Multi-Group Model

A group represents one cell group, connection group, or pastoral group with its
own members, meetings, attendance, cancelled meetings, notes, regular weekday,
and assigned leaders.

A user can belong to many groups and can have different roles per group. Role
is stored on the group membership, not on the user document.

## Default Group Strategy

Each user should have a `defaultGroupId` on `users/{userId}`.

Login flow:

1. Load `users/{userId}`.
2. Load active group memberships for the user.
3. If `defaultGroupId` exists and the user still has active membership in that
   group, open that group directly.
4. If `defaultGroupId` is missing or no longer accessible, show the group
   selector.
5. If there is exactly one active group, the app may suggest setting it as the
   default or set it automatically after clear user-facing confirmation.
6. If there are multiple active groups, require an explicit selection and offer
   "make default" as a setting.

Never trust `defaultGroupId` alone for authorization. It is a preference, not a
permission grant.

## Firestore Data Model

Recommended first remote model:

```txt
users/{userId}
  displayName
  email
  defaultGroupId
  createdAt
  updatedAt

users/{userId}/groupMemberships/{groupId}
  groupId
  groupName
  role
  status
  joinedAt
  updatedAt

groups/{groupId}
  name
  regularWeekday
  createdBy
  createdAt
  updatedAt
  archivedAt?

groups/{groupId}/memberships/{userId}
  role
  userId
  displayName
  email
  joinedAt
  status
  updatedAt

groups/{groupId}/members/{memberId}
  firstName
  lastName
  fullName
  documentId
  gender
  birthday
  joinedAt
  groupRole
  semesterAttendances
  isServer
  isServing
  phone
  status
  notes
  createdAt
  updatedAt

groups/{groupId}/meetings/{meetingId}
  date
  status
  cancellationReason?
  createdAt
  updatedAt

groups/{groupId}/meetings/{meetingId}/attendance/{memberId}
  memberId
  attended
  createdAt
  updatedAt

groups/{groupId}/members/{memberId}/pastoralNotes/{noteId}
  content
  createdBy
  createdAt
  updatedAt
```

### Notes On Member Shape

- `documentId` is sensitive and should not appear in dense UI or logs.
- Existing local members may lack `documentId`.
- Imported members require `documentId`.
- Reimports should upsert by `documentId` within the target group.
- Pastoral notes should eventually move out of the member document and into
  the `pastoralNotes` subcollection to avoid loading long sensitive histories
  by default.
- If `notes` currently stores local notes on the member record, migration
  should preserve it and may convert it into initial `pastoralNotes` records in
  a later migration design.

## User Group Lookup Strategy

Use both:

- `groups/{groupId}/memberships/{userId}` as the authoritative group
  authorization record.
- `users/{userId}/groupMemberships/{groupId}` as a denormalized user lookup
  for fast group selection.

### Why Add `users/{userId}/groupMemberships`

Pros:

- Fast "my groups" screen without collection group queries.
- Simpler default group validation and group selector loading.
- Easier offline cache shape for the signed-in user.
- Avoids relying on query patterns that are harder to express in rules.

Cons:

- Membership data is duplicated.
- Role/status updates must update both locations.
- Rules must prevent a user from self-granting access through their user
  lookup record.

### Why Not Use Only `collectionGroup('memberships')`

Pros:

- Single authoritative membership record.
- Less denormalized data to maintain.

Cons:

- Requires collection group indexes.
- Query and rule design are more complex.
- It is less ergonomic for a common "load my groups after login" flow.

Recommendation: keep the group membership as the source of truth and mirror the
minimal user lookup record. If the mirror is stale, security rules must still
trust only `groups/{groupId}/memberships/{userId}` for access to group data.

## Roles And Permissions

Minimum roles:

```txt
owner
leader
viewer
```

Role meaning:

- `owner`: administers group settings, members, meetings, attendance, pastoral
  notes, memberships, roles, and archive state.
- `leader`: administers members, meetings, attendance, and pastoral notes, but
  cannot change owner-level settings or critical roles.
- `viewer`: reads group data. Recommended default is limited read access:
  meetings and member directory without document ids or pastoral notes unless a
  future decision explicitly allows more.

A user can be `owner` in one group, `leader` in another, and `viewer` in a
third.

## Conceptual Security Rules

These are authorization rules for design only, not production-ready Firestore
rules.

Core predicates:

```txt
isSignedIn()
isActiveMember(groupId)
roleFor(groupId) in ['owner', 'leader', 'viewer']
isOwner(groupId)
isLeaderOrOwner(groupId)
```

Conceptual authorization:

- No public reads or writes.
- `users/{userId}` can be read by that same signed-in user.
- `users/{userId}` can be created by that same signed-in user with limited
  fields.
- `defaultGroupId` updates are allowed only for the signed-in user and only if
  the user has active membership in the target group.
- A group can be read only by users with active membership in that group.
- Group settings can be updated only by `owner`.
- Archiving a group can be done only by `owner`.
- Membership records can be read by active group members.
- Role/status changes can be written only by `owner`.
- A user must not be able to create or modify their own membership to escalate
  role.
- Members can be read only by active group members.
- Member writes are allowed only for `owner` and `leader`.
- Meetings and attendance can be read by active group members.
- Meetings and attendance can be written only by `owner` and `leader`.
- Pastoral notes can be read and written only by `owner` and `leader`.
- `viewer` cannot write group data.
- `documentId` is sensitive. If `viewer` should not see document ids, member
  summaries for viewers may require a separate sanitized collection or a Cloud
  Function/API later, because Firestore rules cannot hide individual fields
  from a readable document reliably.

Before real production use, write and test rules with the Firebase Emulator
Suite and explicit allow/deny test cases for every role.

## Official Excel To Firestore Initial Import

Updated product decision: the first real production data load should come from
the official church Excel file, not from localStorage.

Required flow:

```txt
Excel oficial de la iglesia
-> parser/normalizacion
-> preview obligatorio
-> confirmacion explicita
-> escritura controlada en Firestore
```

Do not use seeds, demo data, local development data, or localStorage test data
as the first production source.

Before writing imported members:

- Require a remote destination group.
- Authorize with active group membership, not `defaultGroupId` alone.
- Allow import only for `owner` and `leader`.
- Deny import to `viewer`, inactive members, and unaffiliated users.
- Define remote member and private profile paths.
- Add Firestore Rules and rules tests for those paths.
- Keep `pnpm test:rules` passing.
- Require preview and explicit confirmation.
- Do not upload or store the original Excel file.

## LocalStorage To Firestore Migration

Status: deferred / optional.

This is no longer the immediate next production path. Revisit only if users
have real localStorage data that must be preserved. Do not migrate seeds, demo
data, local development data, or local test data.

### Keep Local Mode

Keep local-only mode available. It is part of the product's privacy posture and
allows the app to remain useful without accounts, network access, or remote
sync.

### Migration Trigger

If this optional path is resumed later, migration should be manual and
explicit:

- Never upload local data automatically after sign-in.
- Explain that member, attendance, document, and pastoral data will be copied
  to Firebase.
- Require confirmation before upload.
- Let the user choose the destination group or create a new group.

### Destination Group

If localStorage migration is needed later, the user should select:

- Create a new remote group from local data.
- Merge local data into an existing remote group where they are `owner` or
  `leader`.

For any future localStorage migration version, prefer "create new remote group"
because it reduces accidental merges and duplicate handling.

### Existing Remote Data

If the destination group already has data:

- Show a preview of counts and conflicts before writing.
- Do not overwrite pastoral notes or attendance silently.
- Use deterministic matching where possible.
- Ask for confirmation on merge.

### Duplicate Avoidance

Member matching order:

1. Match by `documentId` when both local and remote members have it.
2. Otherwise match by exact local id only if the remote record was previously
   migrated from the same local dataset.
3. Avoid aggressive full-name deduplication in the first version.

Meeting matching:

- Match meetings by `date`.
- Preserve `cancelled` status and cancellation reason.
- If remote and local meeting states conflict, show a conflict in the preview.

Attendance:

- Preserve attendance by mapping local member ids to remote member ids.
- Preserve attended/missed state for held meetings.
- Do not create attendance records for cancelled meetings.

Pastoral notes:

- Preserve note content and creation chronology.
- Store migrated notes under
  `groups/{groupId}/members/{memberId}/pastoralNotes/{noteId}`.
- Include `createdBy` as the migrating user if original author metadata is not
  available.

Imported members:

- Preserve imported church-system fields.
- Use `documentId` for imported-member upserts inside the destination group.
- Existing local members without `documentId` remain valid.

## Zustand And Firestore Coexistence

Zustand should remain the app's state layer. Firestore should be introduced
behind data functions and store actions, not directly inside screen components.

Recommended responsibilities:

- Zustand: selected group id, auth session summary, loading/error states,
  optimistic local state, local-only data, pending writes, and UI state.
- Firestore: remote source of truth for authenticated group data.
- localStorage: local-only mode and cached client state. Avoid storing remote
  sensitive data longer than needed unless the product explicitly accepts that
  offline cache behavior.

Synchronization model:

- On selected group load, subscribe to group, members, meetings, attendance,
  and relevant pastoral notes according to role.
- Writes go through store actions that update local UI state and then write to
  Firestore.
- Remote write errors should roll back or clearly mark failed pending changes.
- Offline writes can be queued by Firestore persistence only after deciding
  whether local device cache of sensitive data is acceptable.

Offline strategy:

- Local-only mode continues to work offline.
- Authenticated remote mode may show last loaded data if cache is enabled, but
  must clearly handle pending/failed writes.
- Do not enable broad offline persistence for sensitive remote data without a
  privacy decision.

## Privacy And Sensitive Data

Sensitive fields:

- `documentId`.
- Pastoral notes.
- Attendance history.
- Member status.
- Service data such as server/serving fields.
- Group membership and role assignments.

Privacy requirements:

- No analytics for now.
- No crash or remote logging with member data.
- No console logging of document ids, pastoral notes, imported rows, or XLSX
  contents.
- Minimum privilege by role.
- Pastoral notes restricted to `owner` and `leader`.
- Multi-leader groups need clear role governance because every leader can see
  sensitive pastoral information.
- Review Firestore rules before real production use with church data.
- Prefer explicit user confirmation before any local data leaves the device.

## Future XLSX Processing With Storage And Cloud Functions

This is not part of initial Phase 2.

A future remote import flow could be:

```txt
Frontend uploads .xlsx to Firebase Storage
Cloud Function processes the file
Function generates ImportPreview or writes normalized records
Firestore stores import status and result
Frontend shows validation errors and import result
```

Benefits:

- Keeps heavy parsing out of the browser.
- Allows consistent validation for all users.
- Can store import progress and errors.

Risks:

- Uploads sensitive files to Firebase Storage.
- Requires strict Storage rules and short retention.
- Requires Cloud Functions, operational monitoring, and explicit privacy
  approval.

Do not implement this until the Auth/Firestore model and privacy boundaries are
in place.

## Implementation Phasing

Recommended sequence after this design phase:

1. Create Firebase Auth implementation with one provider.
2. Add user profile document creation.
3. Add group creation and first-owner membership.
4. Add group selector and default group behavior.
5. Add Firestore rules and emulator tests.
6. Design official Excel -> Firestore initial import.
7. Implement local XLSX parser to `ImportPreview` without Firestore writes.
8. Add member/private profile rules and tests.
9. Add confirmed imported-member writes to Firestore.
10. Read remote members from Firestore.
11. Add remote member create/edit, then meetings, attendance, and pastoral
    notes.
12. Consider localStorage -> Firestore migration only if real local data must
    be preserved.

## Open Decisions

- Start with Google Sign-In only, or support Google plus email/password.
- Whether local-only mode remains the default first-run experience after Auth
  exists.
- Whether viewers can see member documents that contain `documentId`, or
  whether a sanitized viewer-specific projection is required.
- Whether Firestore offline persistence is acceptable for sensitive remote
  data.
- Whether owner invitations are manual first, or require invite documents and
  email delivery.
- Whether local notes stored on members become pastoral-note documents during
  a future optional localStorage migration.
- Whether XLSX parsing should be browser-local, Storage + Cloud Functions, or
  both behind the existing import contract.
