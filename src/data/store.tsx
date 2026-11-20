import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppData, Client, Intervention, LogEntry, Reminder, Settings } from '../lib/types'
import { CANCELLED_STATUS, defaultSettings } from '../lib/defaults'
import { nextRef } from '../lib/refs'
import { uid } from '../lib/text'
import { calendar, CalendarError } from '../lib/calendar'
import { buildAppointmentEvent, buildReminderEvent } from '../lib/calendarEvents'
import type { Backend } from './backend'

export interface Toast {
  id: string
  text: string
  kind: 'info' | 'error'
}

export interface UserInfo {
  name: string
  email: string
  photo?: string | null
}

export type ClientInput = Omit<Client, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
export type InterventionInput = Omit<Intervention, 'id' | 'ref' | 'createdAt' | 'updatedAt' | 'log' | 'reminders'> & {
  id?: string
  log?: LogEntry[]
  reminders?: Reminder[]
}

interface Store {
  ready: boolean
  data: AppData
  user: UserInfo
  online: boolean
  toasts: Toast[]
  syncing: boolean
  pendingSync: number
  notify(text: string, kind?: Toast['kind']): void
  dismissToast(id: string): void
  saveClient(input: ClientInput): string
  deleteClient(id: string): Promise<void>
  saveIntervention(input: InterventionInput): string
  deleteIntervention(id: string): Promise<void>
  setStatus(id: string, statusId: string): void
  addNote(id: string, text: string): void
  deleteLogEntry(id: string, entryId: string): void
  addReminder(id: string, at: number, reason: string): void
  setReminderDone(id: string, reminderId: string, done: boolean): void
  deleteReminder(id: string, reminderId: string): Promise<void>
  saveSettings(s: Settings): void
  connectCalendar(): Promise<void>
  disconnectCalendar(): void
  syncAll(): Promise<void>
}

const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const s = useContext(StoreContext)
  if (!s) throw new Error('useStore hors du StoreProvider')
  return s
}

const EMPTY: AppData = { clients: [], interventions: [], settings: defaultSettings() }

/** Une intervention a-t-elle des choses à envoyer vers Google Agenda ? */
export function needsSync(i: Intervention, now = Date.now()): boolean {
  if (i.calendarSync === 'pending' || i.calendarSync === 'error') return true
  const wantsRdv = Boolean(i.appointment) && i.status !== CANCELLED_STATUS
  if (wantsRdv && !i.calendarEventId && i.appointment!.start > now - 86_400_000) return true
  return (i.reminders ?? []).some((r) => !r.done && !r.calendarEventId && r.at > now - 86_400_000)
}

function appBase(): string {
  return `${window.location.origin}${window.location.pathname}`
}

export function StoreProvider({ backend, user, children }: { backend: Backend; user: UserInfo; children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY)
  const [loaded, setLoaded] = useState({ clients: false, interventions: false, settings: false })
  const [toasts, setToasts] = useState<Toast[]>([])
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const [syncing, setSyncing] = useState(false)
  const dataRef = useRef<AppData>(EMPTY)
  const inFlight = useRef(new Set<string>())

  const notify = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = uid()
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 3500)
  }, [])
  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const apply = useCallback((patch: Partial<AppData>) => {
    dataRef.current = { ...dataRef.current, ...patch }
    setData(dataRef.current)
  }, [])

  useEffect(() => {
    return backend.subscribe(
      (patch) => {
        apply(patch)
        setLoaded((l) => ({
          clients: l.clients || 'clients' in patch,
          interventions: l.interventions || 'interventions' in patch,
          settings: l.settings || 'settings' in patch,
        }))
      },
      (e) => notify(`Erreur de chargement : ${e.message}`, 'error'),
    )
  }, [backend, apply, notify])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  // --- écritures locales immédiates + envoi au stockage ---
  const putIntervention = useCallback(
    (i: Intervention) => {
      const list = dataRef.current.interventions
      apply({ interventions: list.some((x) => x.id === i.id) ? list.map((x) => (x.id === i.id ? i : x)) : [...list, i] })
      backend.saveIntervention(i)
    },
    [apply, backend],
  )
  const putClient = useCallback(
    (c: Client) => {
      const list = dataRef.current.clients
      apply({ clients: list.some((x) => x.id === c.id) ? list.map((x) => (x.id === c.id ? c : x)) : [...list, c] })
      backend.saveClient(c)
    },
    [apply, backend],
  )
  const putSettings = useCallback(
    (s: Settings) => {
      apply({ settings: s })
      backend.saveSettings(s)
    },
    [apply, backend],
  )
  const findIntervention = (id: string) => dataRef.current.interventions.find((i) => i.id === id)

  // --- Google Agenda ---
  const ensureCalendarId = useCallback(async () => {
    const s = dataRef.current.settings
    const id = await calendar.ensureCalendar(s.calendarId)
    if (id !== s.calendarId) putSettings({ ...dataRef.current.settings, calendarId: id })
    return id
  }, [putSettings])

  const syncIntervention = useCallback(
    async (id: string, { quiet = false } = {}) => {
      const settings = dataRef.current.settings
      const start = findIntervention(id)
      if (!start || !settings.calendarEnabled || !calendar.available || inFlight.current.has(id)) return
      inFlight.current.add(id)
      try {
        const calId = await ensureCalendarId()
        const client = dataRef.current.clients.find((c) => c.id === start.clientId)
        const base = appBase()
        let eventId = start.calendarEventId ?? null
        const wantsRdv = Boolean(start.appointment) && start.status !== CANCELLED_STATUS
        if (wantsRdv) {
          eventId = await calendar.upsertEvent(calId, eventId, buildAppointmentEvent(start, client, settings, base))
        } else if (eventId) {
          await calendar.deleteEvent(calId, eventId)
          eventId = null
        }
        const reminderIds: Record<string, string | null> = {}
        const now = Date.now()
        for (const r of start.reminders ?? []) {
          if (!r.done && !r.calendarEventId && r.at > now - 86_400_000) {
            reminderIds[r.id] = await calendar.upsertEvent(calId, null, buildReminderEvent(r, start, client, base))
          } else if (r.done && r.calendarEventId && r.at > now) {
            await calendar.deleteEvent(calId, r.calendarEventId)
            reminderIds[r.id] = null
          }
        }
        const latest = findIntervention(id)
        if (latest) {
          putIntervention({
            ...latest,
            calendarEventId: eventId,
            calendarSync: 'ok',
            reminders: latest.reminders.map((r) => (r.id in reminderIds ? { ...r, calendarEventId: reminderIds[r.id] } : r)),
          })
        }
      } catch (e) {
        const latest = findIntervention(id)
        const offline = !navigator.onLine || (e instanceof CalendarError && (e.status === 0 || e.status === 401))
        if (latest) putIntervention({ ...latest, calendarSync: offline ? 'pending' : 'error' })
        if (!quiet) {
          notify(
            offline
              ? "Agenda non mis à jour pour l'instant. Utilise « Synchroniser » quand tu as du réseau."
              : `Google Agenda : ${(e as Error).message}`,
            'error',
          )
        }
      } finally {
        inFlight.current.delete(id)
      }
    },
    [ensureCalendarId, notify, putIntervention],
  )

  const syncAll = useCallback(async () => {
    const todo = dataRef.current.interventions.filter((i) => needsSync(i))
    if (!todo.length) return
    setSyncing(true)
    try {
      for (const i of todo) await syncIntervention(i.id, { quiet: true })
      const left = dataRef.current.interventions.filter((i) => needsSync(i)).length
      notify(left ? `${left} intervention(s) restent à synchroniser.` : 'Agenda à jour.', left ? 'error' : 'info')
    } finally {
      setSyncing(false)
    }
  }, [syncIntervention, notify])

  // Au retour du réseau, on renvoie ce qui attend, si l'autorisation Google est encore valable.
  useEffect(() => {
    if (online && calendar.hasValidToken() && data.settings.calendarEnabled) {
      const todo = dataRef.current.interventions.filter((i) => needsSync(i))
      todo.forEach((i) => void syncIntervention(i.id, { quiet: true }))
    }
  }, [online, data.settings.calendarEnabled, syncIntervention])

  const markPending = (i: Intervention): Intervention =>
    dataRef.current.settings.calendarEnabled ? { ...i, calendarSync: 'pending' } : i

  // --- actions ---
  const store: Store = useMemo(() => {
    const now = () => Date.now()
    const api: Store = {} as Store
    const logEntry = (text: string, kind: LogEntry['kind'] = 'note'): LogEntry => ({ id: uid(), at: now(), text, kind })

    Object.assign(api, {
      ready: loaded.clients && loaded.interventions && loaded.settings,
      data,
      user,
      online,
      toasts,
      syncing,
      pendingSync: data.settings.calendarEnabled ? data.interventions.filter((i) => needsSync(i)).length : 0,
      notify,
      dismissToast,

      saveClient(input) {
        const existing = input.id ? dataRef.current.clients.find((c) => c.id === input.id) : undefined
        const id = existing?.id ?? backend.newId()
        const c: Client = { ...input, id, createdAt: existing?.createdAt ?? now(), updatedAt: now() }
        putClient(c)
        // Le nom ou le téléphone a changé : on met à jour les RDV à venir dans l'agenda.
        if (existing && dataRef.current.settings.calendarEnabled) {
          dataRef.current.interventions
            .filter((i) => i.clientId === id && i.appointment && i.appointment.start > now() && i.calendarEventId)
            .forEach((i) => {
              putIntervention(markPending(i))
              void syncIntervention(i.id, { quiet: true })
            })
        }
        return id
      },

      async deleteClient(id) {
        const linked = dataRef.current.interventions.filter((i) => i.clientId === id)
        for (const i of linked) await api.deleteIntervention(i.id)
        apply({ clients: dataRef.current.clients.filter((c) => c.id !== id) })
        backend.deleteClient(id)
      },

      saveIntervention(input) {
        const existing = input.id ? findIntervention(input.id) : undefined
        const id = existing?.id ?? backend.newId()
        const ref = existing?.ref ?? nextRef(dataRef.current.interventions.map((i) => i.ref))
        const created: LogEntry[] = existing ? [] : [logEntry('Intervention créée', 'system')]
        const i: Intervention = markPending({
          log: [],
          reminders: [],
          ...existing,
          ...input,
          id,
          ref,
          createdAt: existing?.createdAt ?? now(),
          updatedAt: now(),
        } as Intervention)
        if (!existing) i.log = [...(input.log ?? []), ...created]
        putIntervention(i)
        void syncIntervention(id)
        return id
      },

      async deleteIntervention(id) {
        const i = findIntervention(id)
        if (!i) return
        const s = dataRef.current.settings
        if (s.calendarEnabled && s.calendarId && calendar.available) {
          const ids = [i.calendarEventId, ...i.reminders.filter((r) => r.at > now()).map((r) => r.calendarEventId)].filter(Boolean) as string[]
          try {
            for (const ev of ids) await calendar.deleteEvent(s.calendarId, ev)
          } catch {
            notify("L'intervention est supprimée, mais pense à retirer son RDV dans Google Agenda.", 'error')
          }
        }
        apply({ interventions: dataRef.current.interventions.filter((x) => x.id !== id) })
        backend.deleteIntervention(id)
      },

      setStatus(id, statusId) {
        const i = findIntervention(id)
        if (!i || i.status === statusId) return
        const label = dataRef.current.settings.statuses.find((s) => s.id === statusId)?.label ?? statusId
        const touchesAgenda = statusId === CANCELLED_STATUS || i.status === CANCELLED_STATUS
        const next: Intervention = { ...i, status: statusId, updatedAt: now(), log: [...i.log, logEntry(`Statut : ${label}`, 'status')] }
        putIntervention(touchesAgenda ? markPending(next) : next)
        if (touchesAgenda) void syncIntervention(id)
      },

      addNote(id, text) {
        const i = findIntervention(id)
        if (!i || !text.trim()) return
        putIntervention({ ...i, updatedAt: now(), log: [...i.log, logEntry(text.trim())] })
      },

      deleteLogEntry(id, entryId) {
        const i = findIntervention(id)
        if (!i) return
        putIntervention({ ...i, log: i.log.filter((l) => l.id !== entryId) })
      },

      addReminder(id, at, reason) {
        const i = findIntervention(id)
        if (!i) return
        const r: Reminder = { id: uid(), at, reason: reason.trim() || 'Rappel', done: false, calendarEventId: null }
        putIntervention(markPending({ ...i, updatedAt: now(), reminders: [...i.reminders, r] }))
        void syncIntervention(id)
      },

      setReminderDone(id, reminderId, done) {
        const i = findIntervention(id)
        if (!i) return
        const r = i.reminders.find((x) => x.id === reminderId)
        if (!r) return
        const reminders = i.reminders.map((x) => (x.id === reminderId ? { ...x, done } : x))
        const log = done ? [...i.log, logEntry(`Rappel fait : ${r.reason}`, 'system')] : i.log
        const next = { ...i, reminders, log }
        const needs = (done && r.calendarEventId && r.at > now()) || (!done && !r.calendarEventId)
        putIntervention(needs ? markPending(next) : next)
        if (needs) void syncIntervention(id)
      },

      async deleteReminder(id, reminderId) {
        const i = findIntervention(id)
        const r = i?.reminders.find((x) => x.id === reminderId)
        if (!i || !r) return
        const s = dataRef.current.settings
        if (r.calendarEventId && s.calendarEnabled && s.calendarId && r.at > now()) {
          try {
            await calendar.deleteEvent(s.calendarId, r.calendarEventId)
          } catch {
            notify('Rappel supprimé ici, mais pas encore dans Google Agenda.', 'error')
          }
        }
        const latest = findIntervention(id)!
        putIntervention({ ...latest, reminders: latest.reminders.filter((x) => x.id !== reminderId) })
      },

      saveSettings(s) {
        putSettings(s)
      },

      async connectCalendar() {
        await calendar.connect(user.email || undefined)
        const calId = await calendar.ensureCalendar(dataRef.current.settings.calendarId)
        putSettings({ ...dataRef.current.settings, calendarEnabled: true, calendarId: calId })
        notify('Google Agenda connecté : ton agenda « Interventions » est prêt.')
        await syncAll()
      },

      disconnectCalendar() {
        putSettings({ ...dataRef.current.settings, calendarEnabled: false })
        notify("Google Agenda déconnecté. Les RDV déjà créés restent dans l'agenda.")
      },

      syncAll,
    } satisfies Store)
    return api
  }, [data, loaded, user, online, toasts, syncing, notify, dismissToast, backend, putClient, putIntervention, putSettings, syncIntervention, syncAll, apply])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
