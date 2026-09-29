import { describe, expect, it } from 'vitest'
import { DAILY_SESSION_KEY, getPendingLegacyDailySession } from '../persistence/dailySession'
import { getPendingLegacyInfiniteSession, INFINITE_SESSION_KEY } from '../persistence/infiniteSession'
import { initializePersistence } from '../persistence/initializePersistence'
import { ProceduralWorkerClient } from '../proceduralWorker/client'
import { discardPendingLegacyMigration, inspectPendingLegacyMigrations, migratePendingLegacySessions } from '../proceduralWorker/legacyMigration'

const memory = () => { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), clear: () => values.clear(), key: () => null, get length() { return values.size } } as Storage }
const unavailableWorker = () => new ProceduralWorkerClient({ createWorker: () => { throw new Error('unavailable') } })

describe('visible legacy migration orchestration', () => {
  it('migrates Infinite then Daily with fallback while preserving metadata and exact V2 formats', async () => {
    const storage = memory()
    storage.setItem(INFINITE_SESSION_KEY, JSON.stringify({ saveVersion: 1, generationVersion: 1, difficulty: 1, seed: 98765, status: 'completed' }))
    storage.setItem(DAILY_SESSION_KEY, JSON.stringify({ saveVersion: 1, dateKey: '2026-09-08', difficulty: 1 }))
    expect(inspectPendingLegacyMigrations(storage).map(item => item.mode)).toEqual(['infinite', 'daily'])
    let paints = 0
    await expect(migratePendingLegacySessions({ storage, client: unavailableWorker(), waitForPaint: async () => { paints += 1 } })).resolves.toEqual({ ok: true })
    expect(paints).toBe(2)
    expect(JSON.parse(storage.getItem(INFINITE_SESSION_KEY)!)).toMatchObject({ saveVersion: 2, status: 'completed', snapshot: { mode: 'infinite', originalSeed: 98765 } })
    expect(JSON.parse(storage.getItem(DAILY_SESSION_KEY)!)).toMatchObject({ saveVersion: 2, snapshot: { mode: 'daily', dailyDateKey: '2026-09-08' } })
    expect(inspectPendingLegacyMigrations(storage)).toEqual([])
  }, 30_000)

  it('does not erase a failed legacy migration and discards only by explicit matching action', async () => {
    const storage = memory(), legacy = { saveVersion: 1 as const, generationVersion: 1 as const, difficulty: 1 as const, seed: 42, status: 'active' as const }
    storage.setItem(INFINITE_SESSION_KEY, JSON.stringify(legacy))
    const client = new ProceduralWorkerClient({ createWorker: () => { throw new Error('unavailable') } })
    const result = await migratePendingLegacySessions({ storage, client, waitForPaint: async () => { throw new Error('fallback failed') } })
    expect(result).toMatchObject({ ok: false, pending: { mode: 'infinite', session: legacy } })
    expect(getPendingLegacyInfiniteSession(storage)).toEqual(legacy)
    if (result.ok) throw new Error('Expected migration failure.')
    expect(discardPendingLegacyMigration(result.pending, storage)).toBe(true)
    expect(getPendingLegacyInfiniteSession(storage)).toBeNull()
  })

  it('inspects V2 without starting a migration and keeps valid legacy metadata intact', () => {
    const storage = memory()
    storage.setItem(DAILY_SESSION_KEY, JSON.stringify({ saveVersion: 1, dateKey: '2026-09-08', difficulty: 1 }))
    expect(getPendingLegacyDailySession(storage)).toEqual({ saveVersion: 1, dateKey: '2026-09-08', difficulty: 1 })
    expect(storage.getItem(DAILY_SESSION_KEY)).not.toBeNull()
  })

  it('keeps procedural legacy work out of synchronous pre-render initialization', () => {
    const storage = memory()
    const legacy = { saveVersion: 1, generationVersion: 1, difficulty: 1, seed: 77, status: 'active' }
    storage.setItem(INFINITE_SESSION_KEY, JSON.stringify(legacy))
    expect(initializePersistence(new Date(2026, 8, 8), storage)).toBe(true)
    expect(JSON.parse(storage.getItem(INFINITE_SESSION_KEY)!)).toEqual(legacy)
    expect(getPendingLegacyInfiniteSession(storage)).toEqual(legacy)
  })
})
