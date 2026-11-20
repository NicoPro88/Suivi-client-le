import { useEffect, useRef, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate, useSearchParams } from 'react-router'
import { APP_NAME, DEMO_MODE } from '../config'
import { useStore } from '../data/store'
import { Icon, type IconName } from './Icon'
import appIcon from '../assets/icon.svg'

const nav: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: "Aujourd'hui", icon: 'home' },
  { to: '/clients', label: 'Clients', icon: 'users' },
  { to: '/interventions', label: 'Suivi', icon: 'wrench' },
  { to: '/reglages', label: 'Réglages', icon: 'settings' },
]

function SearchBox() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const onClients = location.pathname === '/clients'
  const q = onClients ? (params.get('q') ?? '') : ''
  const ref = useRef<HTMLInputElement>(null)

  // Raccourci clavier sur PC : « / » place le curseur dans la recherche.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="relative flex-1">
      <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-slate-400" />
      <input
        ref={ref}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        value={q}
        placeholder="Nom, téléphone, ville, réf…"
        aria-label="Rechercher un client"
        onChange={(e) => {
          const v = e.target.value
          navigate(v ? `/clients?q=${encodeURIComponent(v)}` : '/clients', { replace: onClients })
        }}
        className="h-11 w-full rounded-xl border-0 bg-slate-100 pr-3 pl-10 text-slate-900 placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
      />
    </div>
  )
}

function Banners() {
  const { online, pendingSync, syncing, syncAll, data } = useStore()
  return (
    <>
      {!online && (
        <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 text-sm text-white">
          <Icon name="wifiOff" className="size-4 shrink-0" />
          Hors ligne : tu peux continuer, tout sera envoyé au retour du réseau.
        </div>
      )}
      {online && pendingSync > 0 && data.settings.calendarEnabled && (
        <div className="flex items-center gap-2 bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <Icon name="calendar" className="size-4 shrink-0" />
          <span className="flex-1">{pendingSync} intervention(s) à envoyer vers Google Agenda.</span>
          <button type="button" disabled={syncing} onClick={() => void syncAll()} className="rounded-lg bg-amber-900 px-3 py-1 font-semibold text-white disabled:opacity-60">
            {syncing ? 'En cours…' : 'Synchroniser'}
          </button>
        </div>
      )}
      {DEMO_MODE && (
        <div className="bg-brand-50 px-4 py-1.5 text-center text-xs font-medium text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
          Mode démo : clients fictifs, données gardées sur cet appareil, agenda simulé.
        </div>
      )}
    </>
  )
}

function Toasts() {
  const { toasts, dismissToast } = useStore()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismissToast(t.id)}
          className={`pointer-events-auto max-w-md rounded-xl px-4 py-3 text-left text-sm font-medium shadow-lg ${
            t.kind === 'error' ? 'bg-red-700 text-white' : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
          }`}
        >
          {t.text}
        </button>
      ))}
    </div>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()
  useEffect(() => {
    // Chrome récent renvoie une promesse depuis scrollTo : on ne la renvoie pas à React.
    window.scrollTo(0, 0)
  }, [location.pathname])
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
          <NavLink to="/" className="flex shrink-0 items-center gap-2" aria-label={APP_NAME}>
            <img src={appIcon} alt="" className="size-9 rounded-lg" />
            <span className="hidden text-lg font-extrabold tracking-tight sm:inline">{APP_NAME}</span>
          </NavLink>
          <SearchBox />
          <NavLink to="/clients/nouveau" className="hidden h-11 shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-4 font-semibold text-white hover:bg-brand-700 md:inline-flex">
            <Icon name="plus" /> Client
          </NavLink>
        </div>
        <nav className="mx-auto hidden max-w-3xl gap-1 px-4 pb-2 md:flex">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`
              }
            >
              <Icon name={n.icon} className="size-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <Banners />
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 md:pb-12">{children}</main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-1.5 pb-1">
          {nav.slice(0, 2).map((n) => (
            <NavItem key={n.to} {...n} />
          ))}
          <NavLink to="/clients/nouveau" className="-mt-5 flex flex-col items-center gap-0.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300" aria-label="Nouveau client">
            <span className="grid size-13 place-items-center rounded-full bg-brand-600 text-white shadow-lg ring-4 ring-white dark:ring-slate-950">
              <Icon name="plus" className="size-7" />
            </span>
            Client
          </NavLink>
          {nav.slice(2).map((n) => (
            <NavItem key={n.to} {...n} />
          ))}
        </div>
      </nav>
      <Toasts />
    </div>
  )
}

function NavItem({ to, label, icon }: { to: string; label: string; icon: IconName }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-semibold ${isActive ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'}`
      }
    >
      <Icon name={icon} className="size-6" />
      {label}
    </NavLink>
  )
}
