import type { AppData, Client, Intervention } from '../lib/types'
import { withDefaults } from '../lib/defaults'
import { uid } from '../lib/text'
import type { Backend } from './backend'
import { demoData } from './demoData'

const KEY = 'fil-rouge-demo-v1'

/** Mode démo : tout est gardé dans le navigateur de cet appareil. */
export function localBackend(): Backend {
  let data: AppData = load()
  const listeners = new Set<(d: Partial<AppData>) => void>()

  function load(): AppData {
    try {
      const raw = window.localStorage.getItem(KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as AppData
        return { ...parsed, settings: withDefaults(parsed.settings) }
      }
    } catch {
      /* stockage indisponible : on repart des données de démo */
    }
    return demoData()
  }

  function commit(next: AppData) {
    data = next
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* navigation privée : les données restent en mémoire */
    }
    listeners.forEach((l) => l(data))
  }

  const upsert = <T extends { id: string }>(list: T[], item: T) =>
    list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]

  return {
    subscribe(onData) {
      listeners.add(onData)
      queueMicrotask(() => onData(data))
      return () => listeners.delete(onData)
    },
    saveClient: (c: Client) => commit({ ...data, clients: upsert(data.clients, c) }),
    deleteClient: (id) => commit({ ...data, clients: data.clients.filter((c) => c.id !== id) }),
    saveIntervention: (i: Intervention) => commit({ ...data, interventions: upsert(data.interventions, i) }),
    deleteIntervention: (id) => commit({ ...data, interventions: data.interventions.filter((i) => i.id !== id) }),
    saveSettings: (s) => commit({ ...data, settings: s }),
    newId: uid,
  }
}

export function resetDemo() {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* rien à effacer */
  }
}
