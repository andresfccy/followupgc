# Architecture

## Current Shape

FollowUpGC is a single-screen React app. `src/main.tsx` mounts `src/App.tsx`.
`App.tsx` reads from the Zustand store, renders the dashboard, owns local form
state, and calls store actions for persistent mutations.

There is no backend, router tree, server state layer, or API client.

## Boundaries

- `src/domain/types.ts`: stable domain vocabulary and stored data contract.
- `src/domain/seed.ts`: initial local sample data.
- `src/store/groupStore.ts`: Zustand store, persistence key, and all mutations.
- `src/lib/date.ts`: date formatting, weekday labels, next meeting calculation.
- `src/lib/utils.ts`: generic frontend helpers such as class merging and ids.
- `src/App.tsx`: current screen composition and task-specific helper
  components.

## Dependency Direction

UI may import store, domain types, and libs. The store may import domain types,
seed data, and generic utils. Domain files should not import UI or store code.
Date helpers may import domain types but must not import the store.

## Change Strategy

- Keep changes narrow and close to the owning file.
- Split `App.tsx` only when a feature area becomes hard to reason about.
- When splitting, prefer feature folders such as `src/features/members` or
  `src/features/sessions` over global abstractions.
- Add shared abstractions only after at least two real call sites need them.
- Keep local-first behavior intact while improving structure.

## Current Constraints

- TanStack Router is available but intentionally unused.
- Zod is available but validation is not wired yet.
- Persisted data version is `1` under the key `followupgc-data`.
- No migration system exists yet.
