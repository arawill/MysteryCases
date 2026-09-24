import { getDailyDateKey } from '../daily/date'
import { generateDailyCase, type GeneratedDailyCase } from '../daily/generator'
import { isDifficultyRating } from '../difficulty'
import type { DifficultyRating, GameCase } from '../types'
import { isDifficultyUnlocked, type NormalModeProgress } from './normalProgress'
import { createProceduralCaseSnapshot, restoreProceduralCaseSnapshot, type ProceduralCaseSnapshot } from './proceduralSnapshot'

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
    storage.setItem(DAILY_SESSION_KEY, JSON.stringify(stored))
    return toRuntimeSession(snapshot, generated.caseData)
  } catch {
    return null
  }
}

function isLegacyDailySession(value: unknown, dateKey: string): value is LegacyDailySession {
  if (!isRecord(value)) return false
  return value.saveVersion === 1 && value.dateKey === dateKey && isDifficultyRating(value.difficulty)
}

export function loadDailySession(date: Date, storage: Storage = localStorage, generate: DailyCaseGenerator = generateDailyCase): DailySession | null {
  const dateKey = getDailyDateKey(date)
  let value: unknown
  try { value = JSON.parse(storage.getItem(DAILY_SESSION_KEY) ?? 'null') } catch { return null }
  if (isRecord(value) && value.saveVersion === 2) {
    const restored = restoreProceduralCaseSnapshot(value.snapshot, { mode: 'daily', dailyDateKey: dateKey })
    return restored ? toRuntimeSession(restored.snapshot, restored.caseData) : null
  }
  if (!isLegacyDailySession(value, dateKey)) return null
  try {
    const migrated = persistSnapshot(generate(date, value.difficulty), storage)
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
