import type { Status } from '../lib/types'

// Classes écrites en entier pour que Tailwind les garde.
const colors: Record<string, string> = {
  slate: 'bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-600',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-800',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-800',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:ring-cyan-800',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-800',
  green: 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-950 dark:text-green-300 dark:ring-green-800',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:ring-teal-800',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800',
  gray: 'bg-gray-100 text-gray-500 ring-gray-200 line-through dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-700',
  red: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-800',
  pink: 'bg-pink-50 text-pink-700 ring-pink-200 dark:bg-pink-950 dark:text-pink-300 dark:ring-pink-800',
}

export const STATUS_COLORS = Object.keys(colors)

export function StatusBadge({ status, fallback }: { status?: Status; fallback?: string }) {
  const cls = colors[status?.color ?? 'slate'] ?? colors.slate
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ${cls}`}>
      {status?.label ?? fallback ?? '—'}
    </span>
  )
}
