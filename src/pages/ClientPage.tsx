import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useStore } from '../data/store'
import { clientExportJson, download } from '../lib/csv'
import { mailHref, mapsHref, smsHref, telHref, wazeHref } from '../lib/links'
import { formatPhone, fullName } from '../lib/text'
import { Icon } from '../components/Icon'
import { InterventionRow } from '../components/InterventionRow'
import { ActionTile, Button, Card, EmptyState, LinkButton, PageTitle, Section } from '../components/ui'

export function ClientPage() {
  const { id } = useParams()
  const store = useStore()
  const navigate = useNavigate()
  const client = store.data.clients.find((c) => c.id === id)
  const history = useMemo(
    () =>
      store.data.interventions
        .filter((i) => i.clientId === id)
        .sort((a, b) => (b.appointment?.start ?? b.createdAt) - (a.appointment?.start ?? a.createdAt)),
    [store.data.interventions, id],
  )

  if (!client) {
    return (
      <div>
        <PageTitle title={store.ready ? 'Client introuvable' : 'Chargement…'} back="/clients" />
      </div>
    )
  }

  const phone = client.phones?.[0]?.number
  const addr = client.address?.label ? client.address : null

  async function remove() {
    const n = history.length
    const msg = n
      ? `Supprimer ${fullName(client!)} et ses ${n} intervention(s) ? Les RDV à venir seront retirés de l'agenda. C'est définitif.`
      : `Supprimer ${fullName(client!)} ? C'est définitif.`
    if (!window.confirm(msg)) return
    await store.deleteClient(client!.id)
    store.notify('Client supprimé.')
    navigate('/clients', { replace: true })
  }

  return (
    <div>
      <PageTitle
        title={fullName(client)}
        subtitle={client.company}
        back="/clients"
        actions={<LinkButton to={`/clients/${client.id}/modifier`} variant="ghost" size="sm" icon="edit" aria-label="Modifier" />}
      />

      <div className="mt-4 flex gap-2">
        {phone && <ActionTile href={telHref(phone)} icon="phone" label="Appeler" />}
        {phone && <ActionTile href={smsHref(phone)} icon="message" label="SMS" />}
        {addr && <ActionTile href={mapsHref(addr)} icon="map" label="Maps" external />}
        {addr && <ActionTile href={wazeHref(addr)} icon="pin" label="Waze" external />}
        {client.email && <ActionTile href={mailHref(client.email)} icon="mail" label="Email" />}
      </div>

      <Card className="mt-4 space-y-3">
        {client.phones?.map((p, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <Icon name="phone" className="size-5 shrink-0 text-zinc-400" />
            <a href={telHref(p.number)} className="flex-1 font-semibold">
              {formatPhone(p.number)}
            </a>
            <span className="text-sm text-zinc-500">{p.label}</span>
          </div>
        ))}
        {addr && (
          <div className="flex items-start gap-3">
            <Icon name="pin" className="mt-0.5 size-5 shrink-0 text-zinc-400" />
            <a href={mapsHref(addr)} target="_blank" rel="noreferrer" className="flex-1">
              {addr.label}
            </a>
          </div>
        )}
        {client.email && (
          <div className="flex items-center gap-3">
            <Icon name="mail" className="size-5 shrink-0 text-zinc-400" />
            <a href={mailHref(client.email)} className="flex-1 break-all">
              {client.email}
            </a>
          </div>
        )}
        {client.notes && (
          <div className="flex items-start gap-3">
            <Icon name="note" className="mt-0.5 size-5 shrink-0 text-zinc-400" />
            <p className="flex-1 whitespace-pre-line text-zinc-700 dark:text-zinc-300">{client.notes}</p>
          </div>
        )}
        {!client.phones?.length && !addr && !client.email && !client.notes && <p className="text-sm text-zinc-500">Aucune coordonnée pour l'instant.</p>}
      </Card>

      <LinkButton to={`/interventions/nouvelle?client=${client.id}`} variant="primary" size="lg" icon="plus" className="mt-4 w-full">
        Nouvelle intervention
      </LinkButton>

      <Section title="Historique" count={history.length}>
        {history.length === 0 ? (
          <EmptyState icon="wrench" title="Aucune intervention pour ce client" />
        ) : (
          <ul className="space-y-2">
            {history.map((i) => (
              <li key={i.id}>
                <InterventionRow i={i} showClient={false} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Données du client">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            icon="download"
            className="flex-1"
            onClick={() => download(`client-${(client.lastName || 'export').toLowerCase()}.json`, clientExportJson(client, store.data.interventions), 'application/json')}
          >
            Exporter ses données
          </Button>
          <Button icon="trash" variant="danger" className="flex-1" onClick={() => void remove()}>
            Supprimer le client
          </Button>
        </div>
        <p className="mt-2 px-1 text-xs text-zinc-500">Utile si un client demande ses données ou leur effacement (RGPD).</p>
      </Section>
    </div>
  )
}
