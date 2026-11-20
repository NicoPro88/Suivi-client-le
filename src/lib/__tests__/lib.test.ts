import { describe, expect, it } from 'vitest'
import { formatPhone, normalize, phoneDigits, phoneForLink, fullName } from '../text'
import { nextRef } from '../refs'
import { findDuplicates } from '../duplicates'
import { createSearchIndex } from '../search'
import { confirmationMessage, interventionAddress, smsHref } from '../links'
import { clientsCsv, toCsv } from '../csv'
import { computeToday } from '../dashboard'
import { buildAppointmentEvent, buildReminderEvent } from '../calendarEvents'
import { parseAddressFeatures } from '../address'
import { defaultSettings, withDefaults } from '../defaults'
import { atHour, addDays } from '../dates'
import type { Client, Intervention } from '../types'

const client = (over: Partial<Client> = {}): Client => ({
  id: 'c1',
  firstName: 'Martine',
  lastName: 'Lefèvre',
  phones: [{ label: 'Mobile', number: '06 12 34 56 78' }],
  address: { label: '12 rue des Lilas 88000 Épinal', city: 'Épinal', postcode: '88000' },
  createdAt: 0,
  updatedAt: 0,
  ...over,
})

const intervention = (over: Partial<Intervention> = {}): Intervention => ({
  id: 'i1',
  ref: '2026-0001',
  clientId: 'c1',
  type: 'Dépannage électrique',
  title: 'Disjoncteur qui saute',
  status: 'rdv',
  appointment: null,
  log: [],
  reminders: [],
  createdAt: 0,
  updatedAt: 0,
  ...over,
})

describe('texte et téléphones', () => {
  it('retire accents et majuscules', () => {
    expect(normalize('  Éloïse  LEFÈVRE ')).toBe('eloise lefevre')
  })
  it('ramène les numéros au format national', () => {
    expect(phoneDigits('+33 6 12 34 56 78')).toBe('0612345678')
    expect(phoneDigits('0033612345678')).toBe('0612345678')
    expect(formatPhone('0612345678')).toBe('06 12 34 56 78')
    expect(phoneForLink('06.12.34.56.78')).toBe('+33612345678')
  })
  it('affiche Prénom NOM', () => {
    expect(fullName({ firstName: 'Jean', lastName: 'Muller' })).toBe('Jean MULLER')
    expect(fullName({ company: 'SCI Les Lilas' })).toBe('SCI Les Lilas')
  })
})

describe('références', () => {
  it("numérote à la suite dans l'année", () => {
    const now = new Date('2026-11-20T10:00:00').getTime()
    expect(nextRef([], now)).toBe('2026-0001')
    expect(nextRef(['2026-0001', '2026-0009', '2025-0040'], now)).toBe('2026-0010')
  })
})

describe('doublons', () => {
  const clients = [client(), client({ id: 'c2', firstName: 'Karim', lastName: 'Benali', phones: [{ label: 'Mobile', number: '0781224590' }] })]
  it('repère le même téléphone, même écrit autrement', () => {
    const hits = findDuplicates({ firstName: 'X', lastName: 'Y', phones: [{ label: 'Mobile', number: '+33 7 81 22 45 90' }] }, clients)
    expect(hits.map((h) => [h.client.id, h.reason])).toEqual([['c2', 'phone']])
  })
  it('repère le même nom sans tenir compte des accents', () => {
    const hits = findDuplicates({ firstName: 'martine', lastName: 'LEFEVRE', phones: [] }, clients)
    expect(hits.map((h) => h.client.id)).toEqual(['c1'])
  })
  it('ignore le client en cours de modification', () => {
    expect(findDuplicates({ firstName: 'Martine', lastName: 'Lefèvre', phones: [] }, clients, 'c1')).toEqual([])
  })
})

describe('recherche', () => {
  const clients = [
    client(),
    client({ id: 'c2', firstName: 'Karim', lastName: 'Benali', phones: [{ label: 'Mobile', number: '07 81 22 45 90' }], address: { label: '4 place de la Mairie 88190 Golbey', city: 'Golbey' } }),
    client({ id: 'c3', firstName: 'Jean-Paul', lastName: 'Muller', phones: [{ label: 'Fixe', number: '03 29 11 22 33' }], address: { label: 'Thaon', city: 'Thaon-les-Vosges' }, notes: 'Chaudière gaz' }),
  ]
  const interventions = [intervention(), intervention({ id: 'i2', ref: '2026-0142', clientId: 'c3', title: 'Lave-linge ne vidange plus', type: "Réparation d'appareil" })]
  const search = createSearchIndex(clients, interventions)

  it('trouve par nom sans accent', () => {
    expect(search('lefevre').clients[0].id).toBe('c1')
  })
  it('tolère une faute de frappe', () => {
    expect(search('benalli').clients[0].id).toBe('c2')
  })
  it('trouve par numéro partiel', () => {
    expect(search('45 90').clients.map((c) => c.id)).toEqual(['c2'])
    expect(search('0781').clients.map((c) => c.id)).toEqual(['c2'])
  })
  it('trouve par ville', () => {
    expect(search('golbey').clients[0].id).toBe('c2')
  })
  it('trouve une intervention par sa référence', () => {
    expect(search('2026-0142').interventions.map((i) => i.id)).toEqual(['i2'])
    expect(search('0142').interventions.map((i) => i.id)).toContain('i2')
  })
  it('trouve une intervention par son intitulé', () => {
    expect(search('lave linge').interventions[0].id).toBe('i2')
  })
  it('renvoie vide pour une recherche vide', () => {
    expect(search('  ')).toEqual({ clients: [], interventions: [] })
  })
})

describe('liens et SMS', () => {
  it("préfère l'adresse du chantier", () => {
    const c = client()
    expect(interventionAddress(intervention(), c)?.label).toBe(c.address.label)
    expect(interventionAddress(intervention({ siteAddress: { label: 'Chantier' } }), c)?.label).toBe('Chantier')
  })
  it('prépare le SMS de confirmation', () => {
    const start = new Date('2026-11-24T14:00:00').getTime()
    const msg = confirmationMessage(intervention({ appointment: { start, durationMin: 60 } }), client(), { ...defaultSettings(), signature: 'Nicolas' })
    expect(msg).toBe('Bonjour Martine Lefèvre, je vous confirme notre rendez-vous le mardi 24 novembre à 14 h 00 (12 rue des Lilas 88000 Épinal). Nicolas')
    expect(smsHref('06 12 34 56 78', 'a b')).toBe('sms:+33612345678?&body=a%20b')
  })
})

describe('export Excel', () => {
  it('échappe les points-virgules et guillemets', () => {
    expect(toCsv(['a', 'b'], [['x;y', 'il dit "oui"']])).toBe('﻿a;b\r\n"x;y";"il dit ""oui"""')
  })
  it('exporte les clients', () => {
    const csv = clientsCsv([client()])
    expect(csv.split('\r\n')[1].startsWith('Lefèvre;Martine;;06 12 34 56 78')).toBe(true)
  })
})

describe('écran Aujourd’hui', () => {
  const now = new Date('2026-11-20T10:00:00').getTime()
  const statuses = defaultSettings().statuses
  it('classe RDV, rappels en retard et chantiers en cours', () => {
    const list = [
      intervention({ id: 'a', appointment: { start: atHour(now, 14), durationMin: 60 } }),
      intervention({ id: 'b', appointment: { start: atHour(addDays(now, 2), 9), durationMin: 60 } }),
      intervention({ id: 'c', status: 'devis', reminders: [{ id: 'r1', at: atHour(addDays(now, -1), 9), reason: 'Relancer', done: false }] }),
      intervention({ id: 'd', status: 'paye', appointment: { start: atHour(now, 16), durationMin: 60 } }),
      intervention({ id: 'e', status: 'en-cours', reminders: [{ id: 'r2', at: atHour(addDays(now, 3), 9), reason: 'Plus tard', done: false }] }),
    ]
    const v = computeToday(list, [client()], statuses, now)
    expect(v.appointmentsToday.map((i) => i.id)).toEqual(['a'])
    expect(v.upcoming.map((i) => i.id)).toEqual(['b'])
    expect(v.reminders.map((r) => [r.reminder.id, r.overdue])).toEqual([['r1', true]])
    expect(v.open.map((i) => i.id).sort()).toEqual(['b', 'c', 'e'])
  })
})

describe('événements Google Agenda', () => {
  const settings = defaultSettings()
  it('construit le RDV avec adresse, téléphone et lien', () => {
    const start = new Date('2026-11-24T14:00:00').getTime()
    const ev = buildAppointmentEvent(intervention({ appointment: { start, durationMin: 90 } }), client(), settings, 'https://app.example/')
    expect(ev.summary).toBe('Dépannage électrique – Martine LEFÈVRE')
    expect(ev.location).toBe('12 rue des Lilas 88000 Épinal')
    expect(ev.description).toContain('Mobile : 06 12 34 56 78')
    expect(ev.description).toContain('https://app.example/#/interventions/i1')
    expect(new Date(ev.end.dateTime).getTime() - new Date(ev.start.dateTime).getTime()).toBe(90 * 60_000)
    expect(ev.reminders.overrides[0].minutes).toBe(60)
  })
  it('construit le rappel', () => {
    const ev = buildReminderEvent({ id: 'r', at: Date.UTC(2026, 10, 25, 8), reason: 'Relancer le devis', done: false }, intervention(), client(), 'https://app.example/')
    expect(ev.summary).toBe('Rappel : Relancer le devis – Martine LEFÈVRE')
    expect(ev.reminders.overrides[0].minutes).toBe(0)
  })
})

describe('adresses', () => {
  it('lit la réponse de la Base Adresse Nationale', () => {
    const res = parseAddressFeatures({
      features: [
        { properties: { label: '8 Boulevard du Port 80000 Amiens', name: '8 Boulevard du Port', postcode: '80000', city: 'Amiens' }, geometry: { coordinates: [2.29, 49.89] } },
        { properties: {} },
      ],
    })
    expect(res).toEqual([{ label: '8 Boulevard du Port 80000 Amiens', street: '8 Boulevard du Port', postcode: '80000', city: 'Amiens', lat: 49.89, lng: 2.29 }])
  })
})

describe('réglages', () => {
  it('complète des réglages partiels', () => {
    const s = withDefaults({ signature: 'N.' })
    expect(s.signature).toBe('N.')
    expect(s.statuses.length).toBeGreaterThan(5)
    expect(s.types).toContain('Dépannage électrique')
  })
})
