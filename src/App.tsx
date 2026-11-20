import { useEffect, useMemo, useState } from 'react'
import { HashRouter, MemoryRouter, Route, Routes } from 'react-router'
import { DEMO_MODE } from './config'
import type { Backend } from './data/backend'
import { localBackend } from './data/localBackend'
import { StoreProvider, type UserInfo } from './data/store'
import { Layout } from './components/Layout'
import { ClientFormPage } from './pages/ClientFormPage'
import { ClientPage } from './pages/ClientPage'
import { ClientsPage } from './pages/ClientsPage'
import { InterventionFormPage } from './pages/InterventionFormPage'
import { InterventionPage } from './pages/InterventionPage'
import { InterventionsPage } from './pages/InterventionsPage'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'
import { TodayPage } from './pages/TodayPage'
import appIcon from './assets/icon.svg'

function AppRoutes({ onLogout }: { onLogout?: () => void }) {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/nouveau" element={<ClientFormPage />} />
        <Route path="/clients/:id" element={<ClientPage />} />
        <Route path="/clients/:id/modifier" element={<ClientFormPage />} />
        <Route path="/interventions" element={<InterventionsPage />} />
        <Route path="/interventions/nouvelle" element={<InterventionFormPage />} />
        <Route path="/interventions/:id" element={<InterventionPage />} />
        <Route path="/interventions/:id/modifier" element={<InterventionFormPage />} />
        <Route path="/reglages" element={<SettingsPage onLogout={onLogout} />} />
        <Route path="*" element={<TodayPage />} />
      </Routes>
    </Layout>
  )
}

function DemoApp() {
  const backend = useMemo(() => localBackend(), [])
  const user: UserInfo = { name: 'Démo', email: '' }
  return (
    <StoreProvider backend={backend} user={user}>
      <AppRoutes />
    </StoreProvider>
  )
}

function FirebaseApp() {
  const [state, setState] = useState<{
    loading: boolean
    user: UserInfo | null
    backend: Backend | null
    login?: () => Promise<void>
    logout?: () => void
  }>({ loading: true, user: null, backend: null })

  useEffect(() => {
    let unsub = () => {}
    let cancelled = false
    ;(async () => {
      // Firebase n'est chargé que si l'appli est configurée (le mode démo s'en passe).
      const fb = await import('./lib/firebase')
      const { firestoreBackend } = await import('./data/firestoreBackend')
      if (cancelled) return
      unsub = fb.watchUser((u) => {
        if (!u) {
          setState({ loading: false, user: null, backend: null, login: fb.signInWithGoogle })
          return
        }
        const backend = firestoreBackend(fb.firebase().db, u.uid, (e) => console.error('Écriture refusée', e))
        setState({
          loading: false,
          user: { name: u.displayName ?? '', email: u.email ?? '', photo: u.photoURL },
          backend,
          logout: () => void fb.logout(),
        })
      })
    })()
    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  if (state.loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <img src={appIcon} alt="" className="size-16 animate-pulse rounded-2xl" />
      </div>
    )
  }
  if (!state.user || !state.backend) return <LoginPage onLogin={state.login!} />
  return (
    <StoreProvider key={state.user.email} backend={state.backend} user={state.user}>
      <AppRoutes onLogout={state.logout} />
    </StoreProvider>
  )
}

// La démo autonome (build "demo") tourne dans une page hôte : elle garde sa navigation en mémoire.
const Router = import.meta.env.MODE === 'demo' ? MemoryRouter : HashRouter

export default function App() {
  return <Router>{DEMO_MODE ? <DemoApp /> : <FirebaseApp />}</Router>
}
