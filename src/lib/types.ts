export type SyncState = 'ok' | 'pending' | 'error'

export interface Phone {
  label: string
  number: string
}

export interface Address {
  /** Adresse complète sur une ligne, telle qu'affichée et envoyée au GPS. */
  label: string
  street?: string
  postcode?: string
  city?: string
  lat?: number
  lng?: number
}

export interface Client {
  id: string
  firstName: string
  lastName: string
  company?: string
  phones: Phone[]
  email?: string
  address: Address
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface LogEntry {
  id: string
  at: number
  text: string
  kind: 'note' | 'status' | 'system'
}

export interface Reminder {
  id: string
  /** Date et heure du rappel (ms depuis 1970). */
  at: number
  reason: string
  done: boolean
  calendarEventId?: string | null
}

export interface Appointment {
  start: number
  durationMin: number
}

export interface Intervention {
  id: string
  /** Référence lisible, ex. 2026-0142. */
  ref: string
  clientId: string
  type: string
  title: string
  description?: string
  /** Adresse du chantier quand elle diffère de celle du client. */
  siteAddress?: Address | null
  status: string
  appointment?: Appointment | null
  calendarEventId?: string | null
  /** État de la synchronisation Google Agenda (absent = jamais demandé). */
  calendarSync?: SyncState | null
  log: LogEntry[]
  reminders: Reminder[]
  createdAt: number
  updatedAt: number
}

export interface Status {
  id: string
  label: string
  /** Couleur du badge (nom de teinte, voir StatusBadge). */
  color: string
  /** Compte comme « chantier en cours » sur l'écran Aujourd'hui. */
  open: boolean
}

export interface Settings {
  statuses: Status[]
  types: string[]
  /** Agenda Google dédié créé par l'appli. */
  calendarId?: string | null
  calendarEnabled: boolean
  /** Rappel (en minutes) avant un RDV, dans Google Agenda. */
  reminderMinutesBefore: number
  defaultDurationMin: number
  smsTemplate: string
  signature: string
}

export interface AppData {
  clients: Client[]
  interventions: Intervention[]
  settings: Settings
}
