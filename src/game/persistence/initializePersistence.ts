import { loadInfiniteSession } from './infiniteSession'
import { cleanupDailyRetention } from './dailyRetention'
import { recoverStorageTransaction } from './storageTransaction'

export function initializePersistence(now: Date = new Date(), storage: Storage = localStorage): boolean {
  const recovered = recoverStorageTransaction(storage)
  if (!recovered.ok) return false
  loadInfiniteSession(storage)
  return cleanupDailyRetention(now, storage).ok
}
