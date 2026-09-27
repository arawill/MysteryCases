import { describe, expect, it } from 'vitest'
import { MemoryStorage } from './storage'
import { getAttemptKey, STORAGE_TRANSACTION_KEY } from '../persistence/storageCatalog'
import { getCaseSaveKey, saveCase } from '../persistence/caseSave'
import { abandonDailySession, DAILY_SESSION_KEY, loadDailySession, startDailySession } from '../persistence/dailySession'
import { cleanupDailyRetention } from '../persistence/dailyRetention'
import { INVESTIGATION_HISTORY_KEY } from '../persistence/investigationHistory'
import { ACHIEVEMENT_PROGRESS_KEY } from '../persistence/achievementProgress'

const progress = { saveVersion: 2 as const, selectedDifficulty: 1 as const, completedCaseNumbersByDifficulty: { 1: [], 2: [], 3: [], 4: [], 5: [] } }
const oldDate = new Date(2026, 8, 8, 12)
const today = new Date(2026, 8, 10, 12)

class UnavailableStorage extends MemoryStorage {
  unavailable = false
  override setItem(key: string, value: string) { if (this.unavailable) throw new Error('unavailable'); super.setItem(key, value) }
  override removeItem(key: string) { if (this.unavailable) throw new Error('unavailable'); super.removeItem(key) }
}

describe('Daily retention', () => {
  it('preserves an older active session and current-day data while removing inaccessible old data', () => {
    const storage = new MemoryStorage()
    const active = startDailySession(oldDate, 1, progress, storage)!
    saveCase(active.caseData.id, { placements: [], manualExcludedCells: [{ row: 1, column: 1 }] }, storage)
    const staleId = 'daily-2026-09-09-d1-g7', currentId = 'daily-2026-09-10-d1-g7'
    storage.setItem(getCaseSaveKey(staleId), '{}'); storage.setItem(getAttemptKey(staleId), '{}')
    storage.setItem(getCaseSaveKey(currentId), '{}'); storage.setItem(getAttemptKey(currentId), '{}')
    storage.setItem(INVESTIGATION_HISTORY_KEY, '{"saveVersion":1,"records":[]}')
    storage.setItem(ACHIEVEMENT_PROGRESS_KEY, '{"saveVersion":1,"unlocked":[]}')

    const result = cleanupDailyRetention(today, storage)

    expect(result).toMatchObject({ ok: true, activeCaseId: active.caseData.id })
    expect(loadDailySession(today, storage)?.caseData.id).toBe(active.caseData.id)
    expect(storage.getItem(getCaseSaveKey(active.caseData.id))).not.toBeNull()
    expect(storage.getItem(getCaseSaveKey(staleId))).toBeNull()
    expect(storage.getItem(getAttemptKey(staleId))).toBeNull()
    expect(storage.getItem(getCaseSaveKey(currentId))).not.toBeNull()
    expect(storage.getItem(getAttemptKey(currentId))).not.toBeNull()
    expect(storage.getItem(INVESTIGATION_HISTORY_KEY)).not.toBeNull()
    expect(storage.getItem(ACHIEVEMENT_PROGRESS_KEY)).not.toBeNull()
    expect(cleanupDailyRetention(today, storage).removedKeys).toEqual([])
  }, 30_000)

  it('abandons an older active Daily atomically and permits today after that', () => {
    const storage = new MemoryStorage()
    const active = startDailySession(oldDate, 1, progress, storage)!
    saveCase(active.caseData.id, { placements: [], manualExcludedCells: [{ row: 1, column: 1 }] }, storage)
    expect(abandonDailySession(storage)).toBe(true)
    expect(storage.getItem(DAILY_SESSION_KEY)).toBeNull()
    expect(storage.getItem(getCaseSaveKey(active.caseData.id))).toBeNull()
    expect(startDailySession(today, 1, progress, storage)?.dateKey).toBe('2026-09-10')
  }, 30_000)

  it('cleans corrupt inaccessible sessions and their old saves without touching current saves', () => {
    const storage = new MemoryStorage(), staleId = 'daily-2026-09-08-d1-g7', currentId = 'daily-2026-09-10-d1-g7'
    storage.setItem(DAILY_SESSION_KEY, '{broken')
    storage.setItem(getCaseSaveKey(staleId), '{}')
    storage.setItem(getCaseSaveKey(currentId), '{}')
    expect(cleanupDailyRetention(today, storage).ok).toBe(true)
    expect(storage.getItem(DAILY_SESSION_KEY)).toBeNull()
    expect(storage.getItem(getCaseSaveKey(staleId))).toBeNull()
    expect(storage.getItem(getCaseSaveKey(currentId))).not.toBeNull()
  })

  it('does not clean Daily data while its pending recovery cannot be resolved', () => {
    const storage = new UnavailableStorage(), staleKey = getCaseSaveKey('daily-2026-09-08-d1-g7')
    storage.setItem(staleKey, 'old')
    storage.setItem(STORAGE_TRANSACTION_KEY, JSON.stringify({ saveVersion: 1, id: 'complete:daily', kind: 'complete', mutations: [{ key: staleKey, before: 'old', after: 'new' }] }))
    storage.unavailable = true
    expect(cleanupDailyRetention(today, storage)).toMatchObject({ ok: false, removedKeys: [] })
    storage.unavailable = false
    expect(storage.getItem(staleKey)).toBe('old')
    expect(storage.getItem(STORAGE_TRANSACTION_KEY)).not.toBeNull()
  })
})
