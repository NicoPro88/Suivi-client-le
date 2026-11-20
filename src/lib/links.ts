import type { Address, Client, Intervention, Settings } from './types'
import { formatDay, formatTime } from './dates'
import { phoneForLink } from './text'

export const telHref = (phone: string) => `tel:${phoneForLink(phone)}`

/** Ouvre l'appli SMS avec le message prérempli (Android et iPhone). */
export const smsHref = (phone: string, body?: string) =>
  `sms:${phoneForLink(phone)}${body ? `?&body=${encodeURIComponent(body)}` : ''}`

export const mailHref = (email: string) => `mailto:${email}`

export const mapsHref = (a: Address) =>
  a.lat != null && a.lng != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a.label)}`

export const wazeHref = (a: Address) =>
  a.lat != null && a.lng != null
    ? `https://waze.com/ul?ll=${a.lat},${a.lng}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(a.label)}&navigate=yes`

/** Adresse où se passe l'intervention : celle du chantier, sinon celle du client. */
export function interventionAddress(i: Intervention, c?: Client | null): Address | null {
  if (i.siteAddress?.label) return i.siteAddress
  if (c?.address?.label) return c.address
  return null
}

/** Texte du SMS de confirmation de RDV, à partir du modèle des réglages. */
export function confirmationMessage(i: Intervention, c: Client, settings: Settings): string {
  const start = i.appointment?.start
  const addr = interventionAddress(i, c)
  const values: Record<string, string> = {
    prenom: c.firstName?.trim() ?? '',
    nom: c.lastName?.trim() ?? '',
    date: start ? formatDay(start) : '',
    heure: start ? formatTime(start) : '',
    adresse: addr?.label ?? '',
    type: i.type ?? '',
    signature: settings.signature?.trim() ?? '',
  }
  return settings.smsTemplate
    .replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? '')
    .replace(/\(\s*\)/g, '')
    .replace(/ {2,}/g, ' ')
    .replace(/\s+([.,])/g, '$1')
    .trim()
}
