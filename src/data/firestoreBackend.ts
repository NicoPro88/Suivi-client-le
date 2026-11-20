import type { Firestore } from 'firebase/firestore'
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore'
import type { Client, Intervention, Settings } from '../lib/types'
import { withDefaults } from '../lib/defaults'
import type { Backend } from './backend'

/**
 * Données dans Firestore, sous users/{uid}/…
 * Les écritures ne sont pas attendues : le cache local les applique tout de suite,
 * et Firestore les envoie dès que le réseau revient (mode hors ligne).
 */
export function firestoreBackend(db: Firestore, uid: string, onWriteError: (e: Error) => void): Backend {
  const root = `users/${uid}`
  const clients = collection(db, root, 'clients')
  const interventions = collection(db, root, 'interventions')
  const settingsDoc = doc(db, root, 'settings', 'main')
  const write = (p: Promise<unknown>) => p.catch((e: Error) => onWriteError(e))
  // Firestore refuse les champs "undefined" : on les retire.
  const clean = <T,>(o: T): T => JSON.parse(JSON.stringify(o))

  return {
    subscribe(onData, onError) {
      const unsubs = [
        onSnapshot(clients, (s) => onData({ clients: s.docs.map((d) => ({ ...(d.data() as Client), id: d.id })) }), onError),
        onSnapshot(
          interventions,
          (s) =>
            onData({
              interventions: s.docs.map((d) => {
                const i = d.data() as Intervention
                return { ...i, id: d.id, log: i.log ?? [], reminders: i.reminders ?? [] }
              }),
            }),
          onError,
        ),
        onSnapshot(settingsDoc, (s) => onData({ settings: withDefaults(s.data() as Partial<Settings> | undefined) }), onError),
      ]
      return () => unsubs.forEach((u) => u())
    },
    saveClient: (c) => void write(setDoc(doc(clients, c.id), clean(c))),
    deleteClient: (id) => void write(deleteDoc(doc(clients, id))),
    saveIntervention: (i) => void write(setDoc(doc(interventions, i.id), clean(i))),
    deleteIntervention: (id) => void write(deleteDoc(doc(interventions, id))),
    saveSettings: (s) => void write(setDoc(settingsDoc, clean(s))),
    newId: () => doc(clients).id,
  }
}
