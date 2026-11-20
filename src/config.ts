/** Nom de l'application, affiché partout. */
export const APP_NAME = 'Fil Rouge'

const env = import.meta.env

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
}

export const googleClientId = env.VITE_GOOGLE_CLIENT_ID as string | undefined

/**
 * Mode démo : aucune configuration Firebase fournie (ou build "demo").
 * Les données restent dans le navigateur de l'appareil et l'agenda est simulé.
 */
export const DEMO_MODE = env.MODE === 'demo' || !firebaseConfig.apiKey

/** Fuseau horaire utilisé pour les événements Google Agenda. */
export const TIME_ZONE = 'Europe/Paris'
