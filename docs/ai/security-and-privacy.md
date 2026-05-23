# Security And Privacy

FollowUpGC stores pastoral information. Treat the data as private even though
the current app is local-only.

## Current Data Boundary

- Data is stored in the user's browser `localStorage`.
- There is no backend, account system, cloud sync, telemetry, or analytics.
- No data should leave the device.

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
- Do not upload member import files to a server in the local-only phase.

## Future Remote Features

If cloud sync or backend persistence is explicitly requested later, document the
privacy model first. The default assumption should remain local-first with clear
user control.
