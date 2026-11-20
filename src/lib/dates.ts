const dayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const fullFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export const formatDay = (ms: number) => dayFmt.format(ms)
export const formatShortDay = (ms: number) => shortDayFmt.format(ms)
export const formatTime = (ms: number) => timeFmt.format(ms).replace(':', ' h ')
export const formatDateTime = (ms: number) => fullFmt.format(ms)

export function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function endOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

export function addDays(ms: number, days: number): number {
  const d = new Date(ms)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b)
}

/** « aujourd'hui », « demain », « hier » ou la date courte. */
export function relativeDay(ms: number, now = Date.now()): string {
  const diff = Math.round((startOfDay(ms) - startOfDay(now)) / 86_400_000)
  if (diff === 0) return "aujourd'hui"
  if (diff === 1) return 'demain'
  if (diff === -1) return 'hier'
  return formatShortDay(ms)
}

/** Valeur pour <input type="datetime-local"> (heure locale). */
export function toLocalInput(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInput(v: string): number | null {
  if (!v) return null
  const ms = new Date(v).getTime()
  return Number.isNaN(ms) ? null : ms
}

/** Prochaine heure ronde à partir de maintenant, à `hour` h si précisé. */
export function atHour(dayMs: number, hour: number, minute = 0): number {
  const d = new Date(dayMs)
  d.setHours(hour, minute, 0, 0)
  return d.getTime()
}

export function durationLabel(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}
