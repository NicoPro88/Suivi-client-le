import { useState } from 'react'
import { APP_NAME } from '../config'
import { Button } from '../components/ui'
import logo from '../assets/logo.png'

export function LoginPage({ onLogin }: { onLogin: () => Promise<void> }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-sm text-center">
        <img src={logo} alt="Optic Macadré" className="mx-auto w-64 max-w-full dark:invert" />
        <h1 className="mt-8 text-3xl font-extrabold tracking-tight">{APP_NAME}</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">Tes clients, tes RDV et le suivi de tes chantiers.</p>
        <Button
          variant="primary"
          size="lg"
          className="mt-8 w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setError('')
            try {
              await onLogin()
            } catch (e) {
              setError((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Connexion…' : 'Se connecter avec Google'}
        </Button>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  )
}
