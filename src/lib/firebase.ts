import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

type FirebaseRuntime = {
  app: FirebaseApp | null
  auth: Auth | null
  db: Firestore | null
  isConfigured: boolean
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const isConfigured = Object.values(firebaseConfig).every(
  (value): value is string => typeof value === 'string' && value.trim().length > 0,
)

function createFirebaseRuntime(): FirebaseRuntime {
  if (!isConfigured) {
    return {
      app: null,
      auth: null,
      db: null,
      isConfigured: false,
    }
  }

  const app = initializeApp(firebaseConfig)

  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    isConfigured: true,
  }
}

export const firebaseRuntime = createFirebaseRuntime()
