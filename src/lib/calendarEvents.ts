import { APP_NAME, TIME_ZONE } from '../config'
import { interventionAddress } from './links'
import { formatPhone, fullName } from './text'
import type { Client, Intervention, Reminder, Settings } from './types'

export interface CalendarEvent {
  summary: string
  location?: string
  description?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  reminders: { useDefault: boolean; overrides: { method: 'popup' | 'email'; minutes: number }[] }
  extendedProperties?: { private: Record<string, string> }
}

export function interventionUrl(i: Intervention, base: string): string {
  return `${base}#/interventions/${i.id}`
}

function phoneLines(c?: Client | null): string[] {
  return (c?.phones ?? []).filter((p) => p.number).map((p) => `${p.label || 'Tél.'} : ${formatPhone(p.number)}`)
}

/** Événement du rendez-vous dans Google Agenda. */
export function buildAppointmentEvent(i: Intervention, c: Client | undefined, settings: Settings, base: string): CalendarEvent {
  const start = i.appointment!.start
  const end = start + i.appointment!.durationMin * 60_000
  const addr = interventionAddress(i, c)
  const description = [
    c ? `Client : ${fullName(c)}` : null,
    ...phoneLines(c),
    '',
    i.title,
    i.description?.trim() || null,
    '',
    `Réf. ${i.ref}`,
    `Ouvrir dans ${APP_NAME} : ${interventionUrl(i, base)}`,
  ]
    .filter((l) => l !== null)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return {
    summary: `${i.type} – ${c ? fullName(c) : i.title}`,
    location: addr?.label,
    description,
    start: { dateTime: new Date(start).toISOString(), timeZone: TIME_ZONE },
    end: { dateTime: new Date(end).toISOString(), timeZone: TIME_ZONE },
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: settings.reminderMinutesBefore }] },
    extendedProperties: { private: { app: 'fil-rouge', interventionId: i.id, kind: 'rdv' } },
  }
}

/** Événement d'un rappel de suivi (15 min, notification à l'heure dite). */
export function buildReminderEvent(r: Reminder, i: Intervention, c: Client | undefined, base: string): CalendarEvent {
  const description = [
    c ? `Client : ${fullName(c)}` : null,
    ...phoneLines(c),
    `Intervention : ${i.type} – ${i.title} (réf. ${i.ref})`,
    `Ouvrir dans ${APP_NAME} : ${interventionUrl(i, base)}`,
  ]
    .filter(Boolean)
    .join('\n')
  return {
    summary: `Rappel : ${r.reason}${c ? ` – ${fullName(c)}` : ''}`,
    description,
    start: { dateTime: new Date(r.at).toISOString(), timeZone: TIME_ZONE },
    end: { dateTime: new Date(r.at + 15 * 60_000).toISOString(), timeZone: TIME_ZONE },
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] },
    extendedProperties: { private: { app: 'fil-rouge', interventionId: i.id, reminderId: r.id, kind: 'rappel' } },
  }
}
