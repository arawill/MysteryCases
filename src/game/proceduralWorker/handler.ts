import { getDateForDailyKey } from '../daily/date'
import { generateDailyCase } from '../daily/generator'
import { generateInfiniteCase } from '../infinite/generator'
import { createProceduralCaseSnapshot, restoreProceduralCaseSnapshot } from '../persistence/proceduralSnapshot'
import {
  PROCEDURAL_WORKER_PROTOCOL_VERSION,
  invalidRequestResponse,
  parseGenerateRequest,
  type GenerateRequest,
  type GenerateResponse,
  type WorkerMetrics,
} from './protocol'

export interface ProceduralWorkerHandlerDependencies {
  now(): number
  generateDaily: typeof generateDailyCase
  generateInfinite: typeof generateInfiniteCase
  restoreSnapshot: typeof restoreProceduralCaseSnapshot
}

const defaultDependencies: ProceduralWorkerHandlerDependencies = {
  now: () => performance.now(),
  generateDaily: generateDailyCase,
  generateInfinite: generateInfiniteCase,
  restoreSnapshot: restoreProceduralCaseSnapshot,
}

const validDuration = (value: number) => Number.isFinite(value) && value >= 0

function successResponse(
  request: GenerateRequest,
  snapshot: ReturnType<typeof createProceduralCaseSnapshot>,
  expectedOriginalSeed: number,
  timing: { startedAt: number; generationStartedAt: number; generationEndedAt: number },
  dependencies: ProceduralWorkerHandlerDependencies,
): GenerateResponse {
  const restored = dependencies.restoreSnapshot(snapshot, {
    mode: request.mode,
    ...(request.mode === 'daily' ? { dailyDateKey: request.dateKey } : {}),
    difficulty: request.difficulty,
    originalSeed: expectedOriginalSeed,
  })
  if (!restored) throw new Error('Invalid procedural Worker snapshot.')
  const response: Extract<GenerateResponse, { ok: true }> = {
    protocolVersion: PROCEDURAL_WORKER_PROTOCOL_VERSION,
    requestId: request.requestId,
    ok: true,
    snapshot,
  }
  const endedAt = dependencies.now()
  if (!request.includeMetrics) return response
  const metrics: WorkerMetrics = {
    generationMilliseconds: timing.generationEndedAt - timing.generationStartedAt,
    snapshotMilliseconds: endedAt - timing.generationEndedAt,
    totalMilliseconds: endedAt - timing.startedAt,
  }
  if (!validDuration(metrics.generationMilliseconds) || !validDuration(metrics.snapshotMilliseconds) || !validDuration(metrics.totalMilliseconds)) throw new Error('Invalid procedural Worker metrics.')
  return { ...response, metrics }
}

export function handleGenerateRequest(value: unknown, dependencies: ProceduralWorkerHandlerDependencies = defaultDependencies): GenerateResponse {
  const request = parseGenerateRequest(value)
  if (!request) return invalidRequestResponse(value)
  const startedAt = dependencies.now()
  try {
    const generationStartedAt = dependencies.now()
    if (request.mode === 'daily') {
      const date = getDateForDailyKey(request.dateKey)
      if (!date) return invalidRequestResponse(request)
      const generated = dependencies.generateDaily(date, request.difficulty)
      const generationEndedAt = dependencies.now()
      const snapshot = createProceduralCaseSnapshot('daily', generated, { dailyDateKey: request.dateKey })
      return successResponse(request, snapshot, generated.baseSeed, { startedAt, generationStartedAt, generationEndedAt }, dependencies)
    }
    const generated = dependencies.generateInfinite({ difficulty: request.difficulty, seed: request.seed })
    const generationEndedAt = dependencies.now()
    const snapshot = createProceduralCaseSnapshot('infinite', generated)
    return successResponse(request, snapshot, request.seed, { startedAt, generationStartedAt, generationEndedAt }, dependencies)
  } catch {
    return {
      protocolVersion: PROCEDURAL_WORKER_PROTOCOL_VERSION,
      requestId: request.requestId,
      ok: false,
      error: { code: 'GENERATION_FAILED', message: 'No se pudo generar el caso.', retryable: true },
    }
  }
}

export function createProceduralWorkerDispatcher(dependencies: ProceduralWorkerHandlerDependencies = defaultDependencies) {
  const seenRequestIds = new Set<string>()
  return (value: unknown): GenerateResponse => {
    const request = parseGenerateRequest(value)
    if (!request) return invalidRequestResponse(value)
    if (seenRequestIds.has(request.requestId)) return invalidRequestResponse(request, 'DUPLICATE_REQUEST_ID', 'La solicitud ya fue procesada.')
    seenRequestIds.add(request.requestId)
    return handleGenerateRequest(request, dependencies)
  }
}
