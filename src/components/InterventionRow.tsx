import { Link } from 'react-router'
import { useStore } from '../data/store'
import { formatTime, relativeDay } from '../lib/dates'
import { fullName } from '../lib/text'
import type { Intervention } from '../lib/types'
import { Icon } from './Icon'
import { StatusBadge } from './StatusBadge'

/** Ligne d'intervention dans une liste. */
export function InterventionRow({ i, showClient = true, showTimeOnly = false }: { i: Intervention; showClient?: boolean; showTimeOnly?: boolean }) {
  const { data } = useStore()
  const client = data.clients.find((c) => c.id === i.clientId)
  const status = data.settings.statuses.find((s) => s.id === i.status)
  const start = i.appointment?.start
  return (
    <Link
      to={`/interventions/${i.id}`}
      className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-zinc-200 active:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-800 dark:active:bg-zinc-800"
    >
      {start != null && (
        <div className="w-14 shrink-0 text-center">
          <div className="text-lg leading-none font-bold text-brand-700 dark:text-brand-300">{formatTime(start).replace(' h ', 'h')}</div>
          {!showTimeOnly && <div className="mt-1 text-[11px] font-medium text-zinc-500 first-letter:uppercase">{relativeDay(start)}</div>}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{showClient && client ? fullName(client) : i.title}</span>
        </div>
        <div className="truncate text-sm text-zinc-600 dark:text-zinc-400">
          {showClient ? `${i.type} · ${i.title}` : `${i.type} · réf. ${i.ref}`}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <StatusBadge status={status} fallback={i.status} />
          {(i.calendarSync === 'pending' || i.calendarSync === 'error') && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              <Icon name="refresh" className="size-3.5" /> agenda
            </span>
          )}
        </div>
      </div>
      <Icon name="chevron" className="size-5 shrink-0 text-zinc-400" />
    </Link>
  )
}
