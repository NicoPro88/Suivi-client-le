/** Prochaine référence d'intervention de l'année : 2026-0001, 2026-0002… */
export function nextRef(existingRefs: string[], now = Date.now()): string {
  const year = new Date(now).getFullYear()
  const prefix = `${year}-`
  let max = 0
  for (const r of existingRefs) {
    if (r?.startsWith(prefix)) {
      const n = parseInt(r.slice(prefix.length), 10)
      if (n > max) max = n
    }
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}
