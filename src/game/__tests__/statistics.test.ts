import { describe, expect, it } from 'vitest'
import { loadNormalProgress } from '../persistence/normalProgress'
import { PLAYER_STATS_KEY, loadPlayerStats, recordHintUse, recordInfiniteCompletion } from '../persistence/playerStats'
import { buildPlayerStatistics, calculateDailyStreaks, getCompletedDailyDateKeys, parseDailyDateKey } from '../statistics'

const storage = () => {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), clear: () => values.clear(), key: () => null, get length() { return values.size } } as Storage
}
describe('player statistics', () => {
  it('sanitises empty, corrupt and invalid PlayerStats', () => {
    const memory = storage()
    expect(loadPlayerStats(memory)).toEqual({ saveVersion: 1, completedInfiniteCaseIds: [], hintsUsed: { review: 0, exclusion: 0, reveal: 0 } })
    for (const value of ['{', JSON.stringify({ saveVersion: 2 }), JSON.stringify({ saveVersion: 1, completedInfiniteCaseIds: ['foo'], hintsUsed: { review: -1, exclusion: 1.5, reveal: NaN } })]) {
      memory.setItem(PLAYER_STATS_KEY, value)
      expect(loadPlayerStats(memory)).toEqual({ saveVersion: 1, completedInfiniteCaseIds: [], hintsUsed: { review: 0, exclusion: 0, reveal: 0 } })
    }
  })

  it('records valid Infinite cases idempotently and rejects malformed IDs', () => {
    const memory = storage()
    recordInfiniteCompletion('infinite-d3-s123', memory)
    recordInfiniteCompletion('infinite-d3-s123', memory)
    recordInfiniteCompletion('infinite-d5-s4294967295', memory)
    for (const id of ['foo', 'infinite-d0-s1', 'infinite-d6-s1', 'infinite-d1-s-1', 'infinite-d1-s4294967296', 'infinite-d1-s1.2']) recordInfiniteCompletion(id, memory)
    expect(loadPlayerStats(memory).completedInfiniteCaseIds).toEqual(['infinite-d3-s123', 'infinite-d5-s4294967295'])
  })

  it('accumulates and persists global hint counters', () => {
    const memory = storage()
    recordHintUse('review', memory); recordHintUse('review', memory); recordHintUse('exclusion', memory)
    recordHintUse('reveal', memory); recordHintUse('reveal', memory); recordHintUse('reveal', memory)
    expect(loadPlayerStats(memory).hintsUsed).toEqual({ review: 2, exclusion: 1, reveal: 3 })
  })

  it('accepts only real Daily dates and deduplicates them', () => {
    expect(parseDailyDateKey('daily-2026-09-08')).toBe('2026-09-08')
    for (const id of ['daily-2026-09-08-d3', 'daily-2026-13-01', 'daily-2026-02-31', 'foo']) expect(parseDailyDateKey(id)).toBeNull()
    expect(getCompletedDailyDateKeys({ saveVersion: 1, completedCaseIds: ['daily-2026-09-08', 'daily-2026-09-08', 'daily-2026-02-31', 'foo'] })).toEqual(['2026-09-08'])
  })

  it('calculates friendly current and best Daily streaks without DST arithmetic', () => {
    expect(calculateDailyStreaks(['2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08'], new Date(2026, 8, 8, 12))).toEqual({ current: 4, best: 4 })
    expect(calculateDailyStreaks(['2026-09-05', '2026-09-06', '2026-09-07'], new Date(2026, 8, 8, 12))).toEqual({ current: 3, best: 3 })
    expect(calculateDailyStreaks(['2026-09-06'], new Date(2026, 8, 8, 12))).toEqual({ current: 0, best: 1 })
    expect(calculateDailyStreaks(['2026-08-30', '2026-08-31', '2026-09-01', '2026-09-03', '2026-09-04', '2026-09-06'], new Date(2026, 8, 8, 12))).toEqual({ current: 0, best: 3 })
  })

  it('derives Normal, Daily, Infinite, totals and hints without duplicate counting', () => {
    const normal = loadNormalProgress(storage())
    normal.completedCaseNumbersByDifficulty[1] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const playerStats = { saveVersion: 1 as const, completedInfiniteCaseIds: ['infinite-d1-s1', 'infinite-d2-s2'], hintsUsed: { review: 2, exclusion: 3, reveal: 1 } }
    const result = buildPlayerStatistics({ normalProgress: normal, progress: { saveVersion: 1, completedCaseIds: ['daily-2026-09-06', 'daily-2026-09-07', 'daily-2026-09-08', 'daily-2026-09-08'] }, playerStats, today: new Date(2026, 8, 8, 12) })
    expect(result.normal.total).toBe(10)
    expect(result.normal.byDifficulty[0]).toMatchObject({ completed: 10, firstForty: 10, unlocked: true })
    expect(result.normal.highestUnlocked).toBe(1)
    expect(result.daily).toEqual({ completed: 3, currentStreak: 3, bestStreak: 3 })
    expect(result.infinite.completed).toBe(2)
    expect(result.hints).toEqual({ review: 2, exclusion: 3, reveal: 1, total: 6 })
    expect(result.totalSolved).toBe(15)
  })
})
