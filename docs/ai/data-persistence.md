# Data Persistence

## Current Policy

Firebase is the intended durable persistence layer for production use.
The legacy Zustand/localStorage store has been removed from the production app.
Browser `localStorage` under `followupgc-data` belongs to the retired
local/demo phase and must not be treated as production data.

Production persistence owners should be repository-style Firebase modules under
`src/lib/`, such as remote group, import, and member repositories.

## Mutation Rules

- Add or update durable production mutations through Firebase repository-style
  functions.
- Components should call repository functions instead of editing Firebase or
  storage directly.
- Do not write to `localStorage` from `src/App.tsx` or feature components.
- Do not use `followupgc-data` as a production source or migrate it to
  Firestore.

## Stored Shape Changes

Before changing durable Firestore/Storage records:

1. Read `src/domain/types.ts`.
2. Check the repository module that owns the collection.
3. Update Firestore or Storage rules when permissions or shapes change.
4. Extend emulator tests before enabling production writes.
5. Document the persistence impact in the roadmap/handoff.

## Current Migration Notes

There is no localStorage-to-Firestore migration path. The Firebase-only app
starts from Firestore data, primarily official Excel imports and future remote
write flows.

## Firebase-Only Transition

Current production import decision:

- Firebase is the durable production persistence layer.
- The first real production dataset comes from the official church Excel file
  through parser/normalization, mandatory preview, explicit confirmation, and
  controlled Firestore writes.
- Existing `followupgc-data` should be cleared or ignored during the transition.
- Do not migrate seeds, demo data, local development data, local test data, or
  browser localStorage contents to Firestore.
