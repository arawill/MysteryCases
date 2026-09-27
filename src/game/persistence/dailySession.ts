import { getDateForDailyKey } from '../daily/date'
import { generateDailyCase, type GeneratedDailyCase } from '../daily/generator'
import { isDifficultyRating } from '../difficulty'
import type { DifficultyRating, GameCase } from '../types'
import { isDifficultyUnlocked, type NormalModeProgress } from './normalProgress'
import { createProceduralCaseSnapshot, restoreProceduralCaseSnapshot, type ProceduralCaseSnapshot } from './proceduralSnapshot'
import { getAttemptKey } from './storageCatalog'
import { getCaseSaveKey } from './caseSave'
import { executeStorageTransaction } from './storageTransaction'
import { replaceStorageValue } from './storageAdapter'

interface LegacyDailySession { saveVersion: 1; dateKey: string; difficulty: DifficultyRating }
interface StoredDailySession { saveVersion: 2; snapshot: ProceduralCaseSnapshot }

export interface DailySession {
  saveVersion: 2
  mode: 'daily'
  snapshotFormatVersion: number
  generatorVersion: number
  dateKey: string
  difficulty: DifficultyRating
  seed: number
  effectiveSeed: number
  seedOffset: number
  killerId: string
  caseData: GameCase
  snapshot: ProceduralCaseSnapshot
}

export type DailyCaseGenerator = (date: Date, difficulty: DifficultyRating) => GeneratedDailyCase
export const DAILY_SESSION_KEY = 'mystery-cases-daily-session'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const removeSafely = (storage: Storage) => { try { storage.removeItem(DAILY_SESSION_KEY) } catch { /* Ignore unavailable storage. */ } }

function toRuntimeSession(snapshot: ProceduralCaseSnapshot, caseData: GameCase): DailySession {
  return {
    saveVersion: 2,
    mode: 'daily',
    snapshotFormatVersion: snapshot.formatVersion,
    generatorVersion: snapshot.generatorVersion,
    dateKey: snapshot.dailyDateKey!,
    difficulty: snapshot.difficulty,
    seed: snapshot.originalSeed,
    effectiveSeed: snapshot.effectiveSeed,
    seedOffset: snapshot.seedOffset,
    killerId: snapshot.killerId,
    caseData,
    snapshot,
  }
}

function persistSnapshot(generated: GeneratedDailyCase, storage: Storage): DailySession | null {
  try {
    const snapshot = createProceduralCaseSnapshot('daily', generated, { dailyDateKey: generated.dateKey })
    const stored: StoredDailySession = { saveVersion: 2, snapshot }
    if (!replaceStorageValue(DAILY_SESSION_KEY, JSON.stringify(stored), storage).ok) return null
    return toRuntimeSession(snapshot, generated.caseData)
  } catch {
    return null
  }
}

function isLegacyDailySession(value: unknown): value is LegacyDailySession {
  if (!isRecord(value)) return false
  return value.saveVersion === 1 && typeof value.dateKey === 'string' && getDateForDailyKey(value.dateKey) !== null && isDifficultyRating(value.difficulty)
}

export function loadDailySession(_date: Date, storage: Storage = localStorage, generate: DailyCaseGenerator = generateDailyCase): DailySession | null {
  let value: unknown
  try { value = JSON.parse(storage.getItem(DAILY_SESSION_KEY) ?? 'null') } catch { removeSafely(storage); return null }
  if (isRecord(value) && value.saveVersion === 2) {
    const restored = restoreProceduralCaseSnapshot(value.snapshot, { mode: 'daily' })
    if (restored) return toRuntimeSession(restored.snapshot, restored.caseData)
    removeSafely(storage)
    return null
  }
  if (!isLegacyDailySession(value)) return null
  try {
    const legacyDate = getDateForDailyKey(value.dateKey)
    const migrated = legacyDate ? persistSnapshot(generate(legacyDate, value.difficulty), storage) : null
    if (migrated) return migrated
  } catch { /* A legacy case without a safe reconstruction is discarded below. */ }
  removeSafely(storage)
  return null
}

export function startDailySession(
  date: Date,
  difficulty: DifficultyRating,
  progress: NormalModeProgress,
  storage: Storage = localStorage,
  generate: DailyCaseGenerator = generateDailyCase,
): DailySession | null {
  const existing = loadDailySession(date, storage, generate)
  if (existing) return existing
  if (!isDifficultyUnlocked(difficulty, progress)) return null
  try { return persistSnapshot(generate(date, difficulty), storage) } catch { return null }
}

export function abandonDailySession(storage: Storage = localStorage): boolean {
  const session = loadDailySession(new Date(), storage)
  if (!session) return true
  return executeStorageTransaction(`abandon:${session.caseData.id}`, [
    { key: DAILY_SESSION_KEY, after: null },
    { key: getCaseSaveKey(session.caseData.id), after: null },
    { key: getAttemptKey(session.caseData.id), after: null },
  ], storage).ok
}
