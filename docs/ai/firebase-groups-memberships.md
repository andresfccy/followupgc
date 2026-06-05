# Firebase Groups And Memberships

## Scope

Firebase groups and memberships are the production identity and authorization
layer for FollowUpGC. They create remote group identity, memberships, user group
lookup records, `defaultGroupId` handling, and owner-managed role/status
changes.

They do not migrate local FollowUpGC data. Legacy localStorage/demo data is
retired and must not be uploaded to Firestore.

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
  updatedAt?

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
- `leader`: can manage production group data such as members, meetings,
  attendance, imports, and pastoral notes.
- `viewer`: read-only role for allowed group data.

A user can have different roles in different groups. A group can have multiple
leaders and multiple owners.

## Membership Administration

Phase 5K adds owner-managed administration for existing memberships.

- The UI lists `groups/{groupId}/memberships/{uid}` in the Parametros panel.
- Only active owners can request membership changes.
- Changes go through the `updateGroupMembership` Cloud Function.
- The callable updates the authoritative membership and the user's lookup
  mirror in one transaction.
- The callable protects the group from losing its last active owner.
- This phase assigns `leader` or `viewer`; assigning new `owner` users remains
  out of scope.
- Invitations and creation of memberships for users who are not already in the
  group remain out of scope.

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
- Direct client writes can create only the first owner membership in the same
  batch as group creation.
- Later membership role/status changes go through the `updateGroupMembership`
  Cloud Function.
- User membership lookup records must mirror authoritative memberships.
- Future member/meeting/attendance reads require active membership.
- Future member/meeting/attendance writes require `owner` or `leader`.
- Future pastoral notes require `owner` or `leader`.

Known limitations before remote pastoral data is stored:

- Rules have emulator test coverage in `tests/firestore.rules.test.mjs`, but
  the suite must be run in an environment with Java installed.
- Rules cannot hide individual fields from readable Firestore documents, so
  viewer access to future member documents that include `documentId` still
  needs a sanitized projection or a stricter access decision.
- Last active owner protection is implemented in the `updateGroupMembership`
  Cloud Function, not in Firestore Rules.
- Invitations are not implemented.

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
13. As owner, change an existing membership to `leader` or `viewer`.
14. Confirm Firestore updates both `groups/{groupId}/memberships/{uid}` and
    `users/{uid}/groupMemberships/{groupId}`.
15. Confirm the UI does not allow direct localStorage/demo persistence.

## Out Of Scope

- LocalStorage to Firestore migration.
- Invitations and email delivery.
- Assigning additional owners.
- Creating memberships for users who are not already in the group.
- Final exhaustive Firestore rules for future collections.
- Analytics.

## Next Steps

- Design invitations and user discovery before creating memberships for users
  who are not already in the group.
- Decide whether owner assignment should be supported and what extra audit or
  confirmation it requires.
- Keep mirror synchronization in controlled write paths.
