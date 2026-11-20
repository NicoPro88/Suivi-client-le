import { APP_NAME, DEMO_MODE, TIME_ZONE, googleClientId } from '../config'
import type { CalendarEvent } from './calendarEvents'
import { uid } from './text'

/**
 * Accès à Google Agenda depuis le navigateur (Google Identity Services).
 * Portée limitée : l'appli crée son propre agenda « Interventions » et ne gère que celui-là.
 */
const SCOPE = 'https://www.googleapis.com/auth/calendar.app.created'
const API = 'https://www.googleapis.com/calendar/v3'
const TOKEN_KEY = 'fr-gcal-token'
const CONSENT_KEY = 'fr-gcal-consented'

export class CalendarError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export interface CalendarApi {
  readonly available: boolean
  /** Demande l'autorisation (fenêtre Google). À appeler depuis un clic. */
  connect(loginHint?: string): Promise<void>
  hasValidToken(): boolean
  ensureCalendar(existingId?: string | null): Promise<string>
  upsertEvent(calendarId: string, eventId: string | null | undefined, event: CalendarEvent): Promise<string>
  deleteEvent(calendarId: string, eventId: string): Promise<void>
}

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string; login_hint?: string }): void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (r: TokenResponse) => void
            error_callback?: (e: { type: string; message?: string }) => void
          }): TokenClient
        }
      }
    }
  }
}

function safeStorage(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

let gisPromise: Promise<void> | null = null
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  gisPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      gisPromise = null
      reject(new CalendarError('Impossible de joindre Google (connexion internet ?)', 0))
    }
    document.head.appendChild(s)
  })
  return gisPromise
}

class GoogleCalendar implements CalendarApi {
  readonly available = Boolean(googleClientId)
  private token: { value: string; expiresAt: number } | null = null
  private pending: Promise<string> | null = null
  private loginHint?: string

  constructor() {
    try {
      const raw = safeStorage('session')?.getItem(TOKEN_KEY)
      if (raw) this.token = JSON.parse(raw)
    } catch {
      this.token = null
    }
  }

  hasValidToken() {
    return Boolean(this.token && this.token.expiresAt > Date.now() + 60_000)
  }

  async connect(loginHint?: string) {
    this.loginHint = loginHint ?? this.loginHint
    await this.requestToken(true)
  }

  private async requestToken(forceConsent = false): Promise<string> {
    if (!this.available) throw new CalendarError("Google Agenda n'est pas configuré (ID client manquant)", 0)
    if (this.pending) return this.pending
    this.pending = (async () => {
      await loadGis()
      const consented = safeStorage('local')?.getItem(CONSENT_KEY) === '1'
      return new Promise<string>((resolve, reject) => {
        const client = window.google!.accounts.oauth2.initTokenClient({
          client_id: googleClientId!,
          scope: SCOPE,
          callback: (r) => {
            if (!r.access_token) {
              reject(new CalendarError(r.error || 'Autorisation refusée', 401))
              return
            }
            this.token = { value: r.access_token, expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000 }
            safeStorage('session')?.setItem(TOKEN_KEY, JSON.stringify(this.token))
            safeStorage('local')?.setItem(CONSENT_KEY, '1')
            resolve(r.access_token)
          },
          error_callback: (e) =>
            reject(new CalendarError(e.type === 'popup_closed' ? 'Fenêtre Google fermée' : e.message || e.type, 401)),
        })
        client.requestAccessToken({ prompt: forceConsent || !consented ? 'consent' : '', login_hint: this.loginHint })
      })
    })()
    try {
      return await this.pending
    } finally {
      this.pending = null
    }
  }

  private async getToken(): Promise<string> {
    if (this.hasValidToken()) return this.token!.value
    return this.requestToken()
  }

  private async call<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
    const token = await this.getToken()
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 401 && retry) {
      this.token = null
      safeStorage('session')?.removeItem(TOKEN_KEY)
      return this.call(method, path, body, false)
    }
    if (!res.ok) {
      let msg = `Erreur Google Agenda (${res.status})`
      try {
        const j = await res.json()
        if (j?.error?.message) msg = j.error.message
      } catch {
        /* réponse vide */
      }
      throw new CalendarError(msg, res.status)
    }
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }

  async ensureCalendar(existingId?: string | null): Promise<string> {
    if (existingId) {
      try {
        await this.call('GET', `/calendars/${encodeURIComponent(existingId)}`)
        return existingId
      } catch (e) {
        if (!(e instanceof CalendarError) || (e.status !== 404 && e.status !== 410)) throw e
      }
    }
    const created = await this.call<{ id: string }>('POST', '/calendars', {
      summary: `${APP_NAME} – Interventions`,
      description: `Rendez-vous et rappels créés par ${APP_NAME}`,
      timeZone: TIME_ZONE,
    })
    return created.id
  }

  async upsertEvent(calendarId: string, eventId: string | null | undefined, event: CalendarEvent): Promise<string> {
    const base = `/calendars/${encodeURIComponent(calendarId)}/events`
    if (eventId) {
      try {
        const r = await this.call<{ id: string }>('PATCH', `${base}/${encodeURIComponent(eventId)}`, event)
        return r.id
      } catch (e) {
        if (!(e instanceof CalendarError) || (e.status !== 404 && e.status !== 410)) throw e
      }
    }
    const r = await this.call<{ id: string }>('POST', base, event)
    return r.id
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    try {
      await this.call('DELETE', `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`)
    } catch (e) {
      if (e instanceof CalendarError && (e.status === 404 || e.status === 410)) return
      throw e
    }
  }
}

/** Agenda simulé du mode démo : rien ne part chez Google. */
class DemoCalendar implements CalendarApi {
  readonly available = true
  async connect() {}
  hasValidToken() {
    return true
  }
  async ensureCalendar(existingId?: string | null) {
    return existingId || 'demo-calendar'
  }
  async upsertEvent(_c: string, eventId: string | null | undefined) {
    return eventId || `demo-${uid()}`
  }
  async deleteEvent() {}
}

export const calendar: CalendarApi = DEMO_MODE ? new DemoCalendar() : new GoogleCalendar()
