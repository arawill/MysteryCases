import { describe, expect, it } from 'vitest'
import { getDailyDateKey } from '../daily/date'
import { millisecondsUntilNextLocalDay, subscribeToDailyDateRollover, type DailyRolloverEnvironment } from '../daily/rollover'

function fakeEnvironment(initial: Date) {
  let now = initial
  let visible = true
  let nextTimerId = 0
  const timers = new Map<number, { callback: () => void; delay: number }>()
  const windowListeners = new Set<() => void>()
  const documentListeners = new Set<() => void>()
  const environment: DailyRolloverEnvironment = {
    now: () => now,
    setTimer: (callback, delay) => { const id = ++nextTimerId; timers.set(id, { callback, delay }); return id },
    clearTimer: handle => { timers.delete(handle as number) },
    addWindowListener: (_type, listener) => { windowListeners.add(listener) },
    removeWindowListener: (_type, listener) => { windowListeners.delete(listener) },
    addDocumentListener: (_type, listener) => { documentListeners.add(listener) },
    removeDocumentListener: (_type, listener) => { documentListeners.delete(listener) },
    isDocumentVisible: () => visible,
  }
  return {
    environment,
    timers,
    windowListeners,
    documentListeners,
    setNow: (value: Date) => { now = value },
    setVisible: (value: boolean) => { visible = value },
    focus: () => { for (const listener of [...windowListeners]) listener() },
    visibilityChange: () => { for (const listener of [...documentListeners]) listener() },
    runTimer: () => { const entry = [...timers.entries()][0]; if (!entry) throw new Error('No scheduled timer.'); timers.delete(entry[0]); entry[1].callback() },
  }
}

describe('Daily midnight rollover', () => {
  it('schedules the next local midnight and reschedules after it fires', () => {
    const clock = fakeEnvironment(new Date(2026, 8, 30, 23, 59, 30, 0))
    const changes: string[] = []
    const cleanup = subscribeToDailyDateRollover(date => changes.push(getDailyDateKey(date)), clock.environment)
    expect([...clock.timers.values()][0]?.delay).toBe(30_000)
    clock.setNow(new Date(2026, 9, 1, 0, 0, 0, 0))
    clock.runTimer()
    expect(changes).toEqual(['2026-10-01'])
    expect([...clock.timers.values()][0]?.delay).toBe(86_400_000)
    cleanup()
  })

  it('detects a suspended app crossing midnight on focus or visible resume only once', () => {
    const clock = fakeEnvironment(new Date(2026, 11, 31, 20, 0))
    const changes: string[] = []
    const cleanup = subscribeToDailyDateRollover(date => changes.push(getDailyDateKey(date)), clock.environment)
    clock.setNow(new Date(2027, 0, 1, 8, 0))
    clock.focus()
    clock.visibilityChange()
    expect(changes).toEqual(['2027-01-01'])
    expect(clock.timers.size).toBe(1)
    cleanup()
  })

  it('ignores hidden visibility events and removes listeners and timers on cleanup', () => {
    const clock = fakeEnvironment(new Date(2024, 1, 29, 23, 0))
    const changes: string[] = []
    const cleanup = subscribeToDailyDateRollover(date => changes.push(getDailyDateKey(date)), clock.environment)
    clock.setNow(new Date(2024, 2, 1, 8, 0))
    clock.setVisible(false)
    clock.visibilityChange()
    expect(changes).toEqual([])
    cleanup()
    expect(clock.timers.size).toBe(0)
    expect(clock.windowListeners.size).toBe(0)
    expect(clock.documentListeners.size).toBe(0)
  })

  it('calculates local calendar boundaries without assuming every day has 24 hours', () => {
    const before = new Date(2026, 2, 29, 0, 30)
    expect(millisecondsUntilNextLocalDay(before)).toBe(new Date(2026, 2, 30, 0, 0).getTime() - before.getTime())
  })
})
