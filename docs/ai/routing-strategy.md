# Routing Strategy

TanStack Router is installed but not wired. The app should remain single-screen
until route-level complexity is justified.

## Do Not Add Routing For

- Minor panel reordering.
- Modal-like interactions.
- Simple filtering or selection state.
- Documentation-only tasks.

## Routing May Be Justified When

- A workflow needs a shareable or restorable URL.
- A screen has separate ownership and loading requirements.
- The app has clearly distinct pages such as people detail, session detail, or
  settings.

## If Adding Routes

1. Read `docs/ai/workflows/add-route.md`.
2. Preserve the existing single-screen flow unless replacing it is explicitly
   requested.
3. Keep route definitions small and typed.
4. Avoid route-level data fetching unless remote data exists.
5. Update `docs/ai/component-graph.md` and this file.
