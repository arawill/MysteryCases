import { describe, expect, it, vi } from 'vitest'
import { getDailyCaseId, getDailyPuzzleId, getDailyDifficultySeed, getDailySeed } from '../daily/date'
import { generateDailyCase } from '../daily/generator'
import { DAILY_SESSION_KEY, loadDailySession, startDailySession } from '../persistence/dailySession'
import { markNormalCaseCompleted } from '../persistence/normalProgress'
import { PROCEDURAL_GENERATION_VERSION } from '../generation/version'
import { PROCEDURAL_SNAPSHOT_FORMAT_VERSION } from '../persistence/proceduralSnapshot'
import type { DifficultyRating } from '../types'

const memory = () => { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), clear: () => values.clear(), key: () => null, get length() { return values.size } } as Storage }
const date = new Date(2026, 8, 8, 12)
const empty = { saveVersion: 2 as const, selectedDifficulty: 1 as const, completedCaseNumbersByDifficulty: { 1: [], 2: [], 3: [], 4: [], 5: [] } }
describe('daily session', () => {
  it('starts once, persists for today and rejects locked difficulty', () => { const storage = memory(); expect(loadDailySession(date, storage)).toBeNull(); expect(startDailySession(date, 2, empty, storage)).toBeNull(); expect(startDailySession(date, 1, empty, storage)?.difficulty).toBe(1); expect(loadDailySession(date, storage)?.difficulty).toBe(1); expect(startDailySession(date, 2, empty, storage)?.difficulty).toBe(1); expect(loadDailySession(new Date(2026, 8, 9, 12), storage)).toBeNull() })
  it('uses Normal unlocks and stable daily identities', () => { const storage = memory(); for (let number = 1; number <= 15; number += 1) markNormalCaseCompleted(1, number, storage); const progress = { saveVersion: 2 as const, selectedDifficulty: 2 as const, completedCaseNumbersByDifficulty: { 1: Array.from({ length: 15 }, (_, index) => index + 1), 2: [], 3: [], 4: [], 5: [] } }; expect(startDailySession(date, 2, progress, storage)?.difficulty).toBe(2); expect(getDailyCaseId(date)).toBe('daily-2026-09-08'); expect(getDailyPuzzleId(date, 1)).toBe('daily-2026-09-08-d1'); expect(getDailyPuzzleId(date, 5)).toBe('daily-2026-09-08-d5'); expect(getDailyDifficultySeed(date, 1)).toBe(getDailySeed(date)); expect(getDailyDifficultySeed(date, 2)).not.toBe(getDailySeed(date)) })

  it('restores the exact snapshot without invoking the generator again', () => {
    const storage = memory()
    const started = startDailySession(date, 1, empty, storage)!
    const changedGenerator = vi.fn(() => { throw new Error('A restored session must not regenerate.') })
    const restored = loadDailySession(date, storage, changedGenerator)
    expect(changedGenerator).not.toHaveBeenCalled()
    expect(restored?.caseData).toEqual(started.caseData)
    expect(restored).toMatchObject({ snapshotFormatVersion: PROCEDURAL_SNAPSHOT_FORMAT_VERSION, generatorVersion: PROCEDURAL_GENERATION_VERSION, mode: 'daily', dateKey: '2026-09-08', seed: started.seed })
  }, 30_000)

  it('migrates a legacy session once and immediately persists its snapshot', () => {
    const storage = memory()
    storage.setItem(DAILY_SESSION_KEY, JSON.stringify({ saveVersion: 1, dateKey: '2026-09-08', difficulty: 1 }))
    const generator = vi.fn((value: Date, difficulty: DifficultyRating) => generateDailyCase(value, difficulty))
    const migrated = loadDailySession(date, storage, generator)
    expect(generator).toHaveBeenCalledOnce()
    expect(migrated?.caseData.id).toBe('daily-2026-09-08-d1-g7')
    expect(JSON.parse(storage.getItem(DAILY_SESSION_KEY)!)).toMatchObject({ saveVersion: 2, snapshot: { mode: 'daily', dailyDateKey: '2026-09-08' } })
    const forbiddenGenerator = vi.fn(() => { throw new Error('Legacy migration ran twice.') })
    expect(loadDailySession(date, storage, forbiddenGenerator)?.caseData).toEqual(migrated?.caseData)
    expect(forbiddenGenerator).not.toHaveBeenCalled()
  }, 30_000)

  it('pins an active case across midnight and offers the new date after returning', () => {
    const storage = memory()
    const active = startDailySession(date, 1, empty, storage)!
    const nextDate = new Date(2026, 8, 9, 8)
    expect(active.dateKey).toBe('2026-09-08')
    expect(active.caseData.id).toBe('daily-2026-09-08-d1-g7')
    expect(loadDailySession(nextDate, storage)).toBeNull()
    const next = startDailySession(nextDate, 1, empty, storage)!
    expect(next.dateKey).toBe('2026-09-09')
    expect(next.caseData.id).not.toBe(active.caseData.id)
  }, 30_000)

  it('handles corrupt and unsafe legacy data without crashing or repeated generation', () => {
    const storage = memory()
    storage.setItem(DAILY_SESSION_KEY, '{broken')
    expect(() => loadDailySession(date, storage)).not.toThrow()
    expect(loadDailySession(date, storage)).toBeNull()
    storage.setItem(DAILY_SESSION_KEY, JSON.stringify({ saveVersion: 1, dateKey: '2026-09-08', difficulty: 1 }))
    const failingGenerator = vi.fn(() => { throw new Error('cannot reconstruct') })
    expect(loadDailySession(date, storage, failingGenerator)).toBeNull()
    expect(storage.getItem(DAILY_SESSION_KEY)).toBeNull()
    expect(loadDailySession(date, storage, failingGenerator)).toBeNull()
    expect(failingGenerator).toHaveBeenCalledOnce()
  })
})
