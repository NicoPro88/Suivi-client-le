import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useStore } from '../data/store'
import { REMINDER_PRESETS } from '../lib/defaults'
import { addDays, atHour, durationLabel, formatDateTime, formatDay, formatTime, fromLocalInput, relativeDay, toLocalInput } from '../lib/dates'
import { confirmationMessage, interventionAddress, mapsHref, smsHref, telHref, wazeHref } from '../lib/links'
import { fullName } from '../lib/text'
import { Icon } from '../components/Icon'
import { StatusBadge } from '../components/StatusBadge'
import { ActionTile, Button, Card, Chip, Input, LinkButton, PageTitle, Section, Textarea } from '../components/ui'

function SyncState({ state }: { state?: string | null }) {
  if (state === 'ok')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400">
        <Icon name="check" className="size-3.5" /> Dans Google Agenda
      </span>
    )
  if (state === 'pending' || state === 'error')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
        <Icon name="refresh" className="size-3.5" /> {state === 'error' ? 'Erreur agenda' : 'Agenda en attente'}
      </span>
    )
  return null
}

function ReminderForm({ onAdd }: { onAdd: (at: number, reason: string) => void }) {
  const [reason, setReason] = useState(REMINDER_PRESETS[0])
  const [when, setWhen] = useState(() => toLocalInput(atHour(addDays(Date.now(), 1), 9)))
  const quick = [
    { label: 'Demain 9 h', at: () => atHour(addDays(Date.now(), 1), 9) },
    { label: 'Dans 3 jours', at: () => atHour(addDays(Date.now(), 3), 9) },
    { label: 'Dans 1 semaine', at: () => atHour(addDays(Date.now(), 7), 9) },
    { label: 'Dans 1 mois', at: () => atHour(addDays(Date.now(), 30), 9) },
  ]
  return (
    <div className="space-y-3">
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {REMINDER_PRESETS.map((p) => (
          <Chip key={p} active={reason === p} onClick={() => setReason(p)}>
            {p}
          </Chip>
        ))}
      </div>
      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif du rappel" />
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {quick.map((q) => (
          <Chip key={q.label} active={when === toLocalInput(q.at())} onClick={() => setWhen(toLocalInput(q.at()))}>
            {q.label}
          </Chip>
        ))}
      </div>
      <div className="flex gap-2">
        <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} step={900} />
        <Button
          variant="primary"
          icon="bell"
          onClick={() => {
            const at = fromLocalInput(when)
            if (at) onAdd(at, reason)
          }}
        >
          Ajouter
        </Button>
      </div>
    </div>
  )
}

export function InterventionPage() {
  const { id } = useParams()
  const store = useStore()
  const navigate = useNavigate()
  const { data } = store
  const i = data.interventions.find((x) => x.id === id)
  const [note, setNote] = useState('')
  const [showReminderForm, setShowReminderForm] = useState(false)

  if (!i) return <PageTitle title={store.ready ? 'Intervention introuvable' : 'Chargement…'} back="/interventions" />

  const client = data.clients.find((c) => c.id === i.clientId)
  const status = data.settings.statuses.find((s) => s.id === i.status)
  const addr = interventionAddress(i, client)
  const phone = client?.phones?.[0]?.number
  const reminders = [...i.reminders].sort((a, b) => Number(a.done) - Number(b.done) || a.at - b.at)
  const log = [...i.log].sort((a, b) => b.at - a.at)

  async function remove() {
    if (!window.confirm(`Supprimer l'intervention ${i!.ref} ? Son RDV et ses rappels seront retirés de l'agenda.`)) return
    await store.deleteIntervention(i!.id)
    store.notify('Intervention supprimée.')
    navigate(client ? `/clients/${client.id}` : '/interventions', { replace: true })
  }

  return (
    <div>
      <PageTitle
        title={i.title}
        subtitle={
          <>
            {i.type} · réf. {i.ref}
            {client && (
              <>
                {' · '}
                <Link to={`/clients/${client.id}`} className="font-semibold text-brand-700 dark:text-brand-300">
                  {fullName(client)}
                </Link>
              </>
            )}
          </>
        }
        back={client ? `/clients/${client.id}` : '/interventions'}
        actions={<LinkButton to={`/interventions/${i.id}/modifier`} variant="ghost" size="sm" icon="edit" aria-label="Modifier" />}
      />

      <div className="mt-3 flex items-center gap-2">
        <StatusBadge status={status} fallback={i.status} />
        <SyncState state={i.calendarSync} />
      </div>

      {(phone || addr) && (
        <div className="mt-4 flex gap-2">
          {phone && <ActionTile href={telHref(phone)} icon="phone" label="Appeler" />}
          {phone && <ActionTile href={smsHref(phone)} icon="message" label="SMS" />}
          {addr && <ActionTile href={mapsHref(addr)} icon="map" label="Maps" external />}
          {addr && <ActionTile href={wazeHref(addr)} icon="pin" label="Waze" external />}
        </div>
      )}

      <Section title="Statut">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {data.settings.statuses.map((s) => (
            <Chip key={s.id} active={s.id === i.status} onClick={() => store.setStatus(i.id, s.id)}>
              {s.label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Rendez-vous">
        <Card>
          {i.appointment ? (
            <>
              <div className="flex items-start gap-3">
                <Icon name="calendar" className="mt-0.5 size-5 shrink-0 text-brand-600" />
                <div className="flex-1">
                  <div className="font-semibold first-letter:uppercase">{formatDay(i.appointment.start)}</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {formatTime(i.appointment.start)} · {durationLabel(i.appointment.durationMin)}
                  </div>
                  {addr && <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{addr.label}</div>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {phone && client && (
                  <a href={smsHref(phone, confirmationMessage(i, client, data.settings))} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-sm font-semibold text-on-brand">
                    <Icon name="message" className="size-4" /> SMS de confirmation
                  </a>
                )}
                <LinkButton to={`/interventions/${i.id}/modifier`} size="sm" icon="clock">
                  Déplacer
                </LinkButton>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-500">Pas de rendez-vous fixé.</p>
              <LinkButton to={`/interventions/${i.id}/modifier`} size="sm" variant="primary" icon="calendar">
                Fixer un RDV
              </LinkButton>
            </div>
          )}
        </Card>
      </Section>

      <Section
        title="Rappels"
        count={i.reminders.filter((r) => !r.done).length}
        action={
          !showReminderForm && (
            <button type="button" className="text-sm font-semibold text-brand-700 dark:text-brand-300" onClick={() => setShowReminderForm(true)}>
              + Me rappeler
            </button>
          )
        }
      >
        {showReminderForm && (
          <Card className="mb-2">
            <ReminderForm
              onAdd={(at, reason) => {
                store.addReminder(i.id, at, reason)
                setShowReminderForm(false)
                store.notify(`Rappel ajouté : ${reason}, ${relativeDay(at)} à ${formatTime(at)}.`)
              }}
            />
          </Card>
        )}
        {reminders.length === 0 && !showReminderForm ? (
          <Button icon="bell" className="w-full" onClick={() => setShowReminderForm(true)}>
            Me rappeler de…
          </Button>
        ) : (
          <ul className="space-y-2">
            {reminders.map((r) => {
              const late = !r.done && r.at < Date.now()
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                  <input type="checkbox" checked={r.done} onChange={(e) => store.setReminderDone(i.id, r.id, e.target.checked)} className="size-6 shrink-0 accent-green-600" aria-label="Fait" />
                  <div className={`min-w-0 flex-1 ${r.done ? 'text-zinc-400 line-through' : ''}`}>
                    <div className="font-semibold">{r.reason}</div>
                    <div className={`text-sm ${late ? 'font-semibold text-red-700 dark:text-red-400' : 'text-zinc-500'}`}>
                      {relativeDay(r.at)} à {formatTime(r.at)}
                      {late && ' · en retard'}
                    </div>
                  </div>
                  <button type="button" onClick={() => void store.deleteReminder(i.id, r.id)} className="grid size-9 place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Supprimer le rappel">
                    <Icon name="trash" className="size-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <Section title="Suivi du chantier">
        <Card>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ce qui a été fait, ce qui reste, pièces à commander…" rows={2} />
          <div className="mt-2 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              icon="plus"
              disabled={!note.trim()}
              onClick={() => {
                store.addNote(i.id, note)
                setNote('')
              }}
            >
              Ajouter au journal
            </Button>
          </div>
        </Card>
        {i.description && (
          <Card className="mt-2">
            <p className="text-xs font-bold text-zinc-500 uppercase">Détails</p>
            <p className="mt-1 whitespace-pre-line">{i.description}</p>
          </Card>
        )}
        <ol className="mt-3 space-y-3 border-l-2 border-zinc-200 pl-4 dark:border-zinc-800">
          {log.map((l) => (
            <li key={l.id} className="relative">
              <span className={`absolute top-1.5 -left-[23px] size-3 rounded-full ring-4 ring-zinc-50 dark:ring-zinc-950 ${l.kind === 'note' ? 'bg-brand-600' : 'bg-zinc-400'}`} />
              <div className="text-xs text-zinc-500">{formatDateTime(l.at)}</div>
              <div className={l.kind === 'note' ? 'whitespace-pre-line' : 'text-sm text-zinc-600 italic dark:text-zinc-400'}>{l.text}</div>
            </li>
          ))}
        </ol>
      </Section>

      <div className="mt-8 flex gap-2">
        <LinkButton to={`/interventions/${i.id}/modifier`} icon="edit" className="flex-1">
          Modifier
        </LinkButton>
        <Button variant="danger" icon="trash" className="flex-1" onClick={() => void remove()}>
          Supprimer
        </Button>
      </div>
    </div>
  )
}
