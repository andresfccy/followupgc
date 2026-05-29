# Firebase XLSX Backend Processing

## Scope

Phase 5B processes the official church XLSX in backend/serverless
infrastructure and generates an import preview.

The frontend does not parse XLSX. It only:

- creates an import run;
- uploads the file to Firebase Storage;
- listens to Firestore status and preview data;
- shows summary/errors/preview rows;
- leaves final confirmation and member writes for a later phase.

## Flow

```txt
owner/leader selects remote group
-> frontend creates groups/{groupId}/importRuns/{importRunId}
-> frontend uploads XLSX to imports/{groupId}/{importRunId}/source.xlsx
-> Cloud Function triggers on Storage finalize
-> function marks importRun processing
-> function reads XLSX and first sheet
-> function validates expected columns
-> function normalizes rows
-> function writes summary/errors/previewRows
-> function marks importRun preview_ready or failed
```

## Storage Path

```txt
imports/{groupId}/{importRunId}/source.xlsx
```

The source file remains in Storage for this phase. Before broad production use,
define retention or deletion behavior. Do not log file contents or full
document ids.

## Cloud Function

Function:

```txt
processChurchXlsxImport
```

Trigger:

```txt
onObjectFinalized
```

It ignores files outside the expected `imports/{groupId}/{importRunId}/source.xlsx`
path.

## importRun Model

```txt
groups/{groupId}/importRuns/{importRunId}
  groupId
  startedBy
  source: "church-xlsx"
  fileName?
  storagePath
  status
  startedAt
  updatedAt
  completedAt?
  summary?
  errors?
  previewRowCount?

groups/{groupId}/importRuns/{importRunId}/previewRows/{rowId}
  rowNumber
  action: "create" | "update"
  firstName
  lastName
  fullName
  documentIdHash
  gender?
  birthday?
  joinedAt?
  groupRole?
  semesterAttendances?
  isServer?
  isServing?
```

`documentId` is not stored in preview rows. The function stores a SHA-256 hash
for matching/display context.

## Statuses

- `uploaded`: frontend created the run and/or uploaded the file.
- `processing`: Cloud Function is processing the XLSX.
- `preview_ready`: preview rows, summary, and errors are available.
- `failed`: processing failed.
- `cancelled`: reserved for future cancellation flow.

## Normalization

Required columns:

- `Nombre`
- `Apellidos`
- `Documento`

Supported columns:

- `Genero` / `Género`
- `Cumpleaños`
- `En Grupo Desde`
- `Rol en Grupo`
- `Asistencias Semestre`
- `Servidor`
- `Esta Sirviendo`

Mapping:

- `Nombre` -> `firstName`
- `Apellidos` -> `lastName`
- `Nombre + Apellidos` -> `fullName`
- `Documento` -> `documentIdHash`
- `Género` -> `gender: "F" | "M"`
- `Cumpleaños` -> `birthday: MM-dd`
- `En Grupo Desde` -> `joinedAt: yyyy-MM-dd`
- `Rol en Grupo` -> `groupRole`
- `Asistencias Semestre` -> `semesterAttendances`
- `Servidor` -> `isServer`
- `Esta Sirviendo` -> `isServing`

Boolean values accept `Si`, `Sí`, `SI`, `sí`, `true`, `x`, `1`, `No`, `NO`,
`false`, `0`, and empty values.

## Privacy

- No public reads or writes.
- Uploads are restricted by Storage Rules to authenticated `owner` or `leader`
  memberships.
- Uploads are limited to 20 MB and XLSX-compatible content types.
- Firestore importRun creation/read is restricted to `owner` or `leader`.
- `viewer`, inactive members, signed-out users, and unaffiliated users cannot
  create import runs.
- `viewer` cannot read previewRows.
- Clients cannot write previewRows; only Cloud Functions/Admin SDK writes them.
- The frontend does not parse XLSX.
- The function must not log document ids or raw row contents.
- The final member/private profile model is not written in this phase.

## What This Phase Does Not Do

- It does not write final members.
- It does not create member private profiles.
- It does not make remote members the primary app source.
- It does not migrate localStorage.
- It does not process meetings, attendance, or pastoral notes.
- It does not implement final confirmation.

## Local Testing

Install function dependencies:

```bash
cd functions
pnpm install
```

Build functions:

```bash
cd functions
pnpm build
```

Run emulators from the repo root:

```bash
firebase emulators:start --only functions,firestore,storage
```

Run frontend separately:

```bash
pnpm dev
```

For rules:

```bash
pnpm test:rules
pnpm test:storage-rules
```

Storage Rules tests require both Firestore and Storage emulators because upload
authorization checks authoritative group memberships in Firestore.

## Deploy

Production deployment requires Firebase project configuration and may require
the Firebase Blaze plan for Cloud Functions and Storage.

Build and deploy:

```bash
cd functions
pnpm build
cd ..
firebase deploy --only functions,firestore:rules,storage
```

Hosting deploy remains:

```bash
pnpm build
firebase deploy --only hosting
```

## Risks

- Storage file retention/deletion is not finalized.
- Final import writes still need a controlled backend confirmation path.
- Update detection is limited until the private profile model exists; current
  matching checks `memberPrivateProfiles.documentIdHash` when present.
- Viewer access to public member docs depends on keeping full document ids and
  private fields out of those docs.
- Cloud Functions/Storage production use may require billing setup.

## Next Phases

- Phase 5C: completed security model, Firestore Rules tests, and Storage Rules
  tests for importRuns, previewRows, members, private profiles, and XLSX
  uploads.
- Phase 5D: confirmed backend write of imported members to Firestore after
  explicit preview confirmation.
- Phase 5E: read remote members from Firestore.
