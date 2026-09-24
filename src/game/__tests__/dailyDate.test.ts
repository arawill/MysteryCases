import { describe, expect, it } from 'vitest'
import {
  getDailyDateKey,
  getDailyDateKeyFromParts,
  getDailyDifficultySeed,
  getDailyDifficultySeedFromKey,
  getDailySeed,
  getDailySeedFromKey,
  parseDailyDateKey,
} from '../daily/date'

const localDate = (year: number, month: number, day: number) => ({
  getFullYear: () => year,
  getMonth: () => month - 1,
  getDate: () => day,
  toISOString: () => { throw new Error('Daily must not derive its date through UTC.') },
})

describe('Daily local date contract', () => {
  it.each([
    [2026, 1, 1, '2026-01-01'],
    [2026, 1, 31, '2026-01-31'],
    [2026, 2, 1, '2026-02-01'],
    [2024, 2, 29, '2024-02-29'],
    [2026, 12, 31, '2026-12-31'],
    [2027, 1, 1, '2027-01-01'],
  ])('formats %i-%i-%i as a stable key', (year, month, day, expected) => {
    expect(getDailyDateKey(localDate(year, month, day))).toBe(expected)
    expect(getDailyDateKeyFromParts({ year, month, day })).toBe(expected)
  })

  it.each([
    [2026, 3, 28],
    [2026, 3, 29],
    [2026, 3, 30],
    [2026, 10, 24],
    [2026, 10, 25],
    [2026, 10, 26],
  ])('uses only local calendar fields around Europe/Madrid DST: %i-%i-%i', (year, month, day) => {
    const date = localDate(year, month, day)
    const expected = getDailyDateKeyFromParts({ year, month, day })
    expect(getDailyDateKey(date)).toBe(expected)
    expect(getDailySeed(date)).toBe(getDailySeedFromKey(expected))
  })

  it('is independent from locale, UTC conversion, and the time within a local day', () => {
    const morning = localDate(2026, 9, 24)
    const evening = localDate(2026, 9, 24)
    expect(getDailyDateKey(morning)).toBe('2026-09-24')
    expect(getDailyDateKey(evening)).toBe(getDailyDateKey(morning))
    expect(getDailyDifficultySeed(morning, 4)).toBe(getDailyDifficultySeedFromKey('2026-09-24', 4))
  })

  it('validates calendar keys instead of accepting normalized or regional dates', () => {
    expect(parseDailyDateKey('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 })
    expect(parseDailyDateKey('2026-02-29')).toBeNull()
    expect(parseDailyDateKey('2026-13-01')).toBeNull()
    expect(parseDailyDateKey('24/09/2026')).toBeNull()
  })

  it('preserves the established seed mapping', () => {
    expect(getDailySeedFromKey('2026-01-01')).toBe(3394289277)
    expect(getDailyDifficultySeedFromKey('2026-01-05', 5)).toBe(1514407350)
  })
})
