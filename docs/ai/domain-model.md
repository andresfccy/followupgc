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

Source of truth: `src/domain/types.ts`.

## Domain Rules

- Cancelled sessions remain in history and may include a comment.
- Attendance applies to held sessions. The UI should not ask for attendance on
  cancelled sessions.
- Remote attendance is stored under
  `groups/{groupId}/meetings/{meetingId}/attendance/{memberId}`. The document
  id is the member id, so each member has one attendance status per meeting.
- Timeline entries belong to members and should remain chronological.
- Weekdays use JavaScript `Date#getDay()` values: `0` Sunday through `6`
  Saturday.
- Prefer additive fields over renaming stored fields.
- `Member.joinedAt` is the canonical domain field for "En Grupo Desde".
- Imported Excel member fields are member data, not temporary metadata.
- Full document ids belong only in private Firestore member profile documents.
- Reimports upsert by document identity in the backend import pipeline.

## Church Member Import Mapping

- `Nombre` -> `Member.firstName`
- `Apellidos` -> `Member.lastName`
- `Documento` -> `documentId`
- `Genero` / `Género` -> `gender`
- `Cumpleaños` (`MM/dd`) -> `birthday` (`MM-dd`)
- `En Grupo Desde` -> `Member.joinedAt`
- `Rol en Grupo` -> `groupRole`
- `Asistencias Semestre` -> `semesterAttendances`
- `Servidor` (`Si`/`No`) -> `isServer`
- `Esta Sirviendo` (`Si`/`No`) -> `isServing`

## Persistence Impact

Any durable domain change should be reflected in Firebase repository functions,
Firestore/Storage rules, and emulator tests. Legacy localStorage data is not
migrated.
