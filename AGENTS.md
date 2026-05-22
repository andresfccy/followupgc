# FollowUpGC Agent Guide

## Product context

FollowUpGC is a local-first React app for tracking a church cell group's people, weekly meetings, attendance, cancelled meetings, and chronological pastoral notes.

Current scope:

- Manage group members and basic process status.
- Register weekly group dates as held or cancelled.
- Track attendance for held meetings.
- Keep a chronological timeline per member.
- Configure the regular meeting weekday while allowing church-schedule exceptions.

## Current stack

- Vite + React + TypeScript for the frontend.
- Tailwind CSS v4 through `@tailwindcss/vite`.
- Zustand with `persist` for local `localStorage` data.
- date-fns for date formatting and weekday calculations.
- lucide-react for UI icons.
- Zod is installed for upcoming schema validation when forms grow.
- TanStack Router is installed but not wired yet; keep the single-screen app until route-level complexity appears.

## Agent workflow

Before changing code:

1. Read this file.
2. Read `docs/ai/project-context.md`.
3. Inspect the component graph in `docs/ai/component-graph.md`.
4. Open only files in the ownership area needed for the task.

Implementation rules:

- Preserve the domain vocabulary in `src/domain/types.ts`.
- Keep persistent data mutations inside `src/store/groupStore.ts`.
- Keep date logic inside `src/lib/date.ts`.
- Prefer small, focused components before introducing global abstractions.
- Do not replace local storage with a backend unless the task explicitly asks for persistence across devices.
- Run `pnpm lint` and `pnpm build` after changes.

## Useful commands

```bash
pnpm dev
pnpm lint
pnpm build
```
