# Architecture

## Current Shape

FollowUpGC is a single-screen React app. `src/main.tsx` mounts `src/App.tsx`.
`App.tsx` reads Firebase-backed repository modules, renders the dashboard, and
owns temporary form and selection state.

Firebase Auth, Firestore, Storage, and Cloud Functions are the production
persistence/runtime backend. There is no router tree or separate server state
library.

## Boundaries

- `src/domain/types.ts`: stable domain vocabulary.
- `src/lib/remoteGroups.ts`: Firestore group and membership repository.
- `src/lib/remoteImports.ts`: Storage/importRun/callable import repository.
- `src/lib/remoteMembers.ts`: Firestore remote member read repository.
- `src/lib/remoteMeetings.ts`: Firestore meeting repository and callable
  deletion entrypoint.
- `src/lib/remoteAttendance.ts`: Firestore meeting-attendance repository under
  meeting subcollections.
- `src/lib/remotePastoralNotes.ts`: Firestore pastoral-note repository under
  member subcollections.
- `src/lib/legacyLocalStorage.ts`: one-way cleanup for the retired
  `followupgc-data` key.
- `src/lib/date.ts`: date formatting, weekday labels, next meeting calculation.
- `src/lib/utils.ts`: generic frontend helpers such as class merging and ids.
- `src/App.tsx`: current screen composition and task-specific helper
  components.

## Dependency Direction

UI may import repository modules, domain types, and libs. Domain files should
not import UI or repository code. Date helpers may import domain types but must
not import Firebase repositories.

## Change Strategy

- Keep changes narrow and close to the owning file.
- Split `App.tsx` only when a feature area becomes hard to reason about.
- When splitting, prefer feature folders such as `src/features/members` or
  `src/features/sessions` over global abstractions.
- Add shared abstractions only after at least two real call sites need them.
- Keep Firebase-only production persistence intact while improving structure.

## Current Constraints

- TanStack Router is available but intentionally unused.
- Zustand/localStorage persistence has been retired from the production app.
- Legacy `followupgc-data` is cleared on startup and must not be migrated to
  Firestore.
