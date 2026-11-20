import Fuse from 'fuse.js'
import type { Client, Intervention } from './types'
import { fullName, normalize, phoneDigits } from './text'

export interface SearchResults {
  clients: Client[]
  interventions: Intervention[]
}

interface ClientEntry {
  client: Client
  name: string
  reversed: string
  company: string
  address: string
  city: string
  email: string
  notes: string
  phones: string[]
}

interface InterventionEntry {
  intervention: Intervention
  ref: string
  title: string
  type: string
  clientName: string
}

/**
 * Index de recherche : construit une fois, interrogé à chaque frappe.
 * - un numéro (même partiel, avec ou sans espaces) cherche dans les téléphones ;
 * - une référence (2026-0142 ou 0142) trouve l'intervention ;
 * - le reste passe par une recherche approchée (accents et fautes de frappe tolérés).
 */
export function createSearchIndex(clients: Client[], interventions: Intervention[]) {
  const clientEntries: ClientEntry[] = clients.map((c) => ({
    client: c,
    name: normalize(`${c.firstName} ${c.lastName}`),
    reversed: normalize(`${c.lastName} ${c.firstName}`),
    company: normalize(c.company),
    address: normalize(c.address?.label),
    city: normalize(c.address?.city),
    email: normalize(c.email),
    notes: normalize(c.notes),
    phones: (c.phones ?? []).map((p) => phoneDigits(p.number)).filter(Boolean),
  }))
  const byId = new Map(clients.map((c) => [c.id, c]))
  const interventionEntries: InterventionEntry[] = interventions.map((i) => {
    const c = byId.get(i.clientId)
    return {
      intervention: i,
      ref: normalize(i.ref),
      title: normalize(`${i.title} ${i.description ?? ''}`),
      type: normalize(i.type),
      clientName: c ? normalize(fullName(c)) : '',
    }
  })

  const clientFuse = new Fuse(clientEntries, {
    keys: [
      { name: 'name', weight: 3 },
      { name: 'reversed', weight: 3 },
      { name: 'company', weight: 2 },
      { name: 'city', weight: 1.5 },
      { name: 'address', weight: 1 },
      { name: 'email', weight: 0.7 },
      { name: 'notes', weight: 0.5 },
    ],
    threshold: 0.34,
    ignoreLocation: true,
    minMatchCharLength: 2,
  })
  const interventionFuse = new Fuse(interventionEntries, {
    keys: [
      { name: 'title', weight: 2 },
      { name: 'type', weight: 1 },
    ],
    threshold: 0.3,
    ignoreLocation: true,
    minMatchCharLength: 3,
  })

  return function search(query: string, limit = 30): SearchResults {
    const q = normalize(query)
    if (!q) return { clients: [], interventions: [] }

    // Référence d'intervention : 2026-0142, 2026 0142 ou juste 0142.
    const refMatch = q.match(/^(\d{4})?[\s-]?(\d{1,4})$/)
    const compact = q.replace(/[\s.\-+()]/g, '')

    let refHits: Intervention[] = []
    if (refMatch && compact.length <= 8) {
      const [, year, num] = refMatch
      refHits = interventionEntries
        .filter((e) => {
          const [ry, rn] = e.ref.split('-')
          return (!year || ry === year) && rn?.endsWith(num.padStart(Math.min(num.length, 4), '0'))
        })
        .map((e) => e.intervention)
    }

    // Numéro de téléphone (au moins 2 chiffres, rien d'autre).
    if (/^\d{2,}$/.test(compact)) {
      const digits = phoneDigits(compact)
      const phoneHits = clientEntries
        .filter((e) => e.phones.some((p) => p.includes(digits) || p.includes(compact)))
        .map((e) => e.client)
      return { clients: phoneHits.slice(0, limit), interventions: refHits.slice(0, limit) }
    }

    // Les clients dont le nom commence par la recherche passent devant.
    const prefixHits = clientEntries
      .filter((e) => e.name.startsWith(q) || e.reversed.startsWith(q) || e.company.startsWith(q))
      .map((e) => e.client)
    const fuzzyHits = clientFuse.search(q, { limit: limit * 2 }).map((r) => r.item.client)
    const clientsOut = dedupe([...prefixHits, ...fuzzyHits]).slice(0, limit)

    const clientIds = new Set(clientsOut.map((c) => c.id))
    const interventionHits = [
      ...refHits,
      ...interventionFuse.search(q, { limit }).map((r) => r.item.intervention),
      // Interventions des clients trouvés, pour retrouver un chantier par le nom du client.
      ...interventionEntries.filter((e) => clientIds.has(e.intervention.clientId) && q.length >= 3 && e.clientName.includes(q)).map((e) => e.intervention),
    ]
    return { clients: clientsOut, interventions: dedupe(interventionHits).slice(0, limit) }
  }
}

function dedupe<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)))
}
