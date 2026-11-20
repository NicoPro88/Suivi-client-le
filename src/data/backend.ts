import type { AppData, Client, Intervention, Settings } from '../lib/types'

/** Où sont rangées les données : Firebase (réel) ou le navigateur (démo). */
export interface Backend {
  /** Appelé à chaque changement (y compris hors ligne, immédiatement). */
  subscribe(onData: (data: Partial<AppData>) => void, onError: (e: Error) => void): () => void
  saveClient(c: Client): void
  deleteClient(id: string): void
  saveIntervention(i: Intervention): void
  deleteIntervention(id: string): void
  saveSettings(s: Settings): void
  newId(): string
}
