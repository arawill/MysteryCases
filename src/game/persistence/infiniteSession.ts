import { isDifficultyRating } from '../difficulty'
import { generateInfiniteCase } from '../infinite/generator'
import type { GeneratedProceduralCase } from '../generation/proceduralCase'
import type { DifficultyRating, GameCase } from '../types'
import { isDifficultyUnlocked, type NormalModeProgress } from './normalProgress'
import { createProceduralCaseSnapshot, restoreProceduralCaseSnapshot, type ProceduralCaseSnapshot } from './proceduralSnapshot'

interface LegacyInfiniteSession { saveVersion: 1; generationVersion: 1; difficulty: DifficultyRating; seed: number; status: InfiniteSessionStatus }
interface StoredInfiniteSession { saveVersion: 2; status: InfiniteSessionStatus; snapshot: ProceduralCaseSnapshot }
type InfiniteSessionStatus = 'active' | 'completed'

export interface InfiniteSession {
  saveVersion: 2
  mode: 'infinite'
  snapshotFormatVersion: number
  generationVersion: number
  difficulty: DifficultyRating
  seed: number
  status: InfiniteSessionStatus
  effectiveSeed: number
  seedOffset: number
  killerId: string
  caseData: GameCase
  snapshot: ProceduralCaseSnapshot
}

export type InfiniteCaseGenerator = (request: { difficulty: DifficultyRating; seed: number }) => GeneratedProceduralCase
export const INFINITE_SESSION_KEY = 'mystery-cases-infinite-session'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const validSeed = (seed: unknown): seed is number => Number.isInteger(seed) && (seed as number) >= 0 && (seed as number) <= 0xFFFFFFFF
const validStatus = (status: unknown): status is InfiniteSessionStatus => status === 'active' || status === 'completed'
const removeSafely = (storage: Storage) => { try { storage.removeItem(INFINITE_SESSION_KEY) } catch { /* Ignore unavailable storage. */ } }

function toRuntimeSession(status: InfiniteSessionStatus, snapshot: ProceduralCaseSnapshot, caseData: GameCase): InfiniteSession {
  return {
    saveVersion: 2,
    mode: 'infinite',
    snapshotFormatVersion: snapshot.formatVersion,
    generationVersion: snapshot.generatorVersion,
    difficulty: snapshot.difficulty,
    seed: snapshot.originalSeed,
    status,
    effectiveSeed: snapshot.effectiveSeed,
    seedOffset: snapshot.seedOffset,
    killerId: snapshot.killerId,
    caseData,
    snapshot,
  }
}

function persistSnapshot(generated: GeneratedProceduralCase, status: InfiniteSessionStatus, storage: Storage): InfiniteSession | null {
  try {
    const snapshot = createProceduralCaseSnapshot('infinite', generated)
    const stored: StoredInfiniteSession = { saveVersion: 2, status, snapshot }
    storage.setItem(INFINITE_SESSION_KEY, JSON.stringify(stored))
    return toRuntimeSession(status, snapshot, generated.caseData)
  } catch {
    return null
  }
}

function isLegacyInfiniteSession(value: unknown): value is LegacyInfiniteSession {
  if (!isRecord(value)) return false
  return value.saveVersion === 1 && value.generationVersion === 1 && isDifficultyRating(value.difficulty) && validSeed(value.seed) && validStatus(value.status)
}

export function loadInfiniteSession(storage: Storage = localStorage, generate: InfiniteCaseGenerator = generateInfiniteCase): InfiniteSession | null {
  let value: unknown
  try { value = JSON.parse(storage.getItem(INFINITE_SESSION_KEY) ?? 'null') } catch { return null }
  if (isRecord(value) && value.saveVersion === 2) {
    if (!validStatus(value.status)) return null
    const restored = restoreProceduralCaseSnapshot(value.snapshot, { mode: 'infinite' })
    return restored ? toRuntimeSession(value.status, restored.snapshot, restored.caseData) : null
  }
  if (!isLegacyInfiniteSession(value)) return null
  try {
    const migrated = persistSnapshot(generate({ difficulty: value.difficulty, seed: value.seed }), value.status, storage)
    if (migrated) return migrated
  } catch { /* A legacy case without a safe reconstruction is discarded below. */ }
  removeSafely(storage)
  return null
}

export function startInfiniteSession(
  difficulty: DifficultyRating,
  seed: number,
  progress: NormalModeProgress,
  storage: Storage = localStorage,
  generate: InfiniteCaseGenerator = generateInfiniteCase,
): InfiniteSession | null {
  const existing = loadInfiniteSession(storage, generate)
  if (existing) return existing
  if (!validSeed(seed) || !isDifficultyUnlocked(difficulty, progress)) return null
  try { return persistSnapshot(generate({ difficulty, seed }), 'active', storage) } catch { return null }
}

export function markInfiniteSessionCompleted(storage: Storage = localStorage): InfiniteSession | null {
  const session = loadInfiniteSession(storage)
  if (!session) return null
  try {
    const stored: StoredInfiniteSession = { saveVersion: 2, status: 'completed', snapshot: session.snapshot }
    storage.setItem(INFINITE_SESSION_KEY, JSON.stringify(stored))
    return { ...session, status: 'completed' }
  } catch { return null }
}

export function clearInfiniteSession(storage: Storage = localStorage) { storage.removeItem(INFINITE_SESSION_KEY) }
export function createInfiniteSeed(excludedSeed?: number) { for (let attempt = 0; attempt < 8; attempt += 1) { const value = new Uint32Array(1); crypto.getRandomValues(value); if (value[0] !== excludedSeed) return value[0] } throw new Error('Could not create a new infinite seed.') }
