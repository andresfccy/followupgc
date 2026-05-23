# Data Persistence

## Current Policy

The app persists all data locally through Zustand persist into browser
`localStorage`. The current storage key is `followupgc-data`, and the persist
version is `2`.

Persistence owner: `src/store/groupStore.ts`.

## Mutation Rules

- Add or update persistent mutations only in `src/store/groupStore.ts`.
- Components should call store actions instead of editing storage directly.
- Do not write to `localStorage` from `src/App.tsx` or feature components.
- Do not introduce API clients, server state libraries, or sync services unless
  explicitly requested.

## Stored Shape Changes

Before changing `GroupData` or nested persisted records:

1. Read `src/domain/types.ts`.
2. Check current seed data in `src/domain/seed.ts`.
3. Decide if old stored data can still load.
4. If not, add a Zustand persist migration and document it here.
5. Bump the persist version only with a real migration.

## Current Migration Notes

Version `2` normalizes existing members so older localStorage records receive:

- `firstName`
- `lastName`
- `createdAt`
- `updatedAt`

New imported member fields remain optional for existing members. Import rows
require `documentId`, but already persisted members without a document remain
valid.

The member import action upserts by `documentId` and updates only fields from
the church system. It preserves local FollowUpGC fields such as `id`, `status`,
`phone`, `notes`, timeline entries, sessions, and attendance records.

## Future Backend Rule

If remote persistence is requested later, keep local-first behavior available.
Move persistence behind repository-style functions instead of spreading API
calls through UI components.
