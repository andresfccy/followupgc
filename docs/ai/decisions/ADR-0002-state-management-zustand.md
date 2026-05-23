# ADR-0002: State Management With Zustand Persist

## Status

Accepted.

## Context

The app needs a small persistent state layer for members, sessions, attendance,
timeline entries, and settings. The state is currently client-only and does not
need server cache behavior.

## Decision

Use Zustand with `persist` for the app state. Keep the persisted mutations in
`src/store/groupStore.ts` and store data in browser `localStorage` under the
key `followupgc-data`.

## Consequences

- UI components can read state and call explicit mutations without prop drilling.
- Persistent data remains simple and inspectable during early development.
- Stored shape changes require care because existing `localStorage` data may
  outlive code changes.
- The app should not introduce another state library while Zustand fits the
  current scope.
