import { describe, expect, it } from 'vitest'
import { getDailyCaseId, getDailyPuzzleId, getDailyDifficultySeed, getDailySeed } from '../daily/date'
import { loadDailySession, startDailySession } from '../persistence/dailySession'
import { markNormalCaseCompleted } from '../persistence/normalProgress'

const memory = () => { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), clear: () => values.clear(), key: () => null, get length() { return values.size } } as Storage }
const date = new Date(2026, 8, 8, 12)
describe('daily session', () => {
  it('starts once, persists for today and rejects locked difficulty', () => { const storage = memory(), empty = { saveVersion: 1 as const, selectedDifficulty: 1 as const, completedCaseNumbersByDifficulty: { 1: [], 2: [], 3: [], 4: [], 5: [] } }; expect(loadDailySession(date, storage)).toBeNull(); expect(startDailySession(date, 2, empty, storage)).toBeNull(); expect(startDailySession(date, 1, empty, storage)?.difficulty).toBe(1); expect(loadDailySession(date, storage)?.difficulty).toBe(1); expect(startDailySession(date, 2, empty, storage)?.difficulty).toBe(1); expect(loadDailySession(new Date(2026, 8, 9, 12), storage)).toBeNull() })
  it('uses Normal unlocks and stable daily identities', () => { const storage = memory(); for (let number = 1; number <= 40; number += 1) markNormalCaseCompleted(1, number, storage); const progress = { saveVersion: 1 as const, selectedDifficulty: 2 as const, completedCaseNumbersByDifficulty: { 1: Array.from({ length: 40 }, (_, index) => index + 1), 2: [], 3: [], 4: [], 5: [] } }; expect(startDailySession(date, 2, progress, storage)?.difficulty).toBe(2); expect(getDailyCaseId(date)).toBe('daily-2026-09-08'); expect(getDailyPuzzleId(date, 1)).toBe('daily-2026-09-08-d1'); expect(getDailyPuzzleId(date, 5)).toBe('daily-2026-09-08-d5'); expect(getDailyDifficultySeed(date, 1)).toBe(getDailySeed(date)); expect(getDailyDifficultySeed(date, 2)).not.toBe(getDailySeed(date)) })
})
