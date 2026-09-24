import { getDailyDateKey } from './date'

export interface DailyRolloverEnvironment {
  now(): Date
  setTimer(callback: () => void, delay: number): unknown
  clearTimer(handle: unknown): void
  addWindowListener(type: 'focus', listener: () => void): void
  removeWindowListener(type: 'focus', listener: () => void): void
  addDocumentListener(type: 'visibilitychange', listener: () => void): void
  removeDocumentListener(type: 'visibilitychange', listener: () => void): void
  isDocumentVisible(): boolean
}

const browserEnvironment = (): DailyRolloverEnvironment => ({
  now: () => new Date(),
  setTimer: (callback, delay) => window.setTimeout(callback, delay),
  clearTimer: handle => window.clearTimeout(handle as number),
  addWindowListener: (type, listener) => window.addEventListener(type, listener),
  removeWindowListener: (type, listener) => window.removeEventListener(type, listener),
  addDocumentListener: (type, listener) => document.addEventListener(type, listener),
  removeDocumentListener: (type, listener) => document.removeEventListener(type, listener),
  isDocumentVisible: () => document.visibilityState !== 'hidden',
})

export function millisecondsUntilNextLocalDay(now: Date): number {
  const next = new Date(now.getTime())
  next.setHours(24, 0, 0, 0)
  return Math.max(1, next.getTime() - now.getTime())
}

export function subscribeToDailyDateRollover(
  onDateChanged: (date: Date) => void,
  environment: DailyRolloverEnvironment = browserEnvironment(),
): () => void {
  let active = true
  let observedKey = getDailyDateKey(environment.now())
  let timer: unknown

  const schedule = () => {
    if (!active) return
    if (timer !== undefined) environment.clearTimer(timer)
    const now = environment.now()
    timer = environment.setTimer(onTimer, millisecondsUntilNextLocalDay(now))
  }
  const check = () => {
    if (!active) return
    const now = environment.now()
    const nextKey = getDailyDateKey(now)
    if (nextKey !== observedKey) {
      observedKey = nextKey
      onDateChanged(now)
    }
    schedule()
  }
  const onTimer = () => {
    timer = undefined
    check()
  }
  const onVisibilityChange = () => {
    if (environment.isDocumentVisible()) check()
  }

  environment.addWindowListener('focus', check)
  environment.addDocumentListener('visibilitychange', onVisibilityChange)
  schedule()

  return () => {
    active = false
    if (timer !== undefined) environment.clearTimer(timer)
    environment.removeWindowListener('focus', check)
    environment.removeDocumentListener('visibilitychange', onVisibilityChange)
  }
}
