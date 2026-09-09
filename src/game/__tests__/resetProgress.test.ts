import { describe, expect, it } from 'vitest'
import { SETTINGS_KEY } from '../../theme'
import { getCaseSaveKey, loadCaseSave, saveCase } from '../persistence/caseSave'
import { DAILY_SESSION_KEY, loadDailySession } from '../persistence/dailySession'
import { INFINITE_SESSION_KEY, loadInfiniteSession } from '../persistence/infiniteSession'
import { loadNormalProgress, NORMAL_PROGRESS_KEY } from '../persistence/normalProgress'
import { loadPlayerStats, PLAYER_STATS_KEY } from '../persistence/playerStats'
import { loadProgress, PROGRESS_KEY } from '../persistence/progress'
import { resetAllProgress } from '../persistence/resetProgress'
import { loadSettings, saveSettings } from '../persistence/settings'

class MemoryStorage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('resetAllProgress', () => {
  it('removes all game progress and versioned case saves while preserving settings and foreign keys', () => {
    const storage = new MemoryStorage() as unknown as Storage
    const date = new Date(2026, 8, 8, 12)
    const caseIds = ['case001', 'normal-d2-c01-g4', 'normal-d3-c42-g2', 'normal-d4-c10-g3', 'daily-2026-09-08-d5-g4', 'infinite-d5-s42-g4']
    storage.setItem(PROGRESS_KEY, JSON.stringify({ saveVersion: 1, completedCaseIds: ['case001'] }))
    storage.setItem(NORMAL_PROGRESS_KEY, JSON.stringify({ saveVersion: 1, selectedDifficulty: 3, completedCaseNumbersByDifficulty: { 1: [1, 2], 2: [1], 3: [], 4: [], 5: [] } }))
    storage.setItem(DAILY_SESSION_KEY, JSON.stringify({ saveVersion: 1, dateKey: '2026-09-08', difficulty: 2 }))
    storage.setItem(INFINITE_SESSION_KEY, JSON.stringify({ saveVersion: 1, generationVersion: 1, difficulty: 2, seed: 42, status: 'active' }))
    storage.setItem(PLAYER_STATS_KEY, JSON.stringify({ saveVersion: 1, completedInfiniteCaseIds: ['infinite-d2-s42'], hintsUsed: { review: 2, exclusion: 1, reveal: 3 } }))
    caseIds.forEach(caseId => saveCase(caseId, { placements: [{ characterId: 'a', position: { row: 1, column: 1 } }], manualExcludedCells: [{ row: 1, column: 2 }], hintsUsed: { review: 1, exclusion: 1, reveal: 1 } }, storage))
    saveSettings({ saveVersion: 1, theme: 'light', autoCrossout: true }, storage)
    storage.setItem('some-other-app-data', 'keep')

    resetAllProgress(storage)

    for (const key of [PROGRESS_KEY, NORMAL_PROGRESS_KEY, DAILY_SESSION_KEY, INFINITE_SESSION_KEY, PLAYER_STATS_KEY, ...caseIds.map(getCaseSaveKey)]) expect(storage.getItem(key)).toBeNull()
    expect(storage.getItem(SETTINGS_KEY)).not.toBeNull()
    expect(storage.getItem('some-other-app-data')).toBe('keep')
    expect(loadProgress(storage)).toEqual({ saveVersion: 1, completedCaseIds: [] })
    expect(loadNormalProgress(storage)).toEqual({ saveVersion: 1, selectedDifficulty: 1, completedCaseNumbersByDifficulty: { 1: [], 2: [], 3: [], 4: [], 5: [] } })
    expect(loadDailySession(date, storage)).toBeNull()
    expect(loadInfiniteSession(storage)).toBeNull()
    expect(loadPlayerStats(storage)).toEqual({ saveVersion: 1, completedInfiniteCaseIds: [], hintsUsed: { review: 0, exclusion: 0, reveal: 0 } })
    for (const caseId of caseIds) expect(loadCaseSave(caseId, storage)).toEqual({ saveVersion: 3, placements: [], manualExcludedCells: [], hintsUsed: { review: 0, exclusion: 0, reveal: 0 } })
    expect(loadSettings(storage)).toEqual({ saveVersion: 1, theme: 'light', autoCrossout: true })
  })
})
