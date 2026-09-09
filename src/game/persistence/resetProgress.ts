import { DAILY_SESSION_KEY } from './dailySession'
import { INFINITE_SESSION_KEY } from './infiniteSession'
import { NORMAL_PROGRESS_KEY } from './normalProgress'
import { PLAYER_STATS_KEY } from './playerStats'
import { PROGRESS_KEY } from './progress'

const fixedProgressKeys = new Set([PROGRESS_KEY, NORMAL_PROGRESS_KEY, DAILY_SESSION_KEY, INFINITE_SESSION_KEY, PLAYER_STATS_KEY])

const isCaseSaveKey = (key: string) =>
  key === 'mystery-cases-case001' ||
  /^mystery-cases-normal-d[1-5]-c\d+(?:-g\d+)?$/.test(key) ||
  /^mystery-cases-daily-\d{4}-\d{2}-\d{2}(?:-d[1-5])?(?:-g\d+)?$/.test(key) ||
  /^mystery-cases-infinite-d[1-5]-s\d+(?:-g\d+)?$/.test(key)

/** Removes only persisted game progress and case saves, leaving player settings and foreign keys intact. */
export function resetAllProgress(storage: Storage = localStorage) {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => key !== null)
  const toRemove = keys.filter(key => fixedProgressKeys.has(key) || isCaseSaveKey(key))
  toRemove.forEach(key => storage.removeItem(key))
}
