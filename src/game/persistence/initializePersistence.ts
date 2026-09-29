import { recoverStorageTransaction } from './storageTransaction'

export function initializePersistence(now: Date = new Date(), storage: Storage = localStorage): boolean {
  void now
  const recovered = recoverStorageTransaction(storage)
  return recovered.ok
}
