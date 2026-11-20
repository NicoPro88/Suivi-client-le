import type { AppData, Client, Intervention } from './types'
import { formatDateTime } from './dates'
import { formatPhone, fullName } from './text'

/** CSV au format Excel français : séparateur « ; », BOM UTF-8 pour les accents. */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v)
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + [headers, ...rows].map((r) => r.map(cell).join(';')).join('\r\n')
}

export function clientsCsv(clients: Client[]): string {
  return toCsv(
    ['Nom', 'Prénom', 'Société', 'Téléphone 1', 'Téléphone 2', 'Email', 'Adresse', 'Code postal', 'Ville', 'Notes', 'Créé le'],
    clients.map((c) => [
      c.lastName,
      c.firstName,
      c.company,
      c.phones?.[0] ? formatPhone(c.phones[0].number) : '',
      c.phones?.[1] ? formatPhone(c.phones[1].number) : '',
      c.email,
      c.address?.label,
      c.address?.postcode,
      c.address?.city,
      c.notes,
      formatDateTime(c.createdAt),
    ]),
  )
}

export function interventionsCsv(data: AppData): string {
  const clients = new Map(data.clients.map((c) => [c.id, c]))
  const statuses = new Map(data.settings.statuses.map((s) => [s.id, s.label]))
  return toCsv(
    ['Référence', 'Client', 'Type', 'Intitulé', 'Statut', 'RDV', 'Adresse du chantier', 'Description', 'Créée le'],
    data.interventions.map((i) => {
      const c = clients.get(i.clientId)
      return [
        i.ref,
        c ? fullName(c) : '',
        i.type,
        i.title,
        statuses.get(i.status) ?? i.status,
        i.appointment ? formatDateTime(i.appointment.start) : '',
        i.siteAddress?.label ?? c?.address?.label ?? '',
        i.description,
        formatDateTime(i.createdAt),
      ]
    }),
  )
}

/** Toutes les données d'un client (droit d'accès RGPD). */
export function clientExportJson(client: Client, interventions: Intervention[]): string {
  return JSON.stringify({ client, interventions: interventions.filter((i) => i.clientId === client.id) }, null, 2)
}

export function download(filename: string, content: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
