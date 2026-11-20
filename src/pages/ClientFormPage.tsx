import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useStore } from '../data/store'
import { findDuplicates } from '../lib/duplicates'
import { capitalize, formatPhone, fullName } from '../lib/text'
import type { Address, Phone } from '../lib/types'
import { AddressInput } from '../components/AddressInput'
import { Icon } from '../components/Icon'
import { Button, Card, Field, Input, PageTitle, Textarea } from '../components/ui'

const PHONE_LABELS = ['Mobile', 'Fixe', 'Travail', 'Conjoint', 'Sur place', 'Autre']

export function ClientFormPage() {
  const { id } = useParams()
  const store = useStore()
  const navigate = useNavigate()
  const existing = id ? store.data.clients.find((c) => c.id === id) : undefined

  const [firstName, setFirstName] = useState(existing?.firstName ?? '')
  const [lastName, setLastName] = useState(existing?.lastName ?? '')
  const [company, setCompany] = useState(existing?.company ?? '')
  const [showCompany, setShowCompany] = useState(Boolean(existing?.company))
  const [phones, setPhones] = useState<Phone[]>(existing?.phones?.length ? existing.phones : [{ label: 'Mobile', number: '' }])
  const [email, setEmail] = useState(existing?.email ?? '')
  const [address, setAddress] = useState<Address>(existing?.address ?? { label: '' })
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [error, setError] = useState('')

  const duplicates = useMemo(
    () => findDuplicates({ firstName, lastName, phones }, store.data.clients, existing?.id),
    [firstName, lastName, phones, store.data.clients, existing?.id],
  )

  if (id && !existing) {
    return <PageTitle title="Client introuvable" back="/clients" />
  }

  const setPhone = (idx: number, patch: Partial<Phone>) => setPhones((p) => p.map((x, i) => (i === idx ? { ...x, ...patch } : x)))

  function save(then: 'client' | 'intervention') {
    if (!firstName.trim() && !lastName.trim() && !company.trim()) {
      setError('Indique au moins un nom.')
      return
    }
    const cleanPhones = phones.map((p) => ({ label: p.label, number: formatPhone(p.number) })).filter((p) => p.number)
    const newId = store.saveClient({
      id: existing?.id,
      firstName: capitalize(firstName),
      lastName: lastName.trim(),
      company: company.trim() || undefined,
      phones: cleanPhones,
      email: email.trim() || undefined,
      address: { ...address, label: address.label.trim() },
      notes: notes.trim() || undefined,
    })
    store.notify(existing ? 'Fiche mise à jour.' : 'Client enregistré.')
    navigate(then === 'intervention' ? `/interventions/nouvelle?client=${newId}` : `/clients/${newId}`, { replace: true })
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    save('client')
  }

  return (
    <form onSubmit={onSubmit}>
      <PageTitle title={existing ? 'Modifier le client' : 'Nouveau client'} back={existing ? `/clients/${existing.id}` : '/clients'} />

      <Card className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="off" autoCapitalize="words" autoFocus={!existing} />
          </Field>
          <Field label="Nom">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="off" autoCapitalize="characters" />
          </Field>
        </div>
        {showCompany ? (
          <Field label="Société (facultatif)">
            <Input value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="off" />
          </Field>
        ) : (
          <button type="button" className="text-sm font-semibold text-brand-700 dark:text-brand-300" onClick={() => setShowCompany(true)}>
            + Ajouter une société
          </button>
        )}

        <div>
          <span className="mb-1 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">Téléphone</span>
          <div className="space-y-2">
            {phones.map((p, idx) => (
              <div key={idx} className="flex gap-2">
                <select
                  value={p.label}
                  onChange={(e) => setPhone(idx, { label: e.target.value })}
                  className="w-28 shrink-0 rounded-xl border-0 bg-white px-2 py-2.5 text-sm ring-1 ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-700"
                  aria-label="Type de numéro"
                >
                  {[...new Set([...PHONE_LABELS, p.label])].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
                <Input type="tel" inputMode="tel" value={p.number} onChange={(e) => setPhone(idx, { number: e.target.value })} placeholder="06 12 34 56 78" autoComplete="off" />
                {phones.length > 1 && (
                  <button type="button" onClick={() => setPhones((ps) => ps.filter((_, i) => i !== idx))} className="grid size-11 shrink-0 place-items-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Retirer ce numéro">
                    <Icon name="x" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="mt-2 text-sm font-semibold text-brand-700 dark:text-brand-300" onClick={() => setPhones((p) => [...p, { label: phones.length ? 'Fixe' : 'Mobile', number: '' }])}>
            + Autre numéro (fixe, conjoint, gardien…)
          </button>
        </div>

        {duplicates.length > 0 && (
          <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800">
            <p className="flex items-center gap-1.5 font-semibold">
              <Icon name="alert" className="size-4" /> Ce client existe peut-être déjà :
            </p>
            <ul className="mt-1 space-y-1">
              {duplicates.slice(0, 3).map((d) => (
                <li key={d.client.id}>
                  <Link to={`/clients/${d.client.id}`} className="font-semibold underline">
                    {fullName(d.client)}
                  </Link>{' '}
                  ({d.reason === 'phone' ? 'même téléphone' : 'même nom'})
                </li>
              ))}
            </ul>
          </div>
        )}

        <Field label="Adresse" hint="Choisis une suggestion pour un GPS précis, ou écris librement.">
          <AddressInput value={address} onChange={setAddress} />
        </Field>

        <Field label="Email (facultatif)">
          <Input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </Field>

        <Field label="Notes" hint="Code portail, accès, disponibilités, matériel en place…">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
      </Card>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant="primary" size="lg" icon="check" className="flex-1">
          Enregistrer
        </Button>
        {!existing && (
          <Button size="lg" icon="wrench" className="flex-1" onClick={() => save('intervention')}>
            Enregistrer + intervention
          </Button>
        )}
      </div>
    </form>
  )
}
