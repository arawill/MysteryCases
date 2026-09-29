import { parseDailyDateKey } from '../daily/date'
import { isDifficultyRating } from '../difficulty'
import { restoreProceduralCaseSnapshot, type ProceduralCaseSnapshot } from '../persistence/proceduralSnapshot'
import type { DifficultyRating } from '../types'

export const PROCEDURAL_WORKER_PROTOCOL_VERSION = 1 as const

export interface WorkerMetrics {
  generationMilliseconds: number
  snapshotMilliseconds: number
  totalMilliseconds: number
}

export interface DailyGenerateRequest {
  protocolVersion: typeof PROCEDURAL_WORKER_PROTOCOL_VERSION
  requestId: string
  mode: 'daily'
  dateKey: string
  difficulty: DifficultyRating
  includeMetrics?: boolean
}

export interface InfiniteGenerateRequest {
  protocolVersion: typeof PROCEDURAL_WORKER_PROTOCOL_VERSION
  requestId: string
  mode: 'infinite'
  seed: number
  difficulty: DifficultyRating
  includeMetrics?: boolean
}

export type GenerateRequest = DailyGenerateRequest | InfiniteGenerateRequest

export type GenerateResponse =
  | {
      protocolVersion: typeof PROCEDURAL_WORKER_PROTOCOL_VERSION
      requestId: string
      ok: true
      snapshot: ProceduralCaseSnapshot
      metrics?: WorkerMetrics
    }
  | {
      protocolVersion: typeof PROCEDURAL_WORKER_PROTOCOL_VERSION
      requestId: string
      ok: false
      error: { code: string; message: string; retryable: boolean }
    }

export interface WorkerReadyMessage {
  protocolVersion: typeof PROCEDURAL_WORKER_PROTOCOL_VERSION
  type: 'ready'
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isUint32 = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 0xFFFFFFFF
const hasOnlyKeys = (value: Record<string, unknown>, allowed: readonly string[]) => Object.keys(value).every(key => allowed.includes(key))
const validRequestId = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 160
const validOptionalMetricsFlag = (value: unknown) => value === undefined || typeof value === 'boolean'
const finiteDuration = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0

export function parseGenerateRequest(value: unknown): GenerateRequest | null {
  if (!isRecord(value) || value.protocolVersion !== PROCEDURAL_WORKER_PROTOCOL_VERSION || !validRequestId(value.requestId) || !isDifficultyRating(value.difficulty) || !validOptionalMetricsFlag(value.includeMetrics)) return null
  if (value.mode === 'daily') {
    if (!hasOnlyKeys(value, ['protocolVersion', 'requestId', 'mode', 'dateKey', 'difficulty', 'includeMetrics'])) return null
    return typeof value.dateKey === 'string' && parseDailyDateKey(value.dateKey) ? value as unknown as DailyGenerateRequest : null
  }
  if (value.mode === 'infinite') {
    if (!hasOnlyKeys(value, ['protocolVersion', 'requestId', 'mode', 'seed', 'difficulty', 'includeMetrics'])) return null
    return isUint32(value.seed) ? value as unknown as InfiniteGenerateRequest : null
  }
  return null
}

function parseMetrics(value: unknown): WorkerMetrics | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ['generationMilliseconds', 'snapshotMilliseconds', 'totalMilliseconds'])) return null
  return finiteDuration(value.generationMilliseconds) && finiteDuration(value.snapshotMilliseconds) && finiteDuration(value.totalMilliseconds)
    ? value as unknown as WorkerMetrics
    : null
}

export function parseGenerateResponse(value: unknown): GenerateResponse | null {
  if (!isRecord(value) || value.protocolVersion !== PROCEDURAL_WORKER_PROTOCOL_VERSION || !validRequestId(value.requestId) || typeof value.ok !== 'boolean') return null
  if (value.ok) {
    if (!hasOnlyKeys(value, ['protocolVersion', 'requestId', 'ok', 'snapshot', 'metrics'])) return null
    const restored = restoreProceduralCaseSnapshot(value.snapshot)
    if (!restored || (value.metrics !== undefined && !parseMetrics(value.metrics))) return null
    return value as unknown as GenerateResponse
  }
  if (!hasOnlyKeys(value, ['protocolVersion', 'requestId', 'ok', 'error']) || !isRecord(value.error) || !hasOnlyKeys(value.error, ['code', 'message', 'retryable'])) return null
  if (typeof value.error.code !== 'string' || !value.error.code || typeof value.error.message !== 'string' || !value.error.message || typeof value.error.retryable !== 'boolean') return null
  return value as unknown as GenerateResponse
}

export function parseWorkerReadyMessage(value: unknown): WorkerReadyMessage | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ['protocolVersion', 'type'])) return null
  return value.protocolVersion === PROCEDURAL_WORKER_PROTOCOL_VERSION && value.type === 'ready' ? value as unknown as WorkerReadyMessage : null
}

export function invalidRequestResponse(value: unknown, code = 'INVALID_REQUEST', message = 'La solicitud de generación no es válida.'): GenerateResponse {
  const requestId = isRecord(value) && validRequestId(value.requestId) ? value.requestId : 'invalid-request'
  return { protocolVersion: PROCEDURAL_WORKER_PROTOCOL_VERSION, requestId, ok: false, error: { code, message, retryable: false } }
}
