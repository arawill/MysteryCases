import { describe, expect, it } from 'vitest'
import { getDateForDailyKey } from '../daily/date'
import { confirmDailySessionFromSnapshot, DAILY_SESSION_KEY, generateDailySnapshot, loadDailySession } from '../persistence/dailySession'
import { confirmInfiniteSessionFromSnapshot, generateInfiniteSnapshot, INFINITE_SESSION_KEY, loadInfiniteSession, markInfiniteSessionCompleted } from '../persistence/infiniteSession'
import { restoreProceduralCaseSnapshot } from '../persistence/proceduralSnapshot'

const memory = (failWrites = false) => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { if (failWrites) throw new DOMException('quota', 'QuotaExceededError'); values.set(key, value) },
    removeItem: (key: string) => values.delete(key), clear: () => values.clear(), key: () => null, get length() { return values.size },
  } as Storage
}
const progress = { saveVersion: 2 as const, selectedDifficulty: 1 as const, completedCaseNumbersByDifficulty: { 1: [], 2: [], 3: [], 4: [], 5: [] } }

describe('main-thread persistence from Worker snapshots', () => {
  it('persists an identical Daily V2 and never returns an unpersisted session', () => {
    const dateKey = '2026-09-08', date = getDateForDailyKey(dateKey)!, snapshot = generateDailySnapshot(date, 1)
    const storage = memory(), result = confirmDailySessionFromSnapshot(dateKey, 1, progress, snapshot, storage)
    expect(result.ok).toBe(true)
    expect(JSON.parse(storage.getItem(DAILY_SESSION_KEY)!)).toEqual({ saveVersion: 2, snapshot })
    expect(loadDailySession(date, storage)?.snapshot).toEqual(snapshot)
    const failed = confirmDailySessionFromSnapshot(dateKey, 1, progress, snapshot, memory(true))
    expect(failed).toEqual({ ok: false, kind: 'storage' })
  })

  it('rejects Daily mode, date and difficulty mismatches', () => {
    const dateKey = '2026-09-08', date = getDateForDailyKey(dateKey)!
    const daily = generateDailySnapshot(date, 1), infinite = generateInfiniteSnapshot(1, 123)
    expect(confirmDailySessionFromSnapshot(dateKey, 1, progress, infinite, memory())).toEqual({ ok: false, kind: 'validation' })
    expect(confirmDailySessionFromSnapshot('2026-09-09', 1, progress, daily, memory())).toEqual({ ok: false, kind: 'validation' })
    expect(confirmDailySessionFromSnapshot(dateKey, 2, progress, daily, memory())).toEqual({ ok: false, kind: 'locked' })
  })

  it('preserves an existing session over a later result', () => {
    const storage = memory(), first = generateInfiniteSnapshot(1, 123), later = generateInfiniteSnapshot(1, 456)
    expect(confirmInfiniteSessionFromSnapshot(1, 123, progress, first, storage).ok).toBe(true)
    const result = confirmInfiniteSessionFromSnapshot(1, 456, progress, later, storage)
    expect(result.ok && result.session.seed).toBe(123)
    expect(JSON.parse(storage.getItem(INFINITE_SESSION_KEY)!)).toEqual({ saveVersion: 2, status: 'active', snapshot: first })
  })

  it('validates Infinite inputs, storage failure and completed status restoration', () => {
    const snapshot = generateInfiniteSnapshot(1, 0x10203040)
    expect(confirmInfiniteSessionFromSnapshot(1, 7, progress, snapshot, memory())).toEqual({ ok: false, kind: 'validation' })
    expect(confirmInfiniteSessionFromSnapshot(1, 0x10203040, progress, snapshot, memory(true))).toEqual({ ok: false, kind: 'storage' })
    const storage = memory()
    const created = confirmInfiniteSessionFromSnapshot(1, 0x10203040, progress, snapshot, storage)
    expect(created.ok).toBe(true)
    expect(markInfiniteSessionCompleted(storage)?.status).toBe('completed')
    expect(loadInfiniteSession(storage)?.status).toBe('completed')
    expect(restoreProceduralCaseSnapshot(snapshot, { mode: 'infinite', originalSeed: 0x10203040 })).not.toBeNull()
  })
})
