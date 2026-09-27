import { getAttemptKey, isManagedCaseId } from './storageCatalog'
import { readStorageValue, writeStorageValue, type StorageFailure } from './storageAdapter'
import { recoverStorageTransaction } from './storageTransaction'

export interface CaseAttempt { saveVersion: 1; caseId: string; sequence: number; status: 'active' | 'completed' }
export type OpenCaseAttemptResult = { ok: true; attempt: CaseAttempt } | { ok: false; error: StorageFailure }

const isAttempt = (value: unknown, caseId: string): value is CaseAttempt => {
  if (!value || typeof value !== 'object') return false
  const attempt = value as Partial<CaseAttempt>
  return attempt.saveVersion === 1 && attempt.caseId === caseId && Number.isSafeInteger(attempt.sequence) && Number(attempt.sequence) > 0
    && (attempt.status === 'active' || attempt.status === 'completed')
}

export function loadCaseAttempt(caseId: string, storage: Storage = localStorage): CaseAttempt | null {
  if (!isManagedCaseId(caseId)) return null
  const read = readStorageValue(getAttemptKey(caseId), storage)
  if (!read.ok || read.value === null) return null
  try { const value: unknown = JSON.parse(read.value); return isAttempt(value, caseId) ? value : null } catch { return null }
}

export function openCaseAttempt(caseId: string, storage: Storage = localStorage): OpenCaseAttemptResult {
  if (!isManagedCaseId(caseId)) return { ok: false, error: { kind: 'verification', operation: 'write', key: getAttemptKey(caseId) } }
  const recovered = recoverStorageTransaction(storage)
  if (!recovered.ok) return { ok: false, error: recovered.error! }
  const current = loadCaseAttempt(caseId, storage)
  const attempt: CaseAttempt = current?.status === 'active'
    ? current
    : { saveVersion: 1, caseId, sequence: (current?.sequence ?? 0) + 1, status: 'active' }
  const written = writeStorageValue(getAttemptKey(caseId), JSON.stringify(attempt), storage)
  return written.ok ? { ok: true, attempt } : written
}
