import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore'
import { firebaseConfig } from '../config'

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

export function firebase() {
  if (!app) {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    auth.languageCode = 'fr'
    void setPersistence(auth, browserLocalPersistence)
    // Cache persistant : l'appli fonctionne sans réseau et se resynchronise ensuite.
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
    })
  }
  return { app: app!, auth: auth!, db: db! }
}

export function watchUser(cb: (u: User | null) => void) {
  return onAuthStateChanged(firebase().auth, cb)
}

export async function signInWithGoogle() {
  const { auth } = firebase()
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    await signInWithPopup(auth, provider)
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider)
      return
    }
    throw e
  }
}

export function logout() {
  return signOut(firebase().auth)
}
