import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { DEMO_MODE } from '../config'
import { useStore } from '../data/store'
import { computeToday } from '../lib/dashboard'
import { formatDay, formatTime, relativeDay } from '../lib/dates'
import { interventionAddress, mapsHref, telHref } from '../lib/links'
import { fullName } from '../lib/text'
import { calendar } from '../lib/calendar'
import { Icon } from '../components/Icon'
import { InterventionRow } from '../components/InterventionRow'
import { Button, Card, EmptyState, LinkButton, Section } from '../components/ui'

export function TodayPage() {
  const store = useStore()
  const { data } = store
  const view = useMemo(() => computeToday(data.interventions, data.clients, data.settings.statuses), [data])
  const clientOf = (id: string) => data.clients.find((c) => c.id === id)
  const [connecting, setConnecting] = useState(false)

  const greeting = new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir'
  const firstName = store.user.name.split(' ')[0]

  return (
    <div>
      <div className="pt-5">
        <p className="text-sm font-medium text-slate-500 first-letter:uppercase dark:text-slate-400">{formatDay(Date.now())}</p>
        <h1 className="text-2xl font-bold">
          {greeting}
          {firstName && !DEMO_MODE ? ` ${firstName}` : ''} !
        </h1>
      </div>

      {!data.settings.calendarEnabled && calendar.available && (
        <Card className="mt-4 flex items-start gap-3 bg-brand-50 ring-brand-200 dark:bg-brand-900/30 dark:ring-brand-800">
          <Icon name="calendar" className="mt-0.5 size-6 shrink-0 text-brand-700 dark:text-brand-300" />
          <div className="flex-1">
            <p className="font-semibold">Connecte ton Google Agenda</p>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">Tes RDV et rappels iront dans un agenda « Interventions », avec les notifications sur ton téléphone.</p>
            <Button
              variant="primary"
              size="sm"
              className="mt-3"
              disabled={connecting}
              onClick={async () => {
                setConnecting(true)
                try {
                  await store.connectCalendar()
                } catch (e) {
                  store.notify(`Connexion à Google Agenda impossible : ${(e as Error).message}`, 'error')
                } finally {
                  setConnecting(false)
                }
              }}
            >
              {connecting ? 'Connexion…' : 'Connecter Google Agenda'}
            </Button>
          </div>
        </Card>
      )}

      {view.reminders.length > 0 && (
        <Section title="Rappels" count={view.reminders.length}>
          <ul className="space-y-2">
            {view.reminders.map(({ reminder: r, intervention: i, client: c, overdue }) => {
              const phone = c?.phones?.[0]?.number
              return (
                <li key={r.id} className={`flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 dark:bg-slate-900 ${overdue ? 'ring-red-300 dark:ring-red-800' : 'ring-slate-200 dark:ring-slate-800'}`}>
                  <button
                    type="button"
                    onClick={() => store.setReminderDone(i.id, r.id, true)}
                    className="grid size-10 shrink-0 place-items-center rounded-full ring-2 ring-slate-300 text-slate-400 hover:bg-green-50 hover:text-green-700 hover:ring-green-500 dark:ring-slate-600"
                    aria-label="Marquer comme fait"
                  >
                    <Icon name="check" />
                  </button>
                  <Link to={`/interventions/${i.id}`} className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{r.reason}</div>
                    <div className="truncate text-sm text-slate-600 dark:text-slate-400">
                      {c ? fullName(c) : ''} · {i.title}
                    </div>
                    <div className={`text-xs font-semibold ${overdue ? 'text-red-700 dark:text-red-400' : 'text-slate-500'}`}>
                      {overdue ? `En retard · prévu ${relativeDay(r.at)}` : `À ${formatTime(r.at)}`}
                    </div>
                  </Link>
                  {phone && (
                    <a href={telHref(phone)} className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300" aria-label="Appeler">
                      <Icon name="phone" />
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      <Section title="Rendez-vous du jour" count={view.appointmentsToday.length}>
        {view.appointmentsToday.length === 0 ? (
          <EmptyState icon="calendar" title="Aucun rendez-vous aujourd'hui" />
        ) : (
          <ul className="space-y-2">
            {view.appointmentsToday.map((i) => {
              const c = clientOf(i.clientId)
              const addr = interventionAddress(i, c)
              const phone = c?.phones?.[0]?.number
              return (
                <li key={i.id}>
                  <InterventionRow i={i} showTimeOnly />
                  {(addr || phone) && (
                    <div className="mt-1.5 flex gap-2 px-1">
                      {addr && (
                        <a href={mapsHref(addr)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-brand-700 dark:text-brand-300">
                          <Icon name="map" className="size-4" /> Itinéraire
                        </a>
                      )}
                      {phone && (
                        <a href={telHref(phone)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-brand-700 dark:text-brand-300">
                          <Icon name="phone" className="size-4" /> Appeler
                        </a>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      {view.upcoming.length > 0 && (
        <Section title="7 prochains jours" count={view.upcoming.length}>
          <ul className="space-y-2">
            {view.upcoming.map((i) => (
              <li key={i.id}>
                <InterventionRow i={i} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Chantiers en cours" count={view.open.length} action={<Link to="/interventions" className="text-sm font-semibold text-brand-700 dark:text-brand-300">Tout voir</Link>}>
        {view.open.length === 0 ? (
          <EmptyState icon="wrench" title="Aucun chantier en cours">
            <LinkButton to="/clients/nouveau" variant="primary" size="sm" icon="plus" className="mt-2">
              Nouveau client
            </LinkButton>
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {view.open.slice(0, 8).map((i) => (
              <li key={i.id}>
                <InterventionRow i={i} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}
