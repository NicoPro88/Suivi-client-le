import { useMemo, useState } from 'react'
import { useStore } from '../data/store'
import { InterventionRow } from '../components/InterventionRow'
import { Chip, EmptyState, PageTitle } from '../components/ui'

export function InterventionsPage() {
  const { data } = useStore()
  const [filter, setFilter] = useState<'open' | 'all' | string>('open')
  const openIds = useMemo(() => new Set(data.settings.statuses.filter((s) => s.open).map((s) => s.id)), [data.settings.statuses])
  const list = useMemo(() => {
    const items = data.interventions.filter((i) => (filter === 'open' ? openIds.has(i.status) : filter === 'all' ? true : i.status === filter))
    return items.sort((a, b) => b.updatedAt - a.updatedAt)
  }, [data.interventions, filter, openIds])
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    data.interventions.forEach((i) => m.set(i.status, (m.get(i.status) ?? 0) + 1))
    return m
  }, [data.interventions])

  return (
    <div>
      <PageTitle title="Suivi des interventions" subtitle={`${list.length} affichée${list.length > 1 ? 's' : ''}`} />
      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={filter === 'open'} onClick={() => setFilter('open')}>
          En cours
        </Chip>
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
          Toutes
        </Chip>
        {data.settings.statuses
          .filter((s) => counts.get(s.id))
          .map((s) => (
            <Chip key={s.id} active={filter === s.id} onClick={() => setFilter(s.id)}>
              {s.label} ({counts.get(s.id)})
            </Chip>
          ))}
      </div>
      <ul className="mt-4 space-y-2">
        {list.map((i) => (
          <li key={i.id}>
            <InterventionRow i={i} />
          </li>
        ))}
      </ul>
      {list.length === 0 && (
        <div className="mt-4">
          <EmptyState icon="wrench" title="Rien ici">
            Les interventions se créent depuis la fiche d'un client.
          </EmptyState>
        </div>
      )}
    </div>
  )
}
