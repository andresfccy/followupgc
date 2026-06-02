# Security And Privacy

FollowUpGC stores pastoral information. Treat the data as private even though
the current app is local-only.

## Current Data Boundary

- Pastoral app data still primarily lives in the user's browser
  `localStorage`.
- Firebase Auth identifies users.
- Firestore stores minimal user profiles, remote groups, memberships,
  `defaultGroupId`, importRun preview metadata, and imported remote member
  public/private profile records after explicit confirmation.
- Firebase Storage stores official XLSX uploads for backend processing in the
  current import phase.
- Cloud Functions processes XLSX files to generate preview data and confirms
  final imported-member writes after owner/leader approval.
- Analytics and remote logging of sensitive content remain out of scope.

## Rules

- Do not add tracking, analytics, remote logging, or crash reporting.
- Do not send member, attendance, or timeline data to external services.
- Do not introduce authentication as a side effect of another task.
- Avoid putting sensitive sample data in committed seed records.
- Keep exports/imports local if they are added later.
- Do not log document ids or imported file contents to the console.
- Do not store the original imported file in app state or localStorage.
- Do not show full document ids in dense list views unless there is a specific
  user need.
- Official XLSX uploads are allowed only for the backend-processing import
  phase and must go through Storage rules, group membership checks, and preview.
- Do not parse XLSX in the browser.
- Write final member records only through the backend confirmation function,
  after member/private profile rules and tests exist and the user approves the
  preview.
- Store full `documentId` only in member private profile if it is needed; never
  in the public member doc or previewRows.
- Treat `documentIdHash` as technical metadata for deduplication. Do not show it
  in UI.
- Define Storage retention/deletion for uploaded source files before broad
  production use.
- Keep `pnpm test:rules` and `pnpm test:storage-rules` passing before any
  confirmed member import writes.

## Future Remote Features

If cloud sync or backend persistence is explicitly requested later, document the
privacy model first. The default assumption should remain local-first with clear
user control.
