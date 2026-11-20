import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'
import { Icon, type IconName } from './Icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm',
  secondary:
    'bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:hover:bg-slate-700',
  ghost: 'text-slate-700 hover:bg-slate-100 active:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800',
  danger: 'bg-white text-red-700 ring-1 ring-red-300 hover:bg-red-50 dark:bg-slate-900 dark:text-red-400 dark:ring-red-800 dark:hover:bg-red-950',
}

export function buttonClass(variant: Variant = 'secondary', size: 'md' | 'lg' | 'sm' = 'md', extra = '') {
  const sizes = { sm: 'h-9 px-3 text-sm gap-1.5', md: 'h-11 px-4 text-[15px] gap-2', lg: 'h-13 px-5 text-base gap-2' }
  return `inline-flex items-center justify-center rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none select-none ${sizes[size]} ${variants[variant]} ${extra}`
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; icon?: IconName }) {
  return (
    <button type="button" className={buttonClass(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} className={size === 'sm' ? 'size-4' : 'size-5'} />}
      {children}
    </button>
  )
}

export function LinkButton({
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  children,
  ...rest
}: LinkProps & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; icon?: IconName }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} className={size === 'sm' ? 'size-4' : 'size-5'} />}
      {children}
    </Link>
  )
}

/** Gros bouton d'action rapide (Appeler, SMS, Itinéraire…). */
export function ActionTile({ href, icon, label, external = false }: { href: string; icon: IconName; label: string; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl bg-white px-2 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 active:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700"
    >
      <span className="grid size-9 place-items-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
        <Icon name={icon} className="size-5" />
      </span>
      <span className="truncate">{label}</span>
    </a>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 ${className}`}>{children}</div>
  )
}

export function Section({ title, count, action, children }: { title: string; count?: number; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          {title}
          {count != null && <span className="ml-1.5 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">{count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  )
}

const inputBase =
  'w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${inputBase} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} pr-8 ${props.className ?? ''}`} />
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
        active
          ? 'bg-brand-600 text-white'
          : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

export function EmptyState({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 px-6 py-8 text-center dark:border-slate-800">
      <Icon name={icon} className="size-8 text-slate-400" />
      <p className="font-semibold text-slate-700 dark:text-slate-300">{title}</p>
      {children && <div className="text-sm text-slate-500 dark:text-slate-400">{children}</div>}
    </div>
  )
}

export function PageTitle({ title, subtitle, back, actions }: { title: string; subtitle?: ReactNode; back?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start gap-2 pt-4">
      {back && (
        <Link to={back} className="-ml-2 grid size-10 shrink-0 place-items-center rounded-full text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Retour">
          <Icon name="back" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl leading-tight font-bold break-words">{title}</h1>
        {subtitle && <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 gap-1">{actions}</div>}
    </div>
  )
}
