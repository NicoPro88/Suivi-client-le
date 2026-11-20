import type { Settings, Status } from './types'

export const DEFAULT_STATUSES: Status[] = [
  { id: 'nouveau', label: 'Nouveau', color: 'slate', open: true },
  { id: 'rdv', label: 'RDV fixé', color: 'blue', open: true },
  { id: 'devis', label: 'Devis envoyé', color: 'violet', open: true },
  { id: 'accepte', label: 'Accepté', color: 'cyan', open: true },
  { id: 'en-cours', label: 'En cours', color: 'amber', open: true },
  { id: 'attente-pieces', label: 'Attente pièces', color: 'orange', open: true },
  { id: 'termine', label: 'Terminé', color: 'green', open: false },
  { id: 'facture', label: 'Facturé', color: 'teal', open: false },
  { id: 'paye', label: 'Payé', color: 'emerald', open: false },
  { id: 'annule', label: 'Annulé', color: 'gray', open: false },
]

/** Statut qui retire le RDV de l'agenda. */
export const CANCELLED_STATUS = 'annule'

export const DEFAULT_TYPES = [
  'Dépannage électrique',
  'Installation électrique',
  'Mise aux normes',
  'Tableau électrique',
  'Prises et éclairage',
  "Réparation d'appareil",
  'Électroménager',
  'Petits travaux',
  'Diagnostic / devis',
  'Entretien',
]

export const DEFAULT_SMS_TEMPLATE =
  'Bonjour {prenom} {nom}, je vous confirme notre rendez-vous le {date} à {heure} ({adresse}). {signature}'

export const REMINDER_PRESETS = [
  'Rappeler le client',
  'Relancer le devis',
  'Commander la pièce',
  'Récupérer la pièce',
  'Repasser sur le chantier',
]

export const DURATION_OPTIONS: { label: string; minutes: number }[] = [
  { label: '30 min', minutes: 30 },
  { label: '1 h', minutes: 60 },
  { label: '1 h 30', minutes: 90 },
  { label: '2 h', minutes: 120 },
  { label: '3 h', minutes: 180 },
  { label: '4 h', minutes: 240 },
  { label: 'Demi-journée', minutes: 300 },
  { label: 'Journée', minutes: 480 },
]

export function defaultSettings(): Settings {
  return {
    statuses: DEFAULT_STATUSES.map((s) => ({ ...s })),
    types: [...DEFAULT_TYPES],
    calendarId: null,
    calendarEnabled: false,
    reminderMinutesBefore: 60,
    defaultDurationMin: 60,
    smsTemplate: DEFAULT_SMS_TEMPLATE,
    signature: '',
  }
}

/** Complète des réglages enregistrés avec les valeurs par défaut manquantes. */
export function withDefaults(partial: Partial<Settings> | undefined | null): Settings {
  const base = defaultSettings()
  if (!partial) return base
  return {
    ...base,
    ...partial,
    statuses: partial.statuses?.length ? partial.statuses : base.statuses,
    types: partial.types?.length ? partial.types : base.types,
  }
}
