import { isDifficultyRating } from '../difficulty'
import { generateInfiniteCase } from '../infinite/generator'
import type { GeneratedProceduralCase } from '../generation/proceduralCase'
import type { DifficultyRating, GameCase } from '../types'
import { isDifficultyUnlocked, type NormalModeProgress } from './normalProgress'
import { createProceduralCaseSnapshot, restoreProceduralCaseSnapshot, type ProceduralCaseSnapshot } from './proceduralSnapshot'
import { readStorageValue, removeStorageValue, replaceStorageValue } from './storageAdapter'

export interface LegacyInfiniteSession { saveVersion: 1; generationVersion: 1; difficulty: DifficultyRating; seed: number; status: InfiniteSessionStatus }
interface StoredInfiniteSession { saveVersion: 2; status: InfiniteSessionStatus; snapshot: ProceduralCaseSnapshot }
export type InfiniteSessionStatus = 'active' | 'completed'

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
export type InfiniteSnapshotConfirmationResult =
  | { ok: true; session: InfiniteSession }
  | { ok: false; kind: 'storage' | 'validation' | 'locked' | 'legacy' }
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

function storeSnapshot(
  snapshot: ProceduralCaseSnapshot,
  expected: { difficulty: DifficultyRating; seed: number; status: InfiniteSessionStatus },
  storage: Storage,
): InfiniteSnapshotConfirmationResult {
  try {
    const restored = restoreProceduralCaseSnapshot(snapshot, { mode: 'infinite', difficulty: expected.difficulty, originalSeed: expected.seed })
    if (!restored) return { ok: false, kind: 'validation' }
    const stored: StoredInfiniteSession = { saveVersion: 2, status: expected.status, snapshot }
    if (!replaceStorageValue(INFINITE_SESSION_KEY, JSON.stringify(stored), storage).ok) return { ok: false, kind: 'storage' }
    return { ok: true, session: toRuntimeSession(expected.status, restored.snapshot, restored.caseData) }
  } catch {
    return { ok: false, kind: 'storage' }
  }
}

export function generateInfiniteSnapshot(
  difficulty: DifficultyRating,
  seed: number,
  generate: InfiniteCaseGenerator = generateInfiniteCase,
): ProceduralCaseSnapshot {
  return createProceduralCaseSnapshot('infinite', generate({ difficulty, seed }))
}

function persistSnapshot(generated: GeneratedProceduralCase, status: InfiniteSessionStatus, storage: Storage): InfiniteSession | null {
  const result = storeSnapshot(createProceduralCaseSnapshot('infinite', generated), { difficulty: generated.caseData.difficulty, seed: generated.baseSeed, status }, storage)
  return result.ok ? result.session : null
}

function isLegacyInfiniteSession(value: unknown): value is LegacyInfiniteSession {
  if (!isRecord(value)) return false
  return value.saveVersion === 1 && value.generationVersion === 1 && isDifficultyRating(value.difficulty) && validSeed(value.seed) && validStatus(value.status)
}

export function getPendingLegacyInfiniteSession(storage: Storage = localStorage): LegacyInfiniteSession | null {
  const read = readStorageValue(INFINITE_SESSION_KEY, storage)
  if (!read.ok) return null
  try {
    const value: unknown = JSON.parse(read.value ?? 'null')
    return isLegacyInfiniteSession(value) ? value : null
  } catch { return null }
}

export function discardLegacyInfiniteSession(expected: LegacyInfiniteSession, storage: Storage = localStorage): boolean {
  const current = getPendingLegacyInfiniteSession(storage)
  if (!current || current.difficulty !== expected.difficulty || current.seed !== expected.seed || current.status !== expected.status) return false
  return removeStorageValue(INFINITE_SESSION_KEY, storage).ok
}

export function confirmInfiniteSessionFromSnapshot(
  difficulty: DifficultyRating,
  seed: number,
  progress: NormalModeProgress,
  snapshot: ProceduralCaseSnapshot,
  storage: Storage = localStorage,
): InfiniteSnapshotConfirmationResult {
  const read = readStorageValue(INFINITE_SESSION_KEY, storage)
  if (!read.ok) return { ok: false, kind: 'storage' }
  let value: unknown
  try { value = JSON.parse(read.value ?? 'null') } catch { value = null }
  if (isRecord(value) && value.saveVersion === 2) {
    if (validStatus(value.status)) {
      const restored = restoreProceduralCaseSnapshot(value.snapshot, { mode: 'infinite' })
      if (restored) return { ok: true, session: toRuntimeSession(value.status, restored.snapshot, restored.caseData) }
    }
  } else if (isLegacyInfiniteSession(value)) return { ok: false, kind: 'legacy' }
  if (!validSeed(seed) || !isDifficultyUnlocked(difficulty, progress)) return { ok: false, kind: 'locked' }
  return storeSnapshot(snapshot, { difficulty, seed, status: 'active' }, storage)
}

export function migrateLegacyInfiniteSessionFromSnapshot(
  legacy: LegacyInfiniteSession,
  snapshot: ProceduralCaseSnapshot,
  storage: Storage = localStorage,
): InfiniteSnapshotConfirmationResult {
  const current = getPendingLegacyInfiniteSession(storage)
  if (!current || current.difficulty !== legacy.difficulty || current.seed !== legacy.seed || current.status !== legacy.status) return { ok: false, kind: 'legacy' }
  return storeSnapshot(snapshot, { difficulty: legacy.difficulty, seed: legacy.seed, status: legacy.status }, storage)
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
    if (!replaceStorageValue(INFINITE_SESSION_KEY, JSON.stringify(stored), storage).ok) return null
    return { ...session, status: 'completed' }
  } catch { return null }
}

export function clearInfiniteSession(storage: Storage = localStorage) { return removeStorageValue(INFINITE_SESSION_KEY, storage) }
export function createInfiniteSeed(excludedSeed?: number) { for (let attempt = 0; attempt < 8; attempt += 1) { const value = new Uint32Array(1); crypto.getRandomValues(value); if (value[0] !== excludedSeed) return value[0] } throw new Error('Could not create a new infinite seed.') }
