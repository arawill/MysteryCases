export type StorageFailureKind = 'quota' | 'unavailable' | 'verification'
export interface StorageFailure { kind: StorageFailureKind; operation: 'read' | 'write' | 'remove'; key: string }
export type StorageResult = { ok: true } | { ok: false; error: StorageFailure }

const failureKind = (error: unknown): StorageFailureKind => {
  if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) return 'quota'
  return 'unavailable'
}

export function readStorageValue(key: string, storage: Storage): { ok: true; value: string | null } | { ok: false; error: StorageFailure } {
  try { return { ok: true, value: storage.getItem(key) } } catch (error) { return { ok: false, error: { kind: failureKind(error), operation: 'read', key } } }
}

export function writeStorageValue(key: string, value: string, storage: Storage): StorageResult {
  try {
    storage.setItem(key, value)
    if (storage.getItem(key) !== value) return { ok: false, error: { kind: 'verification', operation: 'write', key } }
    return { ok: true }
  } catch (error) { return { ok: false, error: { kind: failureKind(error), operation: 'write', key } } }
}

export function removeStorageValue(key: string, storage: Storage): StorageResult {
  try {
    storage.removeItem(key)
    if (storage.getItem(key) !== null) return { ok: false, error: { kind: 'verification', operation: 'remove', key } }
    return { ok: true }
  } catch (error) { return { ok: false, error: { kind: failureKind(error), operation: 'remove', key } } }
}

export function applyStorageValue(key: string, value: string | null, storage: Storage): StorageResult {
  return value === null ? removeStorageValue(key, storage) : writeStorageValue(key, value, storage)
}

/** Replaces one value and best-effort restores its exact previous bytes if the write reports failure. */
export function replaceStorageValue(key: string, value: string, storage: Storage): StorageResult {
  const before = readStorageValue(key, storage)
  if (!before.ok) return before
  const result = writeStorageValue(key, value, storage)
  if (!result.ok) applyStorageValue(key, before.value, storage)
  return result
}
