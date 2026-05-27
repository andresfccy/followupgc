# Firebase Auth Implementation

## Scope

Phase 3 adds Firebase Auth with Google Sign-In and email/password, plus a
minimal Firestore user profile and user group context lookup.

It does not migrate local FollowUpGC data to Firestore. Members, meetings,
attendance, cancelled meetings, pastoral notes, settings, and import data still
use Zustand persist with browser `localStorage`.

## Required Environment Variables

Create `.env.local` locally with values from the Firebase Console:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

`.env.example` is committed as the safe template. `.env` and `.env.*` are
ignored except `.env.example`.

Do not hardcode Firebase config values in source files.

## Firebase Console Setup

### Google Sign-In

1. Open Firebase Console.
2. Select the FollowUpGC project.
3. Go to Authentication > Sign-in method.
4. Enable Google.
5. Configure the support email.
6. Add the production domain if Firebase does not add it automatically:
   `followupgc.web.app`.

### Email/Password

1. Open Firebase Console.
2. Go to Authentication > Sign-in method.
3. Enable Email/Password.
4. Leave passwordless email link disabled unless a later phase explicitly
   scopes it.

## Implemented Files

- `src/lib/firebase.ts`: initializes Firebase from Vite environment variables
  when all required values exist.
- `src/lib/auth.ts`: wraps Google Sign-In, email/password registration,
  email/password sign-in, sign-out, auth observer, user profile upsert, and
  user group membership lookup.
- `src/lib/useAuthSession.ts`: React hook for authenticated user, profile,
  default group id, memberships, loading, error, and refresh state.
- `src/App.tsx`: renders a compact Firebase session panel while leaving the
  local group workflow intact.

## User Profile Shape

On sign-in, the app creates or updates:

```txt
users/{userId}
  uid
  displayName
  email
  defaultGroupId?
  createdAt
  updatedAt
```

Creation writes `createdAt` and `updatedAt`. Later sign-ins update only safe
profile fields and `updatedAt`.

`defaultGroupId` is only a preference. Access must come from membership records.

## Group Context

The hook reads:

```txt
users/{userId}/groupMemberships/{groupId}
```

Expected fields:

```txt
groupId
groupName
role
status
joinedAt
updatedAt
```

If the signed-in user has no active remote group, the UI states that remote
groups are not assigned yet and keeps local mode available.

This phase does not create groups, assign leaders, implement invitations, or
write memberships.

## Local-First Boundary

No local member, meeting, attendance, note, or import data is uploaded during
sign-in.

The local app remains usable when:

- Firebase is not configured.
- The user is signed out.
- The user is signed in but has no remote groups.
- Firestore group data has not been migrated yet.

## How To Test Locally

1. Create `.env.local` from `.env.example`.
2. Fill in Firebase web app config values.
3. Enable Google and Email/Password providers in Firebase Console.
4. Run:

```bash
pnpm dev
```

5. Verify:

- Google sign-in opens provider flow.
- Email/password can register.
- Email/password can sign in.
- Sign-out works.
- `users/{userId}` is created in Firestore.
- No member, meeting, attendance, note, or import records are written remotely.

## Redeploy

After configuring production environment variables in the hosting/deploy
environment:

```bash
pnpm build
firebase deploy --only hosting
```

## Pending

- Firestore production rules for user profiles and memberships.
- Group creation.
- First owner assignment.
- Complete group selector.
- LocalStorage to Firestore migration preview.
- Remote sync of members, meetings, attendance, and pastoral notes.
- Firebase Storage, Cloud Functions, and XLSX processing.
