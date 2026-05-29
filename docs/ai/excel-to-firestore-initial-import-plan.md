# Excel To Firestore Initial Import Plan

## Objective

Define the first real production data load for FollowUpGC.

The first production load must come from:

```txt
Excel oficial de la iglesia
-> parser/normalizacion
-> preview obligatorio
-> confirmacion explicita
-> escritura controlada en Firestore
```

It must not come from seeds, local development data, demo data, or
localStorage used during development.

## Scope

- Import members from the official church Excel file.
- Normalize the official columns into the existing import contract.
- Require a remote destination group.
- Require the signed-in user to be `owner` or `leader` of that group.
- Generate an `ImportPreview` before any write.
- Require explicit confirmation before writing to Firestore.
- Process the XLSX in Firebase Cloud Functions after upload to Firebase
  Storage.
- Write imported members only through controlled backend functions in a later
  phase.
- Keep local/demo/fallback mode available.

Official Excel columns:

- `Nombre`
- `Apellidos`
- `Documento`
- `Genero` / `Género`
- `Cumpleaños`
- `En Grupo Desde`
- `Rol en Grupo`
- `Asistencias Semestre`
- `Servidor`
- `Esta Sirviendo`

Existing contract:

- `ChurchMemberImportRow`
- `ImportPreview`
- `ImportResult`
- `parseImportFile(file): Promise<ImportPreview>`
- `confirmImport(preview): ImportResult`
- `buildImportPreview(rows, existingMembers)`

## Out Of Scope

- Migrating localStorage to Firestore.
- Migrating seeds, demo data, or local development data.
- Processing XLSX in the browser.
- Writing final member records during Phase 5B.
- Members private profile finalization.
- Remote sync for meetings, attendance, or pastoral notes.
- Advanced invitations or role administration.
- Analytics.

## Expected Flow

1. User signs in.
2. User selects or creates a remote group.
3. App confirms the user is `owner` or `leader` for the destination group.
4. User selects the official church Excel file locally.
5. Frontend creates `groups/{groupId}/importRuns/{importRunId}`.
6. Frontend uploads the file to
   `imports/{groupId}/{importRunId}/source.xlsx` in Firebase Storage.
7. Cloud Function processes the file and builds the preview.
8. Preview shows counts, validation errors, create/update estimates, and
   conflicts.
9. User explicitly confirms in a later phase.
10. Backend writes imported members to Firestore in a controlled write phase.

## Parser Strategy

### Phase 5B: Storage + Cloud Functions Parser

Recommended next implementation:

- Add the XLSX parsing dependency only to `functions/`.
- Frontend must not parse the XLSX.
- Frontend uploads the file to Firebase Storage and listens to importRun state.
- Cloud Function reads the XLSX, normalizes rows, validates rows, and writes
  preview data.
- Do not write final member records yet.
- Store the original file temporarily in Storage at
  `imports/{groupId}/{importRunId}/source.xlsx`.
- Document lifecycle/future deletion for uploaded originals.

### Why Not Browser Parsing

The product decision is to avoid reading XLSX files in the browser. Backend
processing centralizes parsing, validation, and future confirmed writes, while
the frontend remains responsible for upload, status, preview, and confirmation.

## Remote Member Model

Before writing real imported members, define the remote member shape under a
group, for example:

```txt
groups/{groupId}/members/{memberId}
  firstName
  lastName
  fullName
  gender?
  birthday?
  joinedAt?
  groupRole?
  semesterAttendances?
  isServer?
  isServing?
  status
  createdAt
  updatedAt
  importedFrom?
  lastImportId?
```

`documentId` is sensitive. Do not place it in a broad-readable member document
until viewer access is decided.

## Public And Private Data Split

Firestore Rules cannot hide individual fields from a readable document.
Because `documentId` is sensitive, use a private profile or sensitive
subdocument before allowing viewer access to members.

Possible shape:

```txt
groups/{groupId}/members/{memberId}
  public/member-operational fields safe for active member reads

groups/{groupId}/memberPrivateProfiles/{memberId}
  documentId
  importSource
  importRawFingerprint?
  updatedAt
```

Rules should likely allow:

- Active group members to read safe member summaries only after viewer policy
  is decided.
- `owner` and `leader` to read/write private profiles.
- `viewer` not to read private profiles.

## Privacy Rules

- No public access.
- `owner` and `leader` can import.
- `viewer` cannot import.
- Inactive members cannot import.
- Users without membership cannot import.
- Do not log document ids, raw rows, or file contents.
- Do not store the original Excel file in app state, localStorage, or
  Firestore. The file is stored temporarily in Firebase Storage for backend
  processing.
- Do not expose full document ids in dense UI.
- Do not write members until Firestore Rules and Storage Rules tests cover the
  remote member paths, private profile paths, importRuns, previewRows, and XLSX
  uploads.

## Destination Group

Every import must target one remote group:

- The group must already exist.
- The signed-in user must have active membership.
- The signed-in user must be `owner` or `leader`.
- The import must not infer destination from `defaultGroupId` alone.

`defaultGroupId` may preselect a destination, but authorization must come from
`groups/{groupId}/memberships/{uid}`.

## Preview Required

Preview is mandatory before writes.

The preview should include:

- Total rows.
- Valid rows.
- Invalid rows.
- Create count.
- Update count.
- Validation errors.
- Duplicate `documentId` rows.
- Conflicts with existing remote members.
- Fields that will be written.
- Fields that will not be written.

## Explicit Confirmation

The confirmation step must explain:

- Data will be written to Firestore.
- The selected destination group.
- The user's role in that group.
- Number of members to create/update.
- Sensitive fields included, especially `documentId`.
- Original Excel file is stored in Firebase Storage for backend processing and
  will follow the retention/deletion policy defined before broad production
  use.

No Firestore writes should happen before confirmation.

## Duplicate Strategy

Primary matching key:

1. `documentId` within the destination group.

Do not use aggressive full-name deduplication in v1.

Within a single Excel file:

- Duplicate `documentId` rows should be reported in preview.
- The app should not silently choose a row.

Against existing remote data:

- Same `documentId` means update/merge candidate.
- Missing `documentId` is invalid for imported rows.
- Name-only matches are warnings at most, not automatic merges.

## Conflict Strategy

Preview should flag conflicts before writing, for example:

- Same `documentId` with different name.
- Same `documentId` with different birthday.
- Existing remote member marked inactive but Excel row appears active.
- Existing private profile has a different sensitive identifier.

First implementation should prefer conservative behavior:

- Show conflicts.
- Require explicit confirmation.
- Avoid overwriting pastoral/local-only fields.
- Do not touch meetings, attendance, or notes.

## Import Metadata

Store metadata for traceability without storing the original file.

Possible shape:

```txt
groups/{groupId}/importRuns/{importRunId}
  startedBy
  source: "church-xlsx"
  fileName?
  storagePath
  status
  startedAt
  updatedAt
  completedAt?
  summary
  errors?
```

Preview rows may be stored in:

```txt
groups/{groupId}/importRuns/{importRunId}/previewRows/{rowId}
```

Do not store raw rows or full file contents in Firestore. The original file is
stored in Storage during this backend-processing phase and needs lifecycle or
manual deletion policy before broad production use.

## Rules And Tests Required Before Writing

Before any imported member is written:

- Define remote member and private profile paths.
- Add Firestore Rules for those paths.
- Add Storage Rules tests for XLSX upload/read boundaries.
- Extend rules tests for:
  - `owner` import allowed.
  - `leader` import allowed.
  - `viewer` import denied.
  - inactive member denied.
  - unaffiliated user denied.
  - private profile read denied to viewer.
  - document id path protected.
- `pnpm test:rules` must pass.
- `pnpm test:storage-rules` must pass.

Do not start member writes if `pnpm test:rules` or `pnpm test:storage-rules`
fails.

## Future Phases

- Phase 5B: Storage + Cloud Functions XLSX processing to `ImportPreview`; no
  final member writes.
- Phase 5C: completed Firestore Rules, Storage Rules, and emulator tests for
  importRuns, previewRows, members, private profiles, roles, and XLSX uploads.
- Phase 5D: confirmed backend Firestore writes for imported members.
- Phase 5E: read remote members from Firestore.
- Phase 5F: remote member create/edit.
- Phase 5G: remote meetings and attendance.
- Phase 5H: remote pastoral notes.
- Optional future: localStorage to Firestore migration only if users have real
  local data that must be preserved.

## Pending Risks

- Viewer access is allowed only for public member docs that exclude full
  `documentId`, phone, birthday, and pastoral notes.
- Decide whether `documentIdHash` should remain on viewer-readable public
  member docs or move to a stricter private/lookup path before broad
  production use.
- Last-owner protection is still unresolved.
- Membership mirrors must stay synchronized with authoritative memberships.
- Import conflicts can corrupt trust if preview is weak.
- Storage keeps the source XLSX during this phase; retention/deletion policy
  must be finalized.
- Cloud Functions and Storage may require Firebase Blaze plan in production.
