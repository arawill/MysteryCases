import { SETTINGS_KEY } from '../../theme'
import { parseDailyDateKey } from '../daily/date'

export const STORAGE_TRANSACTION_KEY = 'mystery-cases-storage-transaction'
export const CASE_SAVE_PREFIX = 'mystery-cases-'
export const CASE_ATTEMPT_PREFIX = 'mystery-cases-attempt-'

export const manualCaseIds = [
  ...Array.from({ length: 15 }, (_, index) => `case${String(index + 1).padStart(3, '0')}`),
  ...Array.from({ length: 6 }, (_, index) => `case-d2-${String(index + 1).padStart(2, '0')}`),
] as const

export const progressStorageKeys = [
  'mystery-cases-progress',
  'mystery-cases-normal-progress',
  'mystery-cases-daily-session',
  'mystery-cases-infinite-session',
  'mystery-cases-player-stats',
  'mystery-cases-investigation-history',
  'mystery-cases-achievements',
] as const

export type ManagedStorageKind = 'settings' | 'transaction' | 'progress' | 'case-save' | 'case-attempt' | 'unknown'

export interface StorageFamilyDefinition {
  id: 'manual-saves' | 'procedural-saves' | 'daily-session' | 'infinite-session' | 'progress' | 'statistics' | 'history-and-streaks' | 'achievements' | 'preferences' | 'transaction-journal' | 'reconstructible-caches'
  persistence: 'localStorage' | 'memory'
  reset: 'remove' | 'preserve' | 'rebuild'
  legacyVersions: readonly number[]
  notes: string
}

/** Ownership/lifecycle catalog. Dynamic keys still require the exact validators below. */
export const storageFamilies: readonly StorageFamilyDefinition[] = [
  { id: 'manual-saves', persistence: 'localStorage', reset: 'remove', legacyVersions: [1, 2, 3], notes: 'CaseSave V4 for the 21 exact published manual IDs.' },
  { id: 'procedural-saves', persistence: 'localStorage', reset: 'remove', legacyVersions: [1, 2, 3], notes: 'CaseSave V4 for validated Normal, Daily and Infinite generated IDs.' },
  { id: 'daily-session', persistence: 'localStorage', reset: 'remove', legacyVersions: [1], notes: 'V2 envelope containing a V1 procedural snapshot.' },
  { id: 'infinite-session', persistence: 'localStorage', reset: 'remove', legacyVersions: [1], notes: 'V2 envelope containing a V1 procedural snapshot.' },
  { id: 'progress', persistence: 'localStorage', reset: 'remove', legacyVersions: [1], notes: 'Global V1 and Normal V2 mutable progress.' },
  { id: 'statistics', persistence: 'localStorage', reset: 'remove', legacyVersions: [], notes: 'Infinite IDs and assist counters; reset promise includes statistics.' },
  { id: 'history-and-streaks', persistence: 'localStorage', reset: 'remove', legacyVersions: [], notes: 'Investigation history from which Daily streaks are derived.' },
  { id: 'achievements', persistence: 'localStorage', reset: 'remove', legacyVersions: [], notes: 'Bounded achievement unlock records.' },
  { id: 'preferences', persistence: 'localStorage', reset: 'preserve', legacyVersions: [], notes: `Settings at ${SETTINGS_KEY}; foreign preference keys are never claimed.` },
  { id: 'transaction-journal', persistence: 'localStorage', reset: 'remove', legacyVersions: [], notes: 'Versioned before/after journal and per-case attempt receipts.' },
  { id: 'reconstructible-caches', persistence: 'memory', reset: 'rebuild', legacyVersions: [], notes: 'Generator Maps and the service-worker asset cache are not user saves.' },
]

export function isManagedCaseId(caseId: string): boolean {
  if ((manualCaseIds as readonly string[]).includes(caseId) || /^normal-d[1-5]-c(?:0[1-9]|[1-7]\d|80)(?:-g\d+)?$/.test(caseId)) return true
  const daily = /^daily-(\d{4}-\d{2}-\d{2})-d[1-5](?:-g\d+)?$/.exec(caseId)
  if (daily) return parseDailyDateKey(daily[1]) !== null
  const infinite = /^infinite-d[1-5]-s(0|[1-9]\d*)(?:-g\d+)?$/.exec(caseId)
  if (!infinite) return false
  const seed = Number(infinite[1])
  return Number.isInteger(seed) && seed >= 0 && seed <= 0xffff_ffff
}

export function getAttemptKey(caseId: string): string { return `${CASE_ATTEMPT_PREFIX}${caseId}` }

export function getCaseIdFromSaveKey(key: string): string | null {
  if (!key.startsWith(CASE_SAVE_PREFIX) || key.startsWith(CASE_ATTEMPT_PREFIX)) return null
  const caseId = key.slice(CASE_SAVE_PREFIX.length)
  return isManagedCaseId(caseId) ? caseId : null
}

export function getCaseIdFromAttemptKey(key: string): string | null {
  if (!key.startsWith(CASE_ATTEMPT_PREFIX)) return null
  const caseId = key.slice(CASE_ATTEMPT_PREFIX.length)
  return isManagedCaseId(caseId) ? caseId : null
}

export function classifyStorageKey(key: string): ManagedStorageKind {
  if (key === SETTINGS_KEY) return 'settings'
  if (key === STORAGE_TRANSACTION_KEY) return 'transaction'
  if ((progressStorageKeys as readonly string[]).includes(key)) return 'progress'
  if (getCaseIdFromAttemptKey(key)) return 'case-attempt'
  if (getCaseIdFromSaveKey(key)) return 'case-save'
  return 'unknown'
}

export function listStorageKeys(storage: Storage): string[] {
  const keys: string[] = []
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key !== null) keys.push(key)
    }
  } catch { /* An unavailable store behaves like an empty catalog. */ }
  return keys
}

export function listResettableKeys(storage: Storage): string[] {
  return listStorageKeys(storage).filter(key => {
    const kind = classifyStorageKey(key)
    return kind === 'transaction' || kind === 'progress' || kind === 'case-save' || kind === 'case-attempt'
  })
}
