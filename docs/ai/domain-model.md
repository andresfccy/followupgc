# Domain Model

Read this before changing member, session, attendance, timeline, or settings
data.

## Core Types

- `Member`: a person in the group.
- `GroupSession`: a scheduled cell-group date. It may be `held` or
  `cancelled`.
- `AttendanceRecord`: one person's attendance result for a held session.
- `TimelineEntry`: a chronological pastoral note for one member.
- `GroupSettings`: group-level settings, currently `meetingWeekday` and
  `groupName`.
- `GroupData`: persisted root object.
- `ChurchMemberImportRow`: normalized member row imported from the church
  system. It requires `documentId`.
- `ImportPreview` and `ImportResult`: import validation and commit contracts.

Source of truth: `src/domain/types.ts`.

## Domain Rules

- Cancelled sessions remain in history and may include a comment.
- Attendance applies to held sessions. The UI should not ask for attendance on
  cancelled sessions.
- Timeline entries belong to members and should remain chronological.
- Weekdays use JavaScript `Date#getDay()` values: `0` Sunday through `6`
  Saturday.
- Prefer additive fields over renaming stored fields.
- `Member.joinedAt` is the canonical domain field for "En Grupo Desde".
- Imported Excel member fields are member data, not temporary metadata.
- Existing members may lack `documentId`; imported rows may not.
- Reimports upsert by `documentId` and must preserve local pastoral and
  operational data.

## Church Member Import Mapping

- `Nombre` -> `ChurchMemberImportRow.firstName` -> `Member.firstName`
- `Apellidos` -> `ChurchMemberImportRow.lastName` -> `Member.lastName`
- `Documento` -> `documentId`
- `Genero` / `Género` -> `gender`
- `Cumpleaños` (`MM/dd`) -> `birthday` (`MM-dd`)
- `En Grupo Desde` -> `ChurchMemberImportRow.joinedGroupAt` ->
  `Member.joinedAt`
- `Rol en Grupo` -> `groupRole`
- `Asistencias Semestre` -> `semesterAttendances`
- `Servidor` (`Si`/`No`) -> `isServer`
- `Esta Sirviendo` (`Si`/`No`) -> `isServing`

## Persistence Impact

Any change to `GroupData` may affect existing `localStorage` data. Before
changing stored shapes, read `docs/ai/data-persistence.md` and decide whether a
Zustand persist migration is needed.

## Seed Data

Update `src/domain/seed.ts` only when a new domain concept needs a visible
example for development or manual QA. Keep seed data realistic and pastoral,
not corporate.
