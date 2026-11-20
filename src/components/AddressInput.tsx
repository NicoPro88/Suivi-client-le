import { useEffect, useRef, useState } from 'react'
import { searchAddress } from '../lib/address'
import type { Address } from '../lib/types'
import { Icon } from './Icon'
import { Input } from './ui'

/** Champ adresse avec suggestions de la Base Adresse Nationale. Saisie libre possible. */
export function AddressInput({ value, onChange, placeholder }: { value: Address; onChange: (a: Address) => void; placeholder?: string }) {
  const [text, setText] = useState(value.label)
  const [suggestions, setSuggestions] = useState<Address[]>([])
  const [open, setOpen] = useState(false)
  const typed = useRef(false)

  useEffect(() => {
    setText(value.label)
  }, [value.label])

  useEffect(() => {
    if (!typed.current) return
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      const res = await searchAddress(text, ctrl.signal)
      setSuggestions(res)
      setOpen(res.length > 0)
    }, 250)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [text])

  const verified = value.lat != null && value.label === text

  return (
    <div className="relative">
      <Input
        value={text}
        placeholder={placeholder ?? 'N°, rue, code postal, ville'}
        autoComplete="off"
        onChange={(e) => {
          typed.current = true
          setText(e.target.value)
          onChange({ label: e.target.value })
        }}
        onFocus={() => suggestions.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={verified ? 'pr-10' : ''}
      />
      {verified && <Icon name="check" className="absolute top-1/2 right-3 size-5 -translate-y-1/2 text-green-600" />}
      {open && (
        <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          {suggestions.map((s) => (
            <li key={s.label}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3.5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  typed.current = false
                  setText(s.label)
                  onChange(s)
                  setOpen(false)
                }}
              >
                <Icon name="pin" className="size-4 shrink-0 text-slate-400" />
                <span>{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
