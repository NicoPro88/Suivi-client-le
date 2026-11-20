import { useEffect, useState } from 'react'
import { APP_NAME, DEMO_MODE } from '../config'
import { useStore } from '../data/store'
import { resetDemo } from '../data/localBackend'
import { calendar } from '../lib/calendar'
import { clientsCsv, download, interventionsCsv } from '../lib/csv'
import { DURATION_OPTIONS } from '../lib/defaults'
import { uid } from '../lib/text'
import type { Settings, Status } from '../lib/types'
import { Icon } from '../components/Icon'
import { STATUS_COLORS, StatusBadge } from '../components/StatusBadge'
import { Button, Card, Field, Input, PageTitle, Section, Select, Textarea } from '../components/ui'

interface InstallPrompt extends Event {
  prompt(): Promise<void>
}

function useInstallPrompt() {
  const [evt, setEvt] = useState<InstallPrompt | null>(null)
  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault()
      setEvt(e as InstallPrompt)
    }
    window.addEventListener('beforeinstallprompt', on)
    return () => window.removeEventListener('beforeinstallprompt', on)
  }, [])
  return evt
}

function ListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('')
  return (
    <div className="space-y-2">
      {items.map((t, idx) => (
        <div key={idx} className="flex gap-2">
          <Input value={t} onChange={(e) => onChange(items.map((x, i) => (i === idx ? e.target.value : x)))} />
          <button type="button" onClick={() => onChange(items.filter((_, i) => i !== idx))} className="grid size-11 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Retirer">
            <Icon name="x" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} />
        <Button
          icon="plus"
          onClick={() => {
            if (!draft.trim()) return
            onChange([...items, draft.trim()])
            setDraft('')
          }}
        >
          Ajouter
        </Button>
      </div>
    </div>
  )
}

function StatusEditor({ statuses, used, onChange }: { statuses: Status[]; used: Set<string>; onChange: (s: Status[]) => void }) {
  const set = (idx: number, patch: Partial<Status>) => onChange(statuses.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir
    if (j < 0 || j >= statuses.length) return
    const next = [...statuses]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    onChange(next)
  }
  return (
    <div className="space-y-3">
      {statuses.map((s, idx) => (
        <div key={s.id} className="rounded-xl p-3 ring-1 ring-slate-200 dark:ring-slate-700">
          <div className="flex items-center gap-2">
            <Input value={s.label} onChange={(e) => set(idx, { label: e.target.value })} />
            <div className="flex shrink-0">
              <button type="button" onClick={() => move(idx, -1)} className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Monter">
                ↑
              </button>
              <button type="button" onClick={() => move(idx, 1)} className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Descendre">
                ↓
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <StatusBadge status={s} />
            <select value={s.color} onChange={(e) => set(idx, { color: e.target.value })} className="rounded-lg bg-transparent py-1 ring-1 ring-slate-300 dark:ring-slate-700" aria-label="Couleur">
              {STATUS_COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={s.open} onChange={(e) => set(idx, { open: e.target.checked })} className="size-4 accent-brand-600" />
              Chantier en cours
            </label>
            {!used.has(s.id) && s.id !== 'annule' && (
              <button type="button" onClick={() => onChange(statuses.filter((_, i) => i !== idx))} className="ml-auto text-red-700 dark:text-red-400">
                Supprimer
              </button>
            )}
          </div>
        </div>
      ))}
      <Button icon="plus" onClick={() => onChange([...statuses, { id: `s-${uid().slice(0, 8)}`, label: 'Nouveau statut', color: 'pink', open: true }])}>
        Ajouter un statut
      </Button>
    </div>
  )
}

export function SettingsPage({ onLogout }: { onLogout?: () => void }) {
  const store = useStore()
  const { data } = store
  const [draft, setDraft] = useState<Settings>(data.settings)
  const [busy, setBusy] = useState(false)
  const install = useInstallPrompt()
  useEffect(() => {
    setDraft(data.settings)
  }, [data.settings])
  const dirty = JSON.stringify(draft) !== JSON.stringify(data.settings)
  const used = new Set(data.interventions.map((i) => i.status))

  const save = () => {
    store.saveSettings({ ...draft, types: draft.types.map((t) => t.trim()).filter(Boolean), statuses: draft.statuses.map((s) => ({ ...s, label: s.label.trim() || 'Sans nom' })) })
    store.notify('Réglages enregistrés.')
  }

  return (
    <div>
      <PageTitle title="Réglages" />

      <Section title="Google Agenda">
        <Card className="space-y-3">
          {!calendar.available ? (
            <p className="text-sm text-slate-600">Google Agenda n'est pas encore configuré (voir le guide de mise en place).</p>
          ) : data.settings.calendarEnabled ? (
            <>
              <p className="flex items-center gap-2 font-semibold text-green-700 dark:text-green-400">
                <Icon name="check" /> Connecté à l'agenda « {APP_NAME} – Interventions »
              </p>
              <Field label="Notification avant un RDV">
                <Select value={draft.reminderMinutesBefore} onChange={(e) => setDraft({ ...draft, reminderMinutesBefore: Number(e.target.value) })}>
                  {[15, 30, 60, 120, 1440].map((m) => (
                    <option key={m} value={m}>
                      {m === 1440 ? 'La veille (24 h avant)' : m >= 60 ? `${m / 60} h avant` : `${m} min avant`}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button icon="refresh" disabled={store.syncing} onClick={() => void store.syncAll()}>
                  {store.pendingSync ? `Synchroniser (${store.pendingSync})` : 'Tout est synchronisé'}
                </Button>
                <Button variant="ghost" onClick={() => store.disconnectCalendar()}>
                  Déconnecter
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                L'appli crée un agenda « {APP_NAME} – Interventions » dans ton compte Google. Elle n'a accès qu'à cet agenda-là, pas au reste.
              </p>
              <Button
                variant="primary"
                icon="calendar"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    await store.connectCalendar()
                  } catch (e) {
                    store.notify(`Connexion impossible : ${(e as Error).message}`, 'error')
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                {busy ? 'Connexion…' : 'Connecter Google Agenda'}
              </Button>
            </>
          )}
        </Card>
      </Section>

      <Section title="Rendez-vous et SMS">
        <Card className="space-y-4">
          <Field label="Durée par défaut d'un RDV">
            <Select value={draft.defaultDurationMin} onChange={(e) => setDraft({ ...draft, defaultDurationMin: Number(e.target.value) })}>
              {DURATION_OPTIONS.map((d) => (
                <option key={d.minutes} value={d.minutes}>
                  {d.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="SMS de confirmation" hint="Mots remplacés : {prenom} {nom} {date} {heure} {adresse} {type} {signature}">
            <Textarea value={draft.smsTemplate} onChange={(e) => setDraft({ ...draft, smsTemplate: e.target.value })} rows={4} />
          </Field>
          <Field label="Signature">
            <Input value={draft.signature} onChange={(e) => setDraft({ ...draft, signature: e.target.value })} placeholder="Ex. : Nicolas, électricien – 06 …" />
          </Field>
        </Card>
      </Section>

      <Section title="Types d'intervention">
        <Card>
          <ListEditor items={draft.types} onChange={(types) => setDraft({ ...draft, types })} placeholder="Nouveau type" />
        </Card>
      </Section>

      <Section title="Statuts">
        <Card>
          <StatusEditor statuses={draft.statuses} used={used} onChange={(statuses) => setDraft({ ...draft, statuses })} />
        </Card>
      </Section>

      {dirty && (
        <div className="sticky bottom-24 z-30 mt-4 md:bottom-4">
          <Button variant="primary" size="lg" icon="check" className="w-full shadow-lg" onClick={save}>
            Enregistrer les réglages
          </Button>
        </div>
      )}

      <Section title="Export">
        <Card className="flex flex-col gap-2 sm:flex-row">
          <Button icon="download" className="flex-1" onClick={() => download(`clients-${new Date().toISOString().slice(0, 10)}.csv`, clientsCsv(data.clients))}>
            Clients (Excel)
          </Button>
          <Button icon="download" className="flex-1" onClick={() => download(`interventions-${new Date().toISOString().slice(0, 10)}.csv`, interventionsCsv(data))}>
            Interventions (Excel)
          </Button>
        </Card>
      </Section>

      <Section title="Application">
        <Card className="space-y-3 text-sm">
          {install ? (
            <Button variant="primary" icon="download" onClick={() => void install.prompt()}>
              Installer {APP_NAME} sur cet appareil
            </Button>
          ) : (
            <p className="text-slate-600 dark:text-slate-300">
              Pour l'installer : dans Chrome, menu ⋮ puis « Ajouter à l'écran d'accueil » (téléphone) ou l'icône d'installation dans la barre d'adresse (PC).
            </p>
          )}
          <p className="text-slate-500">Données hébergées chez Google (Firebase), en Europe. Seul ton compte y a accès.</p>
          {DEMO_MODE ? (
            <Button
              variant="danger"
              onClick={() => {
                if (!window.confirm('Remettre les données de démo à zéro ?')) return
                resetDemo()
                window.location.reload()
              }}
            >
              Réinitialiser la démo
            </Button>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-slate-600 dark:text-slate-300">{store.user.email}</span>
              <Button variant="ghost" icon="logout" onClick={onLogout}>
                Se déconnecter
              </Button>
            </div>
          )}
        </Card>
      </Section>
    </div>
  )
}
