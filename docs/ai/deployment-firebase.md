# Firebase Hosting Deployment

FollowUpGC is deployed to Firebase Hosting as a static Vite SPA.

Production URL:

```txt
https://followupgc.web.app
```

Firebase Hosting Phase 1 is complete. This phase does not add Firebase SDK,
Auth, Firestore, Storage, Cloud Functions, XLSX processing, or remote sync.
Runtime data remains local-first in browser `localStorage` through Zustand
persist.

## Files

- `firebase.json`: Hosting configuration. Publishes `dist` and rewrites all
  routes to `/index.html`.
- `.firebaserc`: Firebase project alias. Replace the placeholder project id
  before deploying.

## Create Or Connect A Firebase Project

Create a Firebase project in the Firebase Console, then install or use the
Firebase CLI.

```bash
firebase login
firebase use --add
```

When prompted, choose the Firebase project and assign it to the `default`
alias. This updates `.firebaserc`.

If editing manually, replace `followupgc-placeholder` in `.firebaserc` with the
real Firebase project id:

```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

## First-Time Hosting Setup

If the project has not been initialized in Firebase Hosting yet:

```bash
pnpm build
firebase login
firebase init hosting
firebase deploy
```

During `firebase init hosting`:

- Use the existing Firebase project.
- Set the public directory to `dist`.
- Configure as a single-page app: yes.
- Do not overwrite `index.html`.
- Do not set up GitHub deploys unless explicitly wanted later.

## Deploy Existing Project

If the Firebase project is already connected:

```bash
pnpm build
firebase use --add
firebase deploy --only hosting
```

For later deploys, when the correct project alias is already configured:

```bash
pnpm build
firebase deploy --only hosting
```

Current production redeploy command:

```bash
pnpm build
firebase deploy --only hosting
```

## Validation Before Deploy

Run:

```bash
pnpm lint
pnpm build
scripts/ai/verify.sh
```

## Out Of Scope For This Phase

- Firebase SDK.
- Auth.
- Firestore.
- Storage.
- Cloud Functions.
- XLSX processing.
- Remote persistence or cloud sync.
- TanStack Router wiring.

These remain future phases. The current deployed app still persists data only in
the user's browser through Zustand/localStorage.

## Next Firebase Phase

The next Firebase phase should be designed separately. Recommended scope:

- Auth model and access boundaries.
- Firestore data model and migrations from localStorage.
- Privacy rules for pastoral notes and document ids.
- Optional Storage + Cloud Functions flow for XLSX processing behind the
  existing import contract.
