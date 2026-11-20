import type { AppData, Client, Intervention } from '../lib/types'
import { defaultSettings } from '../lib/defaults'
import { addDays, atHour } from '../lib/dates'

/** Quelques clients fictifs pour découvrir l'appli en mode démo. */
export function demoData(now = Date.now()): AppData {
  const t = (days: number, h: number, m = 0) => atHour(addDays(now, days), h, m)
  const settings = { ...defaultSettings(), calendarEnabled: true, calendarId: 'demo-calendar', signature: 'Nicolas' }
  const client = (id: string, firstName: string, lastName: string, phone: string, label: string, postcode: string, city: string, notes = ''): Client => ({
    id,
    firstName,
    lastName,
    phones: [{ label: 'Mobile', number: phone }],
    address: { label, postcode, city },
    notes,
    createdAt: t(-40, 9),
    updatedAt: t(-40, 9),
  })
  const clients: Client[] = [
    client('c1', 'Martine', 'Lefèvre', '06 12 34 56 78', '12 rue des Lilas 88000 Épinal', '88000', 'Épinal', 'Code portail 1234. Chien gentil.'),
    client('c2', 'Karim', 'Benali', '07 81 22 45 90', '4 place de la Mairie 88190 Golbey', '88190', 'Golbey'),
    client('c3', 'Jean-Paul', 'Muller', '06 98 76 54 32', '27 avenue de la Gare 88150 Thaon-les-Vosges', '88150', 'Thaon-les-Vosges', 'Préfère être appelé le matin.'),
    client('c4', 'Sophie', 'Garnier', '06 45 67 89 01', '3 impasse du Moulin 88000 Dinozé', '88000', 'Dinozé'),
  ]
  const log = (at: number, text: string, kind: 'note' | 'status' = 'note') => ({ id: `l${at}${text.length}`, at, text, kind })
  const interventions: Intervention[] = [
    {
      id: 'i1', ref: `${new Date(now).getFullYear()}-0001`, clientId: 'c1', type: 'Dépannage électrique', title: 'Disjoncteur qui saute dans la cuisine',
      description: 'Saute dès que le four et le lave-vaisselle tournent.', status: 'rdv', appointment: { start: t(0, 14), durationMin: 60 },
      calendarEventId: 'demo-1', calendarSync: 'ok', log: [log(t(-2, 10), 'Appel de la cliente, RDV pris.')], reminders: [], createdAt: t(-2, 10), updatedAt: t(-2, 10),
    },
    {
      id: 'i2', ref: `${new Date(now).getFullYear()}-0002`, clientId: 'c2', type: 'Mise aux normes', title: 'Rénovation tableau électrique',
      status: 'devis', appointment: null, log: [log(t(-6, 17), 'Visite faite, devis envoyé via Abby.'), log(t(-6, 17), 'Statut : Devis envoyé', 'status')],
      reminders: [{ id: 'r1', at: t(-1, 9), reason: 'Relancer le devis', done: false, calendarEventId: 'demo-r1' }], createdAt: t(-8, 9), updatedAt: t(-6, 17),
    },
    {
      id: 'i3', ref: `${new Date(now).getFullYear()}-0003`, clientId: 'c3', type: "Réparation d'appareil", title: 'Lave-linge ne vidange plus',
      status: 'attente-pieces', appointment: { start: t(3, 9, 30), durationMin: 90 }, calendarEventId: 'demo-3', calendarSync: 'ok',
      log: [log(t(-3, 15), 'Pompe de vidange HS. Pièce commandée.')],
      reminders: [{ id: 'r2', at: t(0, 17), reason: 'Récupérer la pièce', done: false, calendarEventId: 'demo-r2' }], createdAt: t(-4, 8), updatedAt: t(-3, 15),
    },
    {
      id: 'i4', ref: `${new Date(now).getFullYear()}-0004`, clientId: 'c4', type: 'Prises et éclairage', title: 'Ajout de 4 prises au salon',
      status: 'termine', appointment: { start: t(-10, 8), durationMin: 240 }, calendarEventId: 'demo-4', calendarSync: 'ok',
      log: [log(t(-10, 12), 'Travaux terminés, client satisfait.')], reminders: [], createdAt: t(-15, 9), updatedAt: t(-10, 12),
    },
  ]
  return { clients, interventions, settings }
}
