# Technical Decisions

## 001. Frontend foundation

Decision: use Vite, React, TypeScript, and Tailwind CSS v4.

Reasoning: the current official Vite template provides React + TypeScript quickly, and Tailwind v4 has first-party Vite integration through `@tailwindcss/vite`.

## 002. Local-first persistence

Decision: use Zustand persist over `localStorage` for the first iteration.

Reasoning: the app needs immediate usefulness without authentication, hosting, or database setup. The domain types are separated so the persistence layer can later move to Supabase, Firebase, Postgres, or another backend.

## 003. Single-screen workflow

Decision: keep the first app as one operational screen.

Reasoning: the current workflows are tightly related: select a session to mark attendance, select a person to record process notes, and configure weekly cadence. Routing can be introduced when separate pages become valuable.

## 004. Cancelled meetings as records

Decision: store cancelled meetings with comments.

Reasoning: a cancelled Friday is still part of the group's chronology and explains why attendance was not expected for that date.

## 005. Agent-readable project memory

Decision: keep `AGENTS.md` plus `docs/ai/*` as the working memory for future agents.

Reasoning: future work should start from product context, domain boundaries, and component ownership instead of spending tokens rediscovering project shape.
