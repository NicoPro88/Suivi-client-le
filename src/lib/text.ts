/** Minuscules, sans accents, espaces simplifiés. */
export function normalize(s: string | undefined | null): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Chiffres d'un numéro, au format national (+33 6… → 06…). */
export function phoneDigits(s: string | undefined | null): string {
  let d = (s ?? '').replace(/\D/g, '')
  if (d.startsWith('0033')) d = '0' + d.slice(4)
  else if (d.startsWith('33') && d.length === 11) d = '0' + d.slice(2)
  return d
}

/** 0612345678 → 06 12 34 56 78 (laisse les autres formats tels quels). */
export function formatPhone(s: string): string {
  const d = phoneDigits(s)
  if (d.length === 10 && d.startsWith('0')) return d.replace(/(\d{2})(?=\d)/g, '$1 ')
  return s.trim()
}

/** Numéro pour un lien tel:/sms: (format international pour la France). */
export function phoneForLink(s: string): string {
  const d = phoneDigits(s)
  if (d.length === 10 && d.startsWith('0')) return '+33' + d.slice(1)
  return s.replace(/[^\d+]/g, '')
}

export function fullName(c: { firstName?: string; lastName?: string; company?: string }): string {
  const name = [c.firstName?.trim(), c.lastName?.trim().toUpperCase()].filter(Boolean).join(' ')
  return name || c.company?.trim() || 'Sans nom'
}

/** Nom pour le tri alphabétique : NOM Prénom. */
export function sortKey(c: { firstName?: string; lastName?: string; company?: string }): string {
  return normalize(`${c.lastName || c.company || ''} ${c.firstName || ''}`)
}

export function capitalize(s: string): string {
  const t = s.trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID().replace(/-/g, '').slice(0, 20)
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
