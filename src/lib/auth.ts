import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from 'firebase/firestore'
import { firebaseRuntime } from '@/lib/firebase'

export type UserProfile = {
  uid: string
  displayName?: string
  email?: string
  defaultGroupId?: string
  createdAt?: string
  updatedAt?: string
}

const missingFirebaseConfigMessage =
  'Firebase Auth no esta configurado. Crea .env.local con las variables VITE_FIREBASE_* del proyecto Firebase.'

function requireAuth() {
  if (!firebaseRuntime.auth) {
    throw new Error(missingFirebaseConfigMessage)
  }

  return firebaseRuntime.auth
}

function requireDb() {
  if (!firebaseRuntime.db) {
    throw new Error(missingFirebaseConfigMessage)
  }

  return firebaseRuntime.db
}

export function observeAuthState(callback: (user: User | null) => void) {
  if (!firebaseRuntime.auth) {
    callback(null)
    return () => undefined
  }

  return onAuthStateChanged(firebaseRuntime.auth, callback)
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  const credential = await signInWithPopup(requireAuth(), provider)
  await ensureUserProfile(credential.user)

  return credential.user
}

export async function registerWithEmail(email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(requireAuth(), email, password)
  await ensureUserProfile(credential.user)

  return credential.user
}

export async function signInWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(requireAuth(), email, password)
  await ensureUserProfile(credential.user)

  return credential.user
}

export async function signOutCurrentUser() {
  await signOut(requireAuth())
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const db = requireDb()
  const userRef = doc(db, 'users', user.uid)
  const snapshot = await getDoc(userRef)
  const profileUpdate = {
    uid: user.uid,
    displayName: user.displayName ?? '',
    email: user.email ?? '',
    updatedAt: serverTimestamp(),
  }

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      ...profileUpdate,
      createdAt: serverTimestamp(),
    })
  } else {
    await setDoc(userRef, profileUpdate, { merge: true })
  }

  const updatedSnapshot = await getDoc(userRef)

  return mapUserProfile(updatedSnapshot.data(), user)
}

export async function getUserProfile(user: User): Promise<UserProfile> {
  if (!firebaseRuntime.db) {
    return mapUserProfile(undefined, user)
  }

  const snapshot = await getDoc(doc(firebaseRuntime.db, 'users', user.uid))

  if (!snapshot.exists()) {
    return ensureUserProfile(user)
  }

  return mapUserProfile(snapshot.data(), user)
}

function mapUserProfile(data: DocumentData | undefined, user: User): UserProfile {
  return {
    uid: user.uid,
    displayName: stringOrUndefined(data?.displayName) ?? user.displayName ?? undefined,
    email: stringOrUndefined(data?.email) ?? user.email ?? undefined,
    defaultGroupId: stringOrUndefined(data?.defaultGroupId),
    createdAt: stringOrUndefined(data?.createdAt),
    updatedAt: stringOrUndefined(data?.updatedAt),
  }
}

function stringOrUndefined(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

export { missingFirebaseConfigMessage }
