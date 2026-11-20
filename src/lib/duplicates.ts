import type { Client, Phone } from './types'
import { normalize, phoneDigits } from './text'

export interface DuplicateHit {
  client: Client
  reason: 'phone' | 'name'
}

/** Clients existants qui ressemblent à celui qu'on saisit (même téléphone ou même nom). */
export function findDuplicates(
  draft: { firstName: string; lastName: string; phones: Phone[] },
  clients: Client[],
  excludeId?: string,
): DuplicateHit[] {
  const digits = draft.phones.map((p) => phoneDigits(p.number)).filter((d) => d.length >= 9)
  const last9 = (d: string) => d.slice(-9)
  const draftPhones = new Set(digits.map(last9))
  const name = normalize(`${draft.firstName} ${draft.lastName}`)
  const lastOnly = normalize(draft.lastName)
  const hits: DuplicateHit[] = []
  for (const c of clients) {
    if (c.id === excludeId) continue
    const phoneMatch = (c.phones ?? []).some((p) => {
      const d = phoneDigits(p.number)
      return d.length >= 9 && draftPhones.has(last9(d))
    })
    if (phoneMatch) {
      hits.push({ client: c, reason: 'phone' })
      continue
    }
    const cName = normalize(`${c.firstName} ${c.lastName}`)
    if (lastOnly.length >= 2 && name.length >= 3 && cName === name) hits.push({ client: c, reason: 'name' })
  }
  return hits
}
