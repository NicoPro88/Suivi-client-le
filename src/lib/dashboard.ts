import type { Client, Intervention, Reminder, Status } from './types'
import { addDays, endOfDay, startOfDay } from './dates'

export interface ReminderItem {
  reminder: Reminder
  intervention: Intervention
  client?: Client
  overdue: boolean
}

export interface TodayView {
  appointmentsToday: Intervention[]
  upcoming: Intervention[]
  reminders: ReminderItem[]
  open: Intervention[]
}

/** Ce qu'affiche l'écran « Aujourd'hui ». */
export function computeToday(
  interventions: Intervention[],
  clients: Client[],
  statuses: Status[],
  now = Date.now(),
): TodayView {
  const dayStart = startOfDay(now)
  const dayEnd = endOfDay(now)
  const weekEnd = endOfDay(addDays(now, 7))
  const openIds = new Set(statuses.filter((s) => s.open).map((s) => s.id))
  const byId = new Map(clients.map((c) => [c.id, c]))
  const isLive = (i: Intervention) => openIds.has(i.status) || !statuses.some((s) => s.id === i.status)

  const withRdv = interventions.filter((i) => i.appointment && isLive(i))
  const appointmentsToday = withRdv
    .filter((i) => i.appointment!.start >= dayStart && i.appointment!.start <= dayEnd)
    .sort((a, b) => a.appointment!.start - b.appointment!.start)
  const upcoming = withRdv
    .filter((i) => i.appointment!.start > dayEnd && i.appointment!.start <= weekEnd)
    .sort((a, b) => a.appointment!.start - b.appointment!.start)

  const reminders: ReminderItem[] = []
  for (const i of interventions) {
    for (const r of i.reminders ?? []) {
      if (!r.done && r.at <= dayEnd) {
        reminders.push({ reminder: r, intervention: i, client: byId.get(i.clientId), overdue: r.at < dayStart })
      }
    }
  }
  reminders.sort((a, b) => a.reminder.at - b.reminder.at)

  const todayIds = new Set(appointmentsToday.map((i) => i.id))
  const open = interventions
    .filter((i) => openIds.has(i.status) && !todayIds.has(i.id))
    .sort((a, b) => b.updatedAt - a.updatedAt)

  return { appointmentsToday, upcoming, reminders, open }
}
