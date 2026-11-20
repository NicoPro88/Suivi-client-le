import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useStore } from '../data/store'
import { createSearchIndex } from '../lib/search'
import { formatPhone, fullName, sortKey } from '../lib/text'
import type { Client } from '../lib/types'
import { Icon } from '../components/Icon'
import { InterventionRow } from '../components/InterventionRow'
import { EmptyState, LinkButton, PageTitle, Section } from '../components/ui'

function ClientRow({ c }: { c: Client }) {
  const phone = c.phones?.[0]?.number
  return (
    <Link to={`/clients/${c.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 dark:active:bg-slate-800">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
        {(c.lastName || c.firstName || c.company || '?').charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{fullName(c)}</div>
        <div className="truncate text-sm text-slate-500 dark:text-slate-400">
          {[phone ? formatPhone(phone) : null, c.address?.city || c.address?.label].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>
      <Icon name="chevron" className="size-5 shrink-0 text-slate-400" />
    </Link>
  )
}

export function ClientsPage() {
  const { data, ready } = useStore()
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const search = useMemo(() => createSearchIndex(data.clients, data.interventions), [data.clients, data.interventions])
  const results = useMemo(() => (q.trim() ? search(q) : null), [search, q])

  const sorted = useMemo(() => [...data.clients].sort((a, b) => sortKey(a).localeCompare(sortKey(b), 'fr')), [data.clients])
  const groups = useMemo(() => {
    const g = new Map<string, Client[]>()
    for (const c of sorted) {
      const letter = sortKey(c).charAt(0).toUpperCase() || '#'
      const key = /[A-Z]/.test(letter) ? letter : '#'
      g.set(key, [...(g.get(key) ?? []), c])
    }
    return [...g.entries()]
  }, [sorted])

  if (results) {
    const none = results.clients.length === 0 && results.interventions.length === 0
    return (
      <div>
        <PageTitle title="Recherche" subtitle={`« ${q} »`} />
        {none ? (
          <div className="mt-6">
            <EmptyState icon="search" title="Aucun résultat">
              <p>Essaie avec une partie du nom, du numéro ou de la ville.</p>
              <LinkButton to="/clients/nouveau" variant="primary" size="sm" icon="plus" className="mt-3">
                Créer ce client
              </LinkButton>
            </EmptyState>
          </div>
        ) : (
          <>
            {results.clients.length > 0 && (
              <Section title="Clients" count={results.clients.length}>
                <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
                  {results.clients.map((c) => (
                    <ClientRow key={c.id} c={c} />
                  ))}
                </div>
              </Section>
            )}
            {results.interventions.length > 0 && (
              <Section title="Interventions" count={results.interventions.length}>
                <ul className="space-y-2">
                  {results.interventions.map((i) => (
                    <li key={i.id}>
                      <InterventionRow i={i} />
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <PageTitle
        title="Clients"
        subtitle={ready ? `${data.clients.length} client${data.clients.length > 1 ? 's' : ''}` : 'Chargement…'}
        actions={
          <LinkButton to="/clients/nouveau" variant="primary" size="sm" icon="plus">
            Nouveau
          </LinkButton>
        }
      />
      {ready && data.clients.length === 0 && (
        <div className="mt-6">
          <EmptyState icon="users" title="Pas encore de client">
            Ajoute ton premier client avec le bouton +.
          </EmptyState>
        </div>
      )}
      {groups.map(([letter, list]) => (
        <section key={letter} className="mt-4">
          <h2 className="mb-1 px-2 text-xs font-bold text-slate-500">{letter}</h2>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
            {list.map((c) => (
              <ClientRow key={c.id} c={c} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
