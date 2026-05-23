# ADR-0001: Local-First Product Boundary

## Status

Accepted.

## Context

FollowUpGC tracks pastoral notes, attendance, cancelled meetings, and member
process information for a church cell group. The first usable version should be
private, offline-friendly, and simple to run locally.

## Decision

Keep the application local-first. Store data in the browser and do not add
backend persistence, authentication, cloud sync, analytics, or tracking unless a
future task explicitly asks for that capability.

## Consequences

- The app works without accounts, hosting, or network access.
- Pastoral data does not leave the user's device by default.
- Cross-device sync is intentionally absent.
- Future remote persistence must be designed as an explicit product decision,
  not introduced as a side effect of another feature.
