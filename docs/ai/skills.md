# Suggested AI Skills

These are project-local skill definitions future agents can use as working modes. They are written as operational prompts, not installed Codex skills.

## `followupgc-domain-modeler`

Use when changing people, sessions, attendance, timeline, or settings.

Instructions:

- Read `src/domain/types.ts` first.
- Preserve cancelled sessions as explicit records.
- Add new domain fields in a backwards-compatible way.
- Update seed data when the new concept needs a visible example.
- Check whether Zustand persistence needs migration before changing stored shapes.

## `followupgc-ui-builder`

Use when changing screens or components.

Instructions:

- Treat this as an operational dashboard, not a marketing site.
- Keep controls compact and scannable.
- Use lucide-react icons for buttons and section labels.
- Keep cards for individual records, panels, or forms only.
- Verify responsive behavior at mobile and desktop widths.

## `followupgc-data-persistence`

Use when introducing backend sync, exports, imports, or migrations.

Instructions:

- Keep store mutations centralized.
- Do not scatter API calls through visual components.
- Preserve the existing local-first path until remote sync is proven.
- Add migration notes to `docs/ai/decisions.md`.

## `followupgc-quality-checker`

Use before finishing a feature.

Instructions:

- Run `pnpm lint`.
- Run `pnpm build`.
- For UI changes, run the dev server and manually check the main flows.
- Confirm `docs/ai/component-graph.md` is updated if ownership changes.
