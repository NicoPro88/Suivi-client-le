import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useStore } from '../data/store'
import { DURATION_OPTIONS } from '../lib/defaults'
import { addDays, atHour, fromLocalInput, toLocalInput } from '../lib/dates'
import { createSearchIndex } from '../lib/search'
import { fullName } from '../lib/text'
import type { Address } from '../lib/types'
import { AddressInput } from '../components/AddressInput'
import { Button, Card, Chip, Field, Input, PageTitle, Select, Textarea } from '../components/ui'

function ClientPicker({ onPick }: { onPick: (id: string) => void }) {
  const { data } = useStore()
  const [q, setQ] = useState('')
  const search = useMemo(() => createSearchIndex(data.clients, []), [data.clients])
  const hits = q.trim() ? search(q).clients.slice(0, 6) : []
  return (
    <div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher le client (nom, téléphone…)" autoFocus />
      {hits.length > 0 && (
        <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl ring-1 ring-slate-200 dark:divide-slate-800 dark:ring-slate-700">
          {hits.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onPick(c.id)} className="w-full px-3.5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                <span className="font-semibold">{fullName(c)}</span>
                <span className="ml-2 text-sm text-slate-500">{c.address?.city}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function InterventionFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const store = useStore()
  const navigate = useNavigate()
  const { settings } = store.data
  const existing = id ? store.data.interventions.find((i) => i.id === id) : undefined

  const [clientId, setClientId] = useState(existing?.clientId ?? params.get('client') ?? '')
  const client = store.data.clients.find((c) => c.id === clientId)
  const [type, setType] = useState(existing?.type ?? '')
  const [customType, setCustomType] = useState(existing && !settings.types.includes(existing.type))
  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [otherSite, setOtherSite] = useState(Boolean(existing?.siteAddress?.label))
  const [siteAddress, setSiteAddress] = useState<Address>(existing?.siteAddress ?? { label: '' })
  const [withRdv, setWithRdv] = useState(existing ? Boolean(existing.appointment) : true)
  const [start, setStart] = useState(() => toLocalInput(existing?.appointment?.start ?? atHour(addDays(Date.now(), 1), 9)))
  const [duration, setDuration] = useState(existing?.appointment?.durationMin ?? settings.defaultDurationMin)
  const [error, setError] = useState('')

  if (id && !existing) return <PageTitle title="Intervention introuvable" back="/interventions" />

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!clientId || !client) return setError('Choisis le client.')
    if (!type.trim()) return setError("Choisis le type d'intervention.")
    const startMs = withRdv ? fromLocalInput(start) : null
    if (withRdv && !startMs) return setError('Indique la date et l’heure du rendez-vous.')
    const appointment = withRdv && startMs ? { start: startMs, durationMin: duration } : null
    // Nouveau dossier : « RDV fixé » s'il y a un RDV, sinon « Nouveau ».
    const status = existing?.status ?? (appointment ? 'rdv' : 'nouveau')
    const newId = store.saveIntervention({
      ...(existing ?? {}),
      id: existing?.id,
      clientId,
      type: type.trim(),
      title: title.trim() || type.trim(),
      description: description.trim() || undefined,
      siteAddress: otherSite && siteAddress.label.trim() ? siteAddress : null,
      status,
      appointment,
    })
    store.notify(existing ? 'Intervention mise à jour.' : appointment ? 'Intervention créée, RDV envoyé à l’agenda.' : 'Intervention créée.')
    navigate(`/interventions/${newId}`, { replace: true })
  }

  return (
    <form onSubmit={onSubmit}>
      <PageTitle
        title={existing ? "Modifier l'intervention" : 'Nouvelle intervention'}
        subtitle={existing ? `Réf. ${existing.ref}` : undefined}
        back={existing ? `/interventions/${existing.id}` : client ? `/clients/${client.id}` : '/'}
      />

      <Card className="mt-4 space-y-4">
        <Field label="Client">
          {client ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
              <span className="font-semibold">{fullName(client)}</span>
              {!existing && (
                <button type="button" className="text-sm font-semibold text-brand-700 dark:text-brand-300" onClick={() => setClientId('')}>
                  Changer
                </button>
              )}
            </div>
          ) : (
            <ClientPicker onPick={setClientId} />
          )}
        </Field>

        <div>
          <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Type</span>
          <div className="flex flex-wrap gap-2">
            {settings.types.map((t) => (
              <Chip
                key={t}
                active={!customType && type === t}
                onClick={() => {
                  setCustomType(false)
                  setType(t)
                }}
              >
                {t}
              </Chip>
            ))}
            <Chip
              active={Boolean(customType)}
              onClick={() => {
                setCustomType(true)
                setType('')
              }}
            >
              Autre…
            </Chip>
          </div>
          {customType && <Input className="mt-2" value={type} onChange={(e) => setType(e.target.value)} placeholder="Type d'intervention" autoFocus />}
        </div>

        <Field label="Intitulé" hint="En quelques mots : ce qui est à faire.">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. : disjoncteur qui saute dans la cuisine" />
        </Field>

        <Field label="Détails (facultatif)">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Symptômes, matériel, accès…" />
        </Field>

        <label className="flex items-center gap-3">
          <input type="checkbox" checked={otherSite} onChange={(e) => setOtherSite(e.target.checked)} className="size-5 accent-brand-600" />
          <span className="text-sm font-semibold">Le chantier est à une autre adresse</span>
        </label>
        {otherSite && (
          <Field label="Adresse du chantier" hint={client?.address?.label ? `Adresse du client : ${client.address.label}` : undefined}>
            <AddressInput value={siteAddress} onChange={setSiteAddress} />
          </Field>
        )}
      </Card>

      <Card className="mt-4 space-y-4">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={withRdv} onChange={(e) => setWithRdv(e.target.checked)} className="size-5 accent-brand-600" />
          <span className="font-semibold">Fixer un rendez-vous</span>
        </label>
        {withRdv && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
            <Field label="Date et heure">
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} step={900} />
            </Field>
            <Field label="Durée">
              <Select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATION_OPTIONS.map((d) => (
                  <option key={d.minutes} value={d.minutes}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
        {withRdv && store.data.settings.calendarEnabled && <p className="text-xs text-slate-500">Le RDV sera ajouté à ton Google Agenda « Interventions ».</p>}
      </Card>

      {error && <p className="mt-3 font-semibold text-red-700">{error}</p>}

      <Button type="submit" variant="primary" size="lg" icon="check" className="mt-4 w-full">
        Enregistrer
      </Button>
    </form>
  )
}
