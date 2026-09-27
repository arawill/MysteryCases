import { listResettableKeys, STORAGE_TRANSACTION_KEY } from './storageCatalog'
import { removeStorageValue, type StorageFailure } from './storageAdapter'

/** Removes only persisted game progress and case saves, leaving player settings and foreign keys intact. */
export function resetAllProgress(storage: Storage = localStorage): { ok: boolean; removedKeys: string[]; failedKeys: string[]; error?: StorageFailure } {
  const targets = listResettableKeys(storage)
  const removedKeys: string[] = []
  const failedKeys: string[] = []
  if (targets.includes(STORAGE_TRANSACTION_KEY)) {
    const journal = removeStorageValue(STORAGE_TRANSACTION_KEY, storage)
    if (!journal.ok) return { ok: false, removedKeys, failedKeys: [STORAGE_TRANSACTION_KEY], error: journal.error }
    removedKeys.push(STORAGE_TRANSACTION_KEY)
  }
  for (const key of targets) {
    if (key === STORAGE_TRANSACTION_KEY) continue
    let result = removeStorageValue(key, storage)
    if (!result.ok) result = removeStorageValue(key, storage)
    if (result.ok) removedKeys.push(key)
    else failedKeys.push(key)
  }
  return { ok: failedKeys.length === 0, removedKeys, failedKeys }
}
