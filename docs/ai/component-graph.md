# Component Graph

```mermaid
flowchart TD
  main[src/main.tsx] --> app[src/App.tsx]
  app --> remoteMembers[src/lib/remoteMembers.ts]
  app --> remoteMeetings[src/lib/remoteMeetings.ts]
  app --> remoteImports[src/lib/remoteImports.ts]
  app --> remoteGroups[src/lib/remoteGroups.ts]
  app --> auth[src/lib/useAuthSession.ts]
  app --> types[src/domain/types.ts]
  app --> date[src/lib/date.ts]
  app --> utils[src/lib/utils.ts]
  date --> types
```

## `src/App.tsx`

Owns the first usable screen:

- Header metrics.
- Remote member selection.
- Remote meeting creation, editing, deletion request, and selection.
- Attendance marking for the selected session.
- Timeline entry creation for the selected member.
- Meeting weekday setting.

Internal helper components:

- `Metric`
- `Panel`
- `Field`
- `MemberSummary`
- `Timeline`
- `EmptyState`

Split candidates when the file grows:

- `src/features/members/*`
- `src/features/sessions/*`
- `src/features/attendance/*`
- `src/features/timeline/*`
- `src/features/settings/*`

Do not split only for style preference. Split when a feature has enough form,
list, and interaction logic that ownership becomes clearer outside `App.tsx`.

## `src/domain/types.ts`

Stable domain contract. Prefer additive changes over renaming existing fields.

## `src/lib/date.ts`

Date labels, weekday options, and next-meeting calculation.

## `src/lib/utils.ts`

Generic frontend utilities only. Do not add domain logic here.

## UI State Ownership

`App.tsx` owns temporary selection state:

- `selectedMemberId`
- `selectedSessionId`

Durable production state should come from Firebase repository functions.
Temporary selections and interaction state may remain local to `App.tsx`.
