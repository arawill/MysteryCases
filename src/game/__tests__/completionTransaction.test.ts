import { describe, expect, it } from 'vitest'
import { MemoryStorage } from './storage'
import { openCaseAttempt } from '../persistence/caseAttempt'
import { completeInvestigation } from '../persistence/completionTransaction'
import { getCaseSaveKey, loadCaseSave, saveCase } from '../persistence/caseSave'
import { loadInvestigationHistory } from '../persistence/investigationHistory'
import { loadNormalProgress } from '../persistence/normalProgress'
import { STORAGE_TRANSACTION_KEY } from '../persistence/storageCatalog'
import { recoverStorageTransaction } from '../persistence/storageTransaction'
import { startDailySession, DAILY_SESSION_KEY } from '../persistence/dailySession'
import { startInfiniteSession, loadInfiniteSession } from '../persistence/infiniteSession'
import { getDailyCaseId } from '../daily/date'
import { getInfiniteCaseId } from '../infinite/generator'
import { isCaseCompleted } from '../persistence/progress'
import { loadPlayerStats } from '../persistence/playerStats'

class FaultStorage extends MemoryStorage {
  operations = 0
  failAt?: number
  override setItem(key: string, value: string) { this.operations += 1; if (this.operations === this.failAt) throw new DOMException('full', 'QuotaExceededError'); super.setItem(key, value) }
  override removeItem(key: string) { this.operations += 1; if (this.operations === this.failAt) throw new Error('interrupted'); super.removeItem(key) }
}

class AfterWriteFaultStorage extends MemoryStorage {
  failNext = false
  override setItem(key: string, value: string) { super.setItem(key, value); if (this.failNext) { this.failNext = false; throw new Error('interrupted after write') } }
}

const identity = { mode: 'normal' as const, logicalId: 'normal-d1-c01', difficulty: 1 as const, caseNumber: 1 }
const assists = { review: 0, exclusion: 0, positionChecks: 0 }
const emptyProgress = { saveVersion: 2 as const, selectedDifficulty: 1 as const, completedCaseNumbersByDifficulty: { 1: [], 2: [], 3: [], 4: [], 5: [] } }

function prepare(storage: Storage) {
  saveCase('case001', { placements: [{ characterId: 'person-01', position: { row: 1, column: 1 } }], manualExcludedCells: [] }, storage)
  const opened = openCaseAttempt('case001', storage)
  if (!opened.ok) throw new Error('attempt setup failed')
  return opened.attempt.sequence
}

describe('completion transaction', () => {
  it('restores the previous valid CaseSave when an autosave write is interrupted', () => {
    const storage = new AfterWriteFaultStorage()
    saveCase('case001', { placements: [{ characterId: 'old', position: { row: 1, column: 1 } }], manualExcludedCells: [] }, storage)
    storage.failNext = true
    expect(saveCase('case001', { placements: [{ characterId: 'new', position: { row: 2, column: 2 } }], manualExcludedCells: [] }, storage).ok).toBe(false)
    expect(loadCaseSave('case001', storage).placements).toEqual([{ characterId: 'old', position: { row: 1, column: 1 } }])
  })

  it('commits every completion effect once across two identical calls', () => {
    const storage = new MemoryStorage(), sequence = prepare(storage)
    const first = completeInvestigation({ caseId: 'case001', attemptSequence: sequence, identity, assists }, storage, new Date('2026-09-08T12:00:00Z'))
    const second = completeInvestigation({ caseId: 'case001', attemptSequence: sequence, identity, assists }, storage, new Date('2026-09-08T12:01:00Z'))
    expect(first).toMatchObject({ ok: true, alreadyCompleted: false })
    expect(second).toMatchObject({ ok: true, alreadyCompleted: true })
    expect(loadNormalProgress(storage).completedCaseNumbersByDifficulty[1]).toEqual([1])
    expect(loadInvestigationHistory(storage).records).toMatchObject([{ logicalId: 'normal-d1-c01', completions: 1, perfectCompletions: 1 }])
    expect(storage.getItem(getCaseSaveKey('case001'))).toBeNull()
  })

  it('survives interruption or quota at every transaction write without a partial observable completion', () => {
    for (let failAt = 1; failAt <= 8; failAt += 1) {
      const storage = new FaultStorage(), sequence = prepare(storage)
      storage.operations = 0; storage.failAt = failAt
      completeInvestigation({ caseId: 'case001', attemptSequence: sequence, identity, assists }, storage, new Date('2026-09-08T12:00:00Z'))
      storage.failAt = undefined
      expect(recoverStorageTransaction(storage).ok).toBe(true)
      const completed = loadNormalProgress(storage).completedCaseNumbersByDifficulty[1].includes(1)
      const record = loadInvestigationHistory(storage).records.find(item => item.logicalId === identity.logicalId)
      expect(record?.completions ?? 0).toBe(completed ? 1 : 0)
      expect(storage.getItem(getCaseSaveKey('case001')) === null).toBe(completed)
      expect(storage.getItem(STORAGE_TRANSACTION_KEY)).toBeNull()
      const retry = completeInvestigation({ caseId: 'case001', attemptSequence: sequence, identity, assists }, storage, new Date('2026-09-08T12:01:00Z'))
      expect(retry.ok).toBe(true)
      expect(loadInvestigationHistory(storage).records[0].completions).toBe(1)
    }
  })

  it('recovers a committed journal before handling the same completion call again', () => {
    const storage = new FaultStorage(), sequence = prepare(storage)
    storage.operations = 0; storage.failAt = 7
    expect(completeInvestigation({ caseId: 'case001', attemptSequence: sequence, identity, assists }, storage).ok).toBe(false)
    expect(storage.getItem(STORAGE_TRANSACTION_KEY)).not.toBeNull()
    storage.failAt = undefined
    expect(completeInvestigation({ caseId: 'case001', attemptSequence: sequence, identity, assists }, storage)).toMatchObject({ ok: true, alreadyCompleted: true })
    expect(loadInvestigationHistory(storage).records[0].completions).toBe(1)
  })

  it('closes Daily atomically, removes its restorable snapshot and records it once', () => {
    const storage = new MemoryStorage(), date = new Date(2026, 8, 8, 12)
    const session = startDailySession(date, 1, emptyProgress, storage)!
    saveCase(session.caseData.id, { placements: [], manualExcludedCells: [{ row: 1, column: 1 }] }, storage)
    const opened = openCaseAttempt(session.caseData.id, storage)
    if (!opened.ok) throw new Error('attempt setup failed')
    const logicalId = getDailyCaseId(date)
    const result = completeInvestigation({ caseId: session.caseData.id, attemptSequence: opened.attempt.sequence, identity: { mode: 'daily', logicalId, difficulty: 1, dateKey: session.dateKey }, assists }, storage)
    expect(result.ok).toBe(true)
    expect(completeInvestigation({ caseId: session.caseData.id, attemptSequence: opened.attempt.sequence, identity: { mode: 'daily', logicalId, difficulty: 1, dateKey: session.dateKey }, assists }, storage)).toMatchObject({ ok: true, alreadyCompleted: true })
    expect(isCaseCompleted(logicalId, storage)).toBe(true)
    expect(storage.getItem(DAILY_SESSION_KEY)).toBeNull()
    expect(storage.getItem(getCaseSaveKey(session.caseData.id))).toBeNull()
    expect(loadInvestigationHistory(storage).records[0].completions).toBe(1)
  }, 30_000)

  it('marks Infinite complete without changing its persisted procedural fingerprint', () => {
    const storage = new MemoryStorage(), session = startInfiniteSession(1, 4242, emptyProgress, storage)!
    const fingerprint = JSON.stringify(session.snapshot)
    const opened = openCaseAttempt(session.caseData.id, storage)
    if (!opened.ok) throw new Error('attempt setup failed')
    const logicalId = getInfiniteCaseId(1, 4242)
    expect(completeInvestigation({ caseId: session.caseData.id, attemptSequence: opened.attempt.sequence, identity: { mode: 'infinite', logicalId, difficulty: 1, seed: 4242 }, assists }, storage).ok).toBe(true)
    expect(completeInvestigation({ caseId: session.caseData.id, attemptSequence: opened.attempt.sequence, identity: { mode: 'infinite', logicalId, difficulty: 1, seed: 4242 }, assists }, storage)).toMatchObject({ ok: true, alreadyCompleted: true })
    const completed = loadInfiniteSession(storage)!
    expect(completed.status).toBe('completed')
    expect(JSON.stringify(completed.snapshot)).toBe(fingerprint)
    expect(loadPlayerStats(storage).completedInfiniteCaseIds).toEqual([logicalId])
    expect(isCaseCompleted(logicalId, storage)).toBe(false)
  }, 30_000)
})
