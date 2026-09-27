import type { AchievementDefinition } from '../achievements/catalog'
import { reconcileCurrentAchievements } from '../achievements/runtime'
import { getDailyCaseIdFromKey } from '../daily/date'
import { getInfiniteCaseId } from '../infinite/generator'
import type { DifficultyRating } from '../types'
import { getAttemptKey } from './storageCatalog'
import { getCaseSaveKey } from './caseSave'
import { loadInfiniteSession, markInfiniteSessionCompleted } from './infiniteSession'
import { recordInvestigationCompletion, type InvestigationAssistUsage } from './investigationHistory'
import { markNormalCaseCompleted } from './normalProgress'
import { recordInfiniteCompletion } from './playerStats'
import { markCaseCompleted } from './progress'
import { DAILY_SESSION_KEY, loadDailySession } from './dailySession'
import { ACHIEVEMENT_PROGRESS_KEY } from './achievementProgress'
import { INFINITE_SESSION_KEY } from './infiniteSession'
import { INVESTIGATION_HISTORY_KEY } from './investigationHistory'
import { NORMAL_PROGRESS_KEY } from './normalProgress'
import { PLAYER_STATS_KEY } from './playerStats'
import { PROGRESS_KEY } from './progress'
import { loadCaseAttempt, type CaseAttempt } from './caseAttempt'
import { executeStorageTransaction, recoverStorageTransaction } from './storageTransaction'
import type { StorageFailure } from './storageAdapter'

export type CompletionIdentity =
  | { mode: 'normal'; logicalId: string; difficulty: DifficultyRating; caseNumber: number }
  | { mode: 'daily'; logicalId: string; difficulty: DifficultyRating; dateKey: string }
  | { mode: 'infinite'; logicalId: string; difficulty: DifficultyRating; seed: number }

export interface CompleteInvestigationInput {
  caseId: string
  attemptSequence: number
  identity: CompletionIdentity
  assists: Omit<InvestigationAssistUsage, 'total'>
}

export type CompleteInvestigationResult =
  | { ok: true; alreadyCompleted: boolean; newlyUnlocked: AchievementDefinition[] }
  | { ok: false; error: StorageFailure }

class SnapshotStorage implements Storage {
  private readonly values = new Map<string, string>()
  constructor(source: Storage) {
    for (let index = 0; index < source.length; index += 1) {
      const key = source.key(index)
      if (key !== null) { const value = source.getItem(key); if (value !== null) this.values.set(key, value) }
    }
  }
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

const completionKeys = (caseId: string) => [
  PROGRESS_KEY,
  NORMAL_PROGRESS_KEY,
  DAILY_SESSION_KEY,
  INFINITE_SESSION_KEY,
  PLAYER_STATS_KEY,
  INVESTIGATION_HISTORY_KEY,
  ACHIEVEMENT_PROGRESS_KEY,
  getCaseSaveKey(caseId),
  getAttemptKey(caseId),
]

const matchesIdentity = (identity: CompletionIdentity): boolean => {
  if (identity.mode === 'normal') return identity.logicalId === `normal-d${identity.difficulty}-c${String(identity.caseNumber).padStart(2, '0')}`
  if (identity.mode === 'daily') return identity.logicalId === getDailyCaseIdFromKey(identity.dateKey)
  return identity.logicalId === getInfiniteCaseId(identity.difficulty, identity.seed)
}

const caseIdMatchesIdentity = (caseId: string, identity: CompletionIdentity): boolean => {
  if (identity.mode === 'daily') return caseId.startsWith(`${identity.logicalId}-d${identity.difficulty}-g`)
  if (identity.mode === 'infinite') return caseId.startsWith(`${identity.logicalId}-g`)
  if (identity.difficulty === 1) return caseId === `case${String(identity.caseNumber).padStart(3, '0')}` || caseId.startsWith(`${identity.logicalId}-g`)
  if (identity.difficulty === 2) return caseId === `case-d2-${String(identity.caseNumber).padStart(2, '0')}` || caseId.startsWith(`${identity.logicalId}-g`)
  return caseId.startsWith(`${identity.logicalId}-g`)
}

export function completeInvestigation(input: CompleteInvestigationInput, storage: Storage = localStorage, now: Date = new Date()): CompleteInvestigationResult {
  if (!matchesIdentity(input.identity) || !caseIdMatchesIdentity(input.caseId, input.identity) || !Number.isSafeInteger(input.attemptSequence) || input.attemptSequence < 1) {
    return { ok: false, error: { kind: 'verification', operation: 'write', key: getAttemptKey(input.caseId) } }
  }
  const recovered = recoverStorageTransaction(storage)
  if (!recovered.ok) return { ok: false, error: recovered.error! }
  const attempt = loadCaseAttempt(input.caseId, storage)
  if (!attempt || attempt.sequence !== input.attemptSequence) return { ok: false, error: { kind: 'verification', operation: 'write', key: getAttemptKey(input.caseId) } }
  if (attempt.status === 'completed') return { ok: true, alreadyCompleted: true, newlyUnlocked: [] }

  let draft: SnapshotStorage
  try { draft = new SnapshotStorage(storage) } catch { return { ok: false, error: { kind: 'unavailable', operation: 'read', key: getAttemptKey(input.caseId) } } }
  if (input.identity.mode === 'normal') markNormalCaseCompleted(input.identity.difficulty, input.identity.caseNumber, draft)
  if (input.identity.mode === 'daily') {
    const session = loadDailySession(now, draft)
    if (!session || session.caseData.id !== input.caseId || session.dateKey !== input.identity.dateKey || session.difficulty !== input.identity.difficulty) return { ok: false, error: { kind: 'verification', operation: 'write', key: DAILY_SESSION_KEY } }
    markCaseCompleted(input.identity.logicalId, draft)
    draft.removeItem(DAILY_SESSION_KEY)
    draft.removeItem(getCaseSaveKey(input.caseId))
  }
  if (input.identity.mode === 'infinite') {
    const session = loadInfiniteSession(draft)
    if (!session || session.caseData.id !== input.caseId || session.seed !== input.identity.seed || session.difficulty !== input.identity.difficulty) return { ok: false, error: { kind: 'verification', operation: 'write', key: INFINITE_SESSION_KEY } }
    markInfiniteSessionCompleted(draft)
    recordInfiniteCompletion(input.identity.logicalId, draft)
  }
  recordInvestigationCompletion({ mode: input.identity.mode, logicalId: input.identity.logicalId, difficulty: input.identity.difficulty, assists: input.assists }, draft, now)
  if (input.identity.mode === 'normal') draft.removeItem(getCaseSaveKey(input.caseId))
  const achievementResult = reconcileCurrentAchievements(draft, now)
  const completedAttempt: CaseAttempt = { ...attempt, status: 'completed' }
  draft.setItem(getAttemptKey(input.caseId), JSON.stringify(completedAttempt))

  const changes = completionKeys(input.caseId).map(key => ({ key, after: draft.getItem(key) }))
  const transaction = executeStorageTransaction(`complete:${input.caseId}:${input.attemptSequence}`, changes, storage)
  return transaction.ok
    ? { ok: true, alreadyCompleted: false, newlyUnlocked: [...achievementResult.newlyUnlocked] }
    : { ok: false, error: transaction.error! }
}
