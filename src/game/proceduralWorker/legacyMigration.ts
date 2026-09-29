import { getDateForDailyKey } from '../daily/date'
import {
  discardLegacyDailySession,
  generateDailySnapshot,
  getPendingLegacyDailySession,
  migrateLegacyDailySessionFromSnapshot,
  type LegacyDailySession,
} from '../persistence/dailySession'
import {
  discardLegacyInfiniteSession,
  generateInfiniteSnapshot,
  getPendingLegacyInfiniteSession,
  migrateLegacyInfiniteSessionFromSnapshot,
  type LegacyInfiniteSession,
} from '../persistence/infiniteSession'
import type { ProceduralCaseSnapshot } from '../persistence/proceduralSnapshot'
import { ProceduralWorkerCancelledError, ProceduralWorkerDomainError, ProceduralWorkerInfrastructureError, proceduralWorkerClient, type ProceduralWorkerClient } from './client'
import { PROCEDURAL_WORKER_PROTOCOL_VERSION, type GenerateRequest } from './protocol'
import { waitForPaintBeforeSynchronousWork } from './waitForPaint'

export type PendingLegacyMigration =
  | { mode: 'infinite'; session: LegacyInfiniteSession }
  | { mode: 'daily'; session: LegacyDailySession }

export type LegacyMigrationResult =
  | { ok: true }
  | { ok: false; kind: 'generation' | 'storage' | 'infrastructure'; pending: PendingLegacyMigration; message: string }

export interface LegacyMigrationDependencies {
  storage?: Storage
  client?: ProceduralWorkerClient
  waitForPaint?: () => Promise<void>
}

let migrationRequestSequence = 0
const nextRequestId = () => `legacy-${Date.now().toString(36)}-${(++migrationRequestSequence).toString(36)}`

export function inspectPendingLegacyMigrations(storage: Storage = localStorage): PendingLegacyMigration[] {
  const infinite = getPendingLegacyInfiniteSession(storage)
  const daily = getPendingLegacyDailySession(storage)
  return [
    ...(infinite ? [{ mode: 'infinite' as const, session: infinite }] : []),
    ...(daily ? [{ mode: 'daily' as const, session: daily }] : []),
  ]
}

function requestFor(pending: PendingLegacyMigration): GenerateRequest {
  if (pending.mode === 'infinite') return {
    protocolVersion: PROCEDURAL_WORKER_PROTOCOL_VERSION,
    requestId: nextRequestId(),
    mode: 'infinite',
    seed: pending.session.seed,
    difficulty: pending.session.difficulty,
    includeMetrics: true,
  }
  return {
    protocolVersion: PROCEDURAL_WORKER_PROTOCOL_VERSION,
    requestId: nextRequestId(),
    mode: 'daily',
    dateKey: pending.session.dateKey,
    difficulty: pending.session.difficulty,
    includeMetrics: true,
  }
}

function fallbackSnapshot(pending: PendingLegacyMigration): ProceduralCaseSnapshot {
  if (pending.mode === 'infinite') return generateInfiniteSnapshot(pending.session.difficulty, pending.session.seed)
  const date = getDateForDailyKey(pending.session.dateKey)
  if (!date) throw new Error('Invalid legacy Daily date.')
  return generateDailySnapshot(date, pending.session.difficulty)
}

async function generateMigrationSnapshot(pending: PendingLegacyMigration, dependencies: Required<Pick<LegacyMigrationDependencies, 'client' | 'waitForPaint'>>): Promise<ProceduralCaseSnapshot> {
  try {
    return (await dependencies.client.generate(requestFor(pending))).snapshot
  } catch (error) {
    if (error instanceof ProceduralWorkerDomainError) throw error
    if (error instanceof ProceduralWorkerCancelledError) throw error
    if (!(error instanceof ProceduralWorkerInfrastructureError)) throw error
    await dependencies.waitForPaint()
    return fallbackSnapshot(pending)
  }
}

export async function migratePendingLegacySessions(dependencies: LegacyMigrationDependencies = {}): Promise<LegacyMigrationResult> {
  const storage = dependencies.storage ?? localStorage
  const runtime = { client: dependencies.client ?? proceduralWorkerClient, waitForPaint: dependencies.waitForPaint ?? waitForPaintBeforeSynchronousWork }
  while (true) {
    const pending = inspectPendingLegacyMigrations(storage)[0]
    if (!pending) return { ok: true }
    let snapshot: ProceduralCaseSnapshot
    try { snapshot = await generateMigrationSnapshot(pending, runtime) } catch (error) {
      return {
        ok: false,
        kind: error instanceof ProceduralWorkerInfrastructureError ? 'infrastructure' : 'generation',
        pending,
        message: 'No se pudo actualizar la partida guardada.',
      }
    }
    const result = pending.mode === 'infinite'
      ? migrateLegacyInfiniteSessionFromSnapshot(pending.session, snapshot, storage)
      : migrateLegacyDailySessionFromSnapshot(pending.session, snapshot, storage)
    if (!result.ok) return {
      ok: false,
      kind: result.kind === 'storage' ? 'storage' : 'generation',
      pending,
      message: result.kind === 'storage' ? 'La partida se actualizó, pero no pudo guardarse.' : 'No se pudo actualizar la partida guardada.',
    }
  }
}

export function discardPendingLegacyMigration(pending: PendingLegacyMigration, storage: Storage = localStorage): boolean {
  return pending.mode === 'infinite'
    ? discardLegacyInfiniteSession(pending.session, storage)
    : discardLegacyDailySession(pending.session, storage)
}
