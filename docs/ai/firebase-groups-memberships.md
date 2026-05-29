# Firebase Groups And Memberships

## Scope

Phase 4 adds the first remote multi-group structure for authenticated users.
It creates remote group identity, memberships, user group lookup records, and
`defaultGroupId` handling.

It does not migrate local FollowUpGC data. Members, meetings, attendance,
cancelled meetings, pastoral notes, import data, and local settings still use
Zustand persist with browser `localStorage`.

## Collections

```txt
groups/{groupId}
  name
  regularWeekday?
  createdBy
  createdAt
  updatedAt
  archivedAt?

groups/{groupId}/memberships/{userId}
  groupId
  userId
  role
  displayName?
  email?
  joinedAt
  status

users/{userId}
  uid
  displayName
  email
  defaultGroupId?
  createdAt
  updatedAt

users/{userId}/groupMemberships/{groupId}
  groupId
  userId
  groupName
  role
  displayName?
  email?
  joinedAt
  status
  updatedAt
```

`groups/{groupId}/memberships/{userId}` is the authoritative permission
record. `users/{userId}/groupMemberships/{groupId}` is a denormalized lookup
for fast "my groups" loading.

## Group Creation Flow

When an authenticated user creates a first remote group, the app writes a
single batch:

1. `groups/{groupId}` with the group name, regular weekday, creator, and
   timestamps.
2. `groups/{groupId}/memberships/{uid}` with `role: owner` and
   `status: active`.
3. `users/{uid}/groupMemberships/{groupId}` as the user's group list lookup.
4. `users/{uid}.defaultGroupId` only when the profile does not already have one.
5. `users/{uid}.updatedAt`.

No local member, meeting, attendance, note, import, or document-id data is
uploaded.

## Roles

- `owner`: owns group-level administration and can manage memberships.
- `leader`: reserved for future group data writes such as members, meetings,
  attendance, and pastoral notes.
- `viewer`: read-only role for future group data.

A user can have different roles in different groups. A group can have multiple
leaders.

## defaultGroupId

`defaultGroupId` is a user preference, not a permission grant.

Login/session behavior:

- If `defaultGroupId` exists and the user has an active membership for that
  group, it becomes the current remote group.
- If `defaultGroupId` exists but no active membership matches it, the app does
  not use it.
- If there is no valid default and the user has exactly one active group, that
  group is selected for the current session.
- If there are multiple active groups and no valid default, the user selects a
  group from the basic selector.
- The UI can update `defaultGroupId` only to a group where the user has active
  membership. Firestore rules also validate this.

## Firestore Rules

`firestore.rules` is wired through `firebase.json`.

Initial rule intent:

- No public access.
- Signed-in users can read/write their own user profile with limited fields.
- `defaultGroupId` updates require an active authoritative membership.
- Authenticated users can create a group.
- The creator can create the first owner membership.
- Active group members can read the group and group memberships.
- Owners can manage membership records.
- User membership lookup records must mirror authoritative memberships.
- Future member/meeting/attendance reads require active membership.
- Future member/meeting/attendance writes require `owner` or `leader`.
- Future pastoral notes require `owner` or `leader`.

Known limitations before remote pastoral data is stored:

- Rules do not yet have emulator test coverage in this repo.
- Rules cannot hide individual fields from readable Firestore documents, so
  viewer access to future member documents that include `documentId` still
  needs a sanitized projection or a stricter access decision.
- Rules do not yet enforce "last owner" protection.
- Invitations and owner-managed assignment flows are not implemented.

## Manual Test

1. Configure `.env.local` from `.env.example`.
2. Run `pnpm dev`.
3. Sign in with Google or email/password.
4. Confirm the session panel shows the authenticated user.
5. Confirm that a user with no remote groups sees "No tienes grupos remotos
   todavía".
6. Create the first group.
7. Confirm Firestore has `groups/{groupId}`.
8. Confirm Firestore has `groups/{groupId}/memberships/{uid}` with
   `role: owner` and `status: active`.
9. Confirm Firestore has `users/{uid}/groupMemberships/{groupId}`.
10. Confirm `users/{uid}.defaultGroupId` is set when the user had none.
11. Sign out and sign in again.
12. Confirm the default group loads when its membership remains active.
13. Confirm members, meetings, attendance, notes, imports, and document ids
    remain only in localStorage.

## Out Of Scope

- LocalStorage to Firestore migration.
- Remote sync for members, meetings, attendance, cancelled meetings, or notes.
- Real XLSX import.
- Firebase Storage.
- Cloud Functions.
- Invitations and email delivery.
- Advanced role administration UI.
- Final exhaustive Firestore rules for all future collections.
- Analytics.

## Next Steps

- Add emulator-backed Firestore rule tests before storing real pastoral data.
- Design owner-managed leader/viewer assignment.
- Build an explicit localStorage migration preview with user confirmation.
- Decide viewer access and sanitized member projections before uploading member
  records.
