import { STORAGE_TRANSACTION_KEY } from './storageCatalog'
import { applyStorageValue, readStorageValue, removeStorageValue, writeStorageValue, type StorageFailure } from './storageAdapter'

export interface StorageMutation { key: string; before: string | null; after: string | null }
interface StorageTransactionJournal { saveVersion: 1; id: string; kind: string; mutations: StorageMutation[] }
export interface StorageTransactionResult { ok: boolean; recovered?: 'forward' | 'rollback' | 'discarded'; error?: StorageFailure }

const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string'
const isJournal = (value: unknown): value is StorageTransactionJournal => {
  if (!value || typeof value !== 'object') return false
  const journal = value as Partial<StorageTransactionJournal>
  return journal.saveVersion === 1 && typeof journal.id === 'string' && journal.id.length > 0 && typeof journal.kind === 'string' && journal.kind.length > 0 && Array.isArray(journal.mutations)
    && journal.mutations.every(item => item && typeof item === 'object' && typeof item.key === 'string' && item.key !== STORAGE_TRANSACTION_KEY && isNullableString(item.before) && isNullableString(item.after))
}

function applyMutations(mutations: readonly StorageMutation[], side: 'before' | 'after', storage: Storage): StorageTransactionResult {
  const ordered = side === 'before' ? [...mutations].reverse() : mutations
  for (const mutation of ordered) {
    const result = applyStorageValue(mutation.key, mutation[side], storage)
    if (!result.ok) return result
  }
  return { ok: true }
}

export function readPendingStorageTransaction(storage: Storage = localStorage): StorageMutation[] {
  const read = readStorageValue(STORAGE_TRANSACTION_KEY, storage)
  if (!read.ok || read.value === null) return []
  try { const value: unknown = JSON.parse(read.value); return isJournal(value) ? value.mutations : [] } catch { return [] }
}

export function recoverStorageTransaction(storage: Storage = localStorage): StorageTransactionResult {
  const read = readStorageValue(STORAGE_TRANSACTION_KEY, storage)
  if (!read.ok) return read
  if (read.value === null) return { ok: true }
  let value: unknown
  try { value = JSON.parse(read.value) } catch { value = null }
  if (!isJournal(value)) {
    const discarded = removeStorageValue(STORAGE_TRANSACTION_KEY, storage)
    return discarded.ok ? { ok: true, recovered: 'discarded' } : discarded
  }
  const forward = applyMutations(value.mutations, 'after', storage)
  if (forward.ok) {
    const cleared = removeStorageValue(STORAGE_TRANSACTION_KEY, storage)
    return cleared.ok ? { ok: true, recovered: 'forward' } : cleared
  }
  const rollback = applyMutations(value.mutations, 'before', storage)
  if (!rollback.ok) return rollback
  const cleared = removeStorageValue(STORAGE_TRANSACTION_KEY, storage)
  return cleared.ok ? { ok: true, recovered: 'rollback', error: forward.error } : cleared
}

export function executeStorageTransaction(id: string, changes: readonly { key: string; after: string | null }[], storage: Storage = localStorage): StorageTransactionResult {
  const recovered = recoverStorageTransaction(storage)
  if (!recovered.ok) return recovered
  const mutations: StorageMutation[] = []
  const seen = new Set<string>()
  for (const change of changes) {
    if (change.key === STORAGE_TRANSACTION_KEY || seen.has(change.key)) continue
    seen.add(change.key)
    const current = readStorageValue(change.key, storage)
    if (!current.ok) return current
    if (current.value !== change.after) mutations.push({ key: change.key, before: current.value, after: change.after })
  }
  if (!mutations.length) return { ok: true }
  const journal: StorageTransactionJournal = { saveVersion: 1, id, kind: id.split(':', 1)[0] || 'generic', mutations }
  const serialisedJournal = JSON.stringify(journal)
  const prepared = writeStorageValue(STORAGE_TRANSACTION_KEY, serialisedJournal, storage)
  if (!prepared.ok) return prepared
  for (const mutation of mutations) {
    const ownership = readStorageValue(STORAGE_TRANSACTION_KEY, storage)
    if (!ownership.ok) return ownership
    if (ownership.value !== serialisedJournal) return { ok: false, error: { kind: 'verification', operation: 'write', key: STORAGE_TRANSACTION_KEY } }
    const applied = applyStorageValue(mutation.key, mutation.after, storage)
    if (!applied.ok) {
      const stillOwned = readStorageValue(STORAGE_TRANSACTION_KEY, storage)
      if (stillOwned.ok && stillOwned.value === serialisedJournal) {
        const rollback = applyMutations(mutations, 'before', storage)
        if (rollback.ok) removeStorageValue(STORAGE_TRANSACTION_KEY, storage)
      }
      return applied
    }
  }
  const ownership = readStorageValue(STORAGE_TRANSACTION_KEY, storage)
  if (!ownership.ok) return ownership
  if (ownership.value !== serialisedJournal) return { ok: false, error: { kind: 'verification', operation: 'remove', key: STORAGE_TRANSACTION_KEY } }
  const cleared = removeStorageValue(STORAGE_TRANSACTION_KEY, storage)
  return cleared.ok ? { ok: true } : cleared
}
