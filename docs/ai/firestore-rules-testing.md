# Firestore Rules Testing

## Purpose

Phase 4.5 added automated Firestore Security Rules tests before any local
pastoral data is migrated to Firestore. Phase 5C expanded the suite for
importRuns, previewRows, public member docs, and private profiles. Phase 5H
adds remote meetings and attendance coverage. Phase 5I adds pastoral note
coverage. Phase 5J adds group settings update coverage.

The tests validate that `firestore.rules` protects the remote identity layer:

- `users/{uid}`
- `groups/{groupId}`
- `groups/{groupId}/memberships/{uid}`
- `users/{uid}/groupMemberships/{groupId}`
- `users/{uid}.defaultGroupId`
- `groups/{groupId}/importRuns/{importRunId}`
- `groups/{groupId}/importRuns/{importRunId}/previewRows/{rowId}`
- `groups/{groupId}/members/{memberId}`
- `groups/{groupId}/members/{memberId}/private/profile`
- `groups/{groupId}/members/{memberId}/pastoralNotes/{noteId}`
- `groups/{groupId}/meetings/{meetingId}`
- `groups/{groupId}/meetings/{meetingId}/attendance/{memberId}`

These tests do not confirm/import final members, migrate localStorage, or move
legacy local settings.

## How To Run

Prerequisites:

- Firebase CLI available as `firebase`.
- Java 21+ available on `PATH`, required by the Firestore Emulator.
- Dependencies installed with `pnpm install`.

Run:

```bash
pnpm test:rules
```

Storage Rules are covered separately:

```bash
pnpm test:storage-rules
```

The script runs:

```bash
firebase emulators:exec --project demo-followupgc-rules --only firestore "node --test tests/firestore.rules.test.mjs"
```

The Storage Rules script runs:

```bash
firebase emulators:exec --project demo-followupgc-rules --only firestore,storage "node --test tests/storage.rules.test.mjs"
```

The test file uses `@firebase/rules-unit-testing` and Node's built-in test
runner. Vitest is intentionally not added because these tests only need a small
rules-focused runner.

## Latest Result

Phase 5J validation uses Java 21 and the Firebase emulators.

Latest result:

- `java -version`: OpenJDK 21.0.11.
- `pnpm test:rules`: 38 tests executed, 38 passed, 0 failed, exit code 0.
- `pnpm test:storage-rules`: 4 tests executed, 4 passed, 0 failed, exit code
  0.
- Firestore and Storage emulators started and shut down correctly.

Before importing or migrating sensitive data to Firestore, both suites must
keep passing. Do not start the official Excel import write phase or any future
localStorage to Firestore migration if `pnpm test:rules` fails. Do not rely on
XLSX uploads if `pnpm test:storage-rules` fails.

## Covered Cases

Signed-out access:

- Cannot read `users/{uid}`.
- Cannot read `groups/{groupId}`.
- Cannot create groups.
- Cannot read group memberships.

User profiles:

- A signed-in user can create, read, and update their own allowed profile
  fields.
- A signed-in user cannot read or write another user's profile.
- `defaultGroupId` is denied when the user does not have active authoritative
  membership.
- `defaultGroupId` is allowed when the user has active authoritative
  membership.

Group creation:

- A signed-in user can create a valid group and their initial owner membership
  in the same batch.
- A signed-in user cannot create a group with `createdBy` set to another uid.
- A signed-in user cannot create an initial owner membership for another user.
- A signed-in user cannot create a self-owner membership later for an existing
  group where they have no membership.

Group reads:

- Active `owner`, `leader`, and `viewer` can read the group.
- `inactive` members cannot read the group.
- Users without membership cannot read the group.

Group settings:

- Only active `owner` users can update group settings.
- `leader`, `viewer`, inactive members, signed-out users, and unaffiliated
  users cannot update group settings.
- Group settings updates require the expected shape, non-empty `name`,
  `regularWeekday` between `0` and `6`, and stable `createdBy`.

Memberships and mirrors:

- Active group members can read memberships under the current rules.
- Fake user membership mirrors are denied without an authoritative membership.
- Mirrors must match the authoritative role and status.
- Users cannot grant themselves `owner` through a mirror record.

Critical writes:

- Only `owner` can update membership roles/statuses.
- `leader` cannot promote themselves to `owner`.
- `viewer`, `inactive`, and users without membership cannot write.
- `owner` and `leader` can write future group data paths currently reserved by
  rules; `viewer`, `inactive`, and unaffiliated users cannot.

Meetings and attendance:

- `owner` and `leader` can create, read, and update meetings.
- `viewer` can read meetings but cannot update or delete them.
- Direct client meeting delete is denied; deletion goes through the callable
  function.
- Meeting writes require the expected shape.
- Active members can read attendance.
- `owner` and `leader` can write attendance for held meetings.
- Attendance writes require the expected shape, an existing held meeting, and
  an existing public member document.
- `viewer`, inactive members, signed-out users, and unaffiliated users cannot
  write attendance.

Import runs:

- `owner` and `leader` can create/read importRuns.
- `viewer`, inactive members, signed-out users, and unaffiliated users cannot
  create importRuns.
- Clients cannot update importRuns after creation.
- Clients cannot write previewRows; Cloud Functions/Admin SDK writes those.
- `owner` and `leader` can read previewRows.
- `viewer` cannot read previewRows.

Public members:

- `owner` and `leader` can create, read, and update public member docs.
- `viewer` can read public member docs.
- `viewer`, inactive members, signed-out users, and unaffiliated users cannot
  write public member docs.
- Inactive members, signed-out users, and unaffiliated users cannot read public
  member docs.
- Public member docs cannot contain full `documentId`.

Private profiles:

- `owner` and `leader` can read and write
  `groups/{groupId}/members/{memberId}/private/profile`.
- `viewer`, inactive members, signed-out users, and unaffiliated users cannot
  read or write private profiles.

Pastoral notes:

- `owner` and `leader` can create, read, update, and delete pastoral notes.
- `viewer`, inactive members, signed-out users, and unaffiliated users cannot
  read or write pastoral notes.
- Pastoral notes require the expected shape, an existing public member, route
  `memberId` consistency, valid note type, non-empty body, and stable
  `createdBy`.

Storage uploads:

- `owner` and `leader` can upload/read
  `imports/{groupId}/{importRunId}/source.xlsx`.
- `viewer`, inactive members, signed-out users, and unaffiliated users cannot
  upload or read source XLSX files.
- Uploads require XLSX-compatible content type and are limited to 20 MB.
- Client overwrite and delete are denied.

## Rules Change From Phase 4.5

The self-owner initial membership rule was tightened. A user can create their
own first `owner` membership only when the group is being created in the same
request/batch. This prevents a user listed as `createdBy` on an already
existing group from later creating a new self-owner membership without current
authorization.

## Not Covered Or Still Limited

- Last-owner protection is not implemented. Firestore Rules cannot reliably
  count all remaining owners in a group. This should be handled later with a
  controlled transactional write path, and may require Cloud Functions or a
  carefully designed owner-count document.
- Viewer can read public member docs only because full `documentId`, phone,
  birthday, and pastoral notes are excluded from that document. Revisit whether
  `documentIdHash` should remain viewer-readable before broad production use.
- Firestore and Storage Rules tests use the emulator with project id
  `demo-followupgc-rules` because Storage Rules consult Firestore membership
  documents and both suites must share the same project id.
- Membership mirrors must remain synchronized with authoritative memberships in
  `groups/{groupId}/memberships/{uid}`.
- Rules must be extended and re-tested whenever new remote collections are
  added.
- Invitation flows and advanced role administration are not implemented.

## Relationship To Migration

These tests are the security gate before Phase 5D. The next production data
path is official Excel -> Firestore, not localStorage -> Firestore. The import
write phase must not write members, private profiles, document ids,
attendance, or notes unless `pnpm test:rules` and `pnpm test:storage-rules` are
passing in the target environment and the import flow requires destination
group selection, preview, and explicit confirmation.
