# Current State

## 2026-05-22: Agent Harness Structure

The repository now has a modular agent harness under `docs/ai/`, with
`AGENTS.md` as the main entrypoint and `CLAUDE.md` as a compatibility pointer.

What changed:

- Added architecture, domain, persistence, routing, UI, testing,
  accessibility, and privacy docs.
- Added ADRs for local-first scope and Zustand persist.
- Added reusable workflows for feature work, bug fixes, component refactors,
  form validation, routing, and PR review.
- Added handoff documents for continuity.
- Added `scripts/ai/inspect-project.sh` and `scripts/ai/verify.sh`.

Why it changed:

- Future agents should load context just in time, respect ownership boundaries,
  and validate consistently without rediscovering the project shape.

Files touched:

- `AGENTS.md`
- `CLAUDE.md`
- `docs/ai/*`
- `scripts/ai/*`

Validation:

- `pnpm lint` passed.
- `pnpm build` passed.
- `scripts/ai/inspect-project.sh` passed after fixing shell quoting in the Node
  snippet.
- `scripts/ai/verify.sh` passed.

## 2026-05-22: Skill Layer Added

The harness now has three explicit layers:

- Base docs for stable system context.
- Workflows for broad process coordination.
- Skills under `docs/ai/skills/<skill-name>/SKILL.md` for repeatable task
  types.

What changed:

- Added a skills README and seven focused skills.
- Updated workflows to reference skills instead of duplicating implementation
  rules.
- Updated `AGENTS.md` with a skills protocol and the base/workflow/skill/script
  decision rule.
- Converted legacy `docs/ai/skills.md` into a pointer to the new skills index.
- Updated `scripts/ai/inspect-project.sh` so nested skill files appear in
  inspection output.

Validation:

- `pnpm lint` passed.
- `pnpm build` passed.
- `scripts/ai/inspect-project.sh` passed and now lists nested skill files.
- `scripts/ai/verify.sh` passed.

## 2026-05-22: Feature Intake Skill Added

The harness now includes `docs/ai/skills/feature-intake/` for converting
informal natural-language feature requests into actionable implementation
intake.

What changed:

- Added `feature-intake/SKILL.md`.
- Added a fillable feature request template.
- Added selective clarification questions grouped by risk area.
- Updated `AGENTS.md` with a feature intake protocol.
- Updated the skills index to explain that feature intake prepares
  `implement-feature` and selects specific skills.
- Updated `docs/ai/workflows/implement-feature.md` to run feature intake first
  when a request is informal or incomplete.

Validation:

- `pnpm lint` passed.
- `pnpm build` passed.
- `scripts/ai/inspect-project.sh` passed and lists the new feature intake
  files.
- `scripts/ai/verify.sh` passed.

## 2026-05-23: XLSX Member Import Intake Decision

The member import feature intake has one accepted domain decision:

- Excel fields are part of the `Member` domain model, not temporary import
  metadata.
- Imported rows must require `Documento` as `documentId`.
- Existing local members may still lack `documentId` for backwards
  compatibility.
- Reimports should upsert by `documentId`: update existing members with the
  same external document id, otherwise create new members.
- Do not deduplicate aggressively by full name in the first version.
- Do not add Firebase, Cloud Functions, Firestore, auth, cloud sync, routing, or
  Excel parsing dependencies without a separate implementation decision.

Expected import contract for implementation:

- `ChurchMemberImportRow`
- `ImportValidationError`
- `ImportPreview`
- `ImportResult`
- Conceptual flow: `parseImportFile(file) -> ImportPreview`, then
  `confirmImport(preview) -> ImportResult`.

## 2026-05-23: Import Contract And Member Domain Support

The first import phase is implemented as domain support and a normalized import
contract. It does not parse XLSX files yet.

What changed:

- `Member` now includes canonical fields for imported church-system data.
- Import contract types were added: `ChurchMemberImportRow`,
  `ImportValidationError`, `ImportPreview`, and `ImportResult`.
- `src/lib/memberImport.ts` validates and normalizes already-represented row
  objects and exposes `parseImportFile(file)` as a deliberate XLSX parser stub.
- Zustand persist was bumped to version `2` with safe member normalization for
  existing localStorage data.
- `upsertImportedMembers` and `confirmImport(preview)` upsert members by
  `documentId`.
- The member UI now shows imported administrative fields in the selected member
  summary and masks document ids.
- The import file control is present but reports that XLSX parsing is not
  implemented yet.

Preserved by import upserts:

- `id`
- `status`
- `phone`
- `notes`
- timeline entries
- sessions
- attendance
- `createdAt`
- local fields not owned by the Excel import

Validation:

- `pnpm lint` passed.
- `pnpm build` passed.
- `scripts/ai/verify.sh` passed.

## 2026-05-23: Firebase Hosting Static Deployment Config

Firebase Hosting phase 1 is configured for static SPA deployment only.

What changed:

- Added `firebase.json` with `dist` as the public directory and SPA rewrite to
  `/index.html`.
- Added `.firebaserc` with `followupgc-placeholder` as the default project id.
- Added `docs/ai/deployment-firebase.md` with project setup, deploy commands,
  validation commands, and out-of-scope Firebase services.

No runtime Firebase SDK, Auth, Firestore, Storage, Cloud Functions, cloud sync,
or XLSX processing was added. The app remains local-first with Zustand persist
and `localStorage`.

Validation:

- `pnpm lint` passed.
- `pnpm build` passed.
- `scripts/ai/verify.sh` passed.
