import { getDailyCaseIdFromKey, getDailyDateKey } from '../daily/date'
import { getCaseIdFromAttemptKey, getCaseIdFromSaveKey, listStorageKeys } from './storageCatalog'
import { getCaseSaveKey } from './caseSave'
import { DAILY_SESSION_KEY, loadDailySession } from './dailySession'
import { isCaseCompleted } from './progress'
import { executeStorageTransaction, readPendingStorageTransaction, recoverStorageTransaction } from './storageTransaction'

const dailyCaseDate = (caseId: string): string | null => /^daily-(\d{4}-\d{2}-\d{2})-d[1-5](?:-g\d+)?$/.exec(caseId)?.[1] ?? null

export interface DailyRetentionResult { ok: boolean; removedKeys: string[]; activeCaseId?: string }

export function cleanupDailyRetention(now: Date = new Date(), storage: Storage = localStorage): DailyRetentionResult {
  const recovery = recoverStorageTransaction(storage)
  if (!recovery.ok) return { ok: false, removedKeys: [] }
  let active = loadDailySession(now, storage)
  const changes = new Map<string, null>()
  if (active && isCaseCompleted(getDailyCaseIdFromKey(active.dateKey), storage)) {
    changes.set(DAILY_SESSION_KEY, null)
    changes.set(getCaseSaveKey(active.caseData.id), null)
    active = null
  }
  const today = getDailyDateKey(now)
  const protectedKeys = new Set(readPendingStorageTransaction(storage).map(item => item.key))
  for (const key of listStorageKeys(storage)) {
    const caseId = getCaseIdFromSaveKey(key) ?? getCaseIdFromAttemptKey(key)
    if (!caseId) continue
    const dateKey = dailyCaseDate(caseId)
    if (!dateKey || dateKey === today || caseId === active?.caseData.id || protectedKeys.has(key)) continue
    changes.set(key, null)
  }
  const removedKeys = [...changes.keys()]
  const result = executeStorageTransaction(`daily-retention:${today}`, removedKeys.map(key => ({ key, after: null })), storage)
  return { ok: result.ok, removedKeys: result.ok ? removedKeys : [], ...(active ? { activeCaseId: active.caseData.id } : {}) }
}
