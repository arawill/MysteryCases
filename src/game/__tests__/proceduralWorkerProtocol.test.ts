import { describe, expect, it, vi } from 'vitest'
import { getDateForDailyKey } from '../daily/date'
import { generateDailyCase } from '../daily/generator'
import { generateInfiniteCase } from '../infinite/generator'
import { createProceduralCaseSnapshot, restoreProceduralCaseSnapshot } from '../persistence/proceduralSnapshot'
import { createProceduralWorkerDispatcher, handleGenerateRequest } from '../proceduralWorker/handler'
import { PROCEDURAL_WORKER_PROTOCOL_VERSION, parseGenerateRequest, parseGenerateResponse } from '../proceduralWorker/protocol'
import type { DifficultyRating } from '../types'

describe('procedural Worker protocol and pure handler', () => {
  const daily = { protocolVersion: PROCEDURAL_WORKER_PROTOCOL_VERSION, requestId: 'daily-1', mode: 'daily' as const, dateKey: '2026-09-08', difficulty: 1 as const }
  const infinite = { protocolVersion: PROCEDURAL_WORKER_PROTOCOL_VERSION, requestId: 'infinite-1', mode: 'infinite' as const, seed: 123, difficulty: 1 as const }

  it('strictly validates discriminated requests', () => {
    expect(parseGenerateRequest(daily)).toEqual(daily)
    expect(parseGenerateRequest(infinite)).toEqual(infinite)
    for (const invalid of [
      { ...daily, protocolVersion: 2 }, { ...daily, requestId: '' }, { ...daily, dateKey: '2026-02-30' }, { ...daily, difficulty: 0 },
      { ...daily, seed: 1 }, { ...infinite, dateKey: '2026-09-08' }, { ...infinite, seed: -1 }, { ...infinite, seed: 1.5 },
      { ...infinite, seed: 0x1_0000_0000 }, null, [], 'request', { protocolVersion: 1 },
    ]) expect(parseGenerateRequest(invalid)).toBeNull()
  })

  it('returns cloneable data errors and rejects duplicate IDs', () => {
    const dispatch = createProceduralWorkerDispatcher()
    const invalid = dispatch({ ...daily, dateKey: 'bad' })
    expect(invalid).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST', retryable: false } })
    expect(() => structuredClone(invalid)).not.toThrow()
    expect(JSON.stringify(invalid)).not.toContain('stack')
    const first = dispatch(daily)
    expect(first.ok).toBe(true)
    expect(dispatch(daily)).toMatchObject({ ok: false, error: { code: 'DUPLICATE_REQUEST_ID' } })
  })

  it('validates a snapshot once and measures creation plus complete validation', () => {
    const timestamps = [0, 1, 11, 17]
    const restoreSnapshot = vi.fn(restoreProceduralCaseSnapshot)
    const response = handleGenerateRequest(
      { ...infinite, includeMetrics: true },
      { now: () => timestamps.shift()!, generateDaily: generateDailyCase, generateInfinite: generateInfiniteCase, restoreSnapshot },
    )
    expect(response.ok).toBe(true)
    if (!response.ok) return
    expect(restoreSnapshot).toHaveBeenCalledTimes(1)
    expect(restoreSnapshot).toHaveBeenCalledWith(response.snapshot, { mode: 'infinite', difficulty: 1, originalSeed: 123 })
    expect(response.metrics).toEqual({ generationMilliseconds: 10, snapshotMilliseconds: 6, totalMilliseconds: 17 })

    const rejected = handleGenerateRequest(
      { ...infinite, requestId: 'invalid-snapshot' },
      { now: () => 0, generateDaily: generateDailyCase, generateInfinite: generateInfiniteCase, restoreSnapshot: () => null },
    )
    expect(rejected).toMatchObject({ ok: false, error: { code: 'GENERATION_FAILED' } })
  })

  it.each([1, 2, 3, 4, 5] as DifficultyRating[])('matches direct Daily snapshots exactly at D%s', difficulty => {
    const dateKey = `2026-10-${String(difficulty).padStart(2, '0')}`
    const date = getDateForDailyKey(dateKey)!
    const direct = createProceduralCaseSnapshot('daily', generateDailyCase(date, difficulty), { dailyDateKey: dateKey })
    const response = handleGenerateRequest({ protocolVersion: 1, requestId: `daily-${difficulty}`, mode: 'daily', dateKey, difficulty, includeMetrics: true })
    expect(response.ok).toBe(true)
    if (!response.ok) return
    expect(response.snapshot).toEqual(direct)
    expect(JSON.stringify(response.snapshot)).toBe(JSON.stringify(direct))
    expect(response.snapshot.caseData.id).toBe(direct.caseData.id)
    expect(response.snapshot).toMatchObject({ originalSeed: direct.originalSeed, effectiveSeed: direct.effectiveSeed, seedOffset: direct.seedOffset, killerId: direct.killerId })
    expect(parseGenerateResponse(response)).toEqual(response)
  }, 30_000)

  it.each([1, 2, 3, 4, 5] as DifficultyRating[])('matches direct Infinite snapshots exactly at D%s', difficulty => {
    const seed = 0x10203040 + difficulty
    const direct = createProceduralCaseSnapshot('infinite', generateInfiniteCase({ difficulty, seed }))
    const response = handleGenerateRequest({ protocolVersion: 1, requestId: `infinite-${difficulty}`, mode: 'infinite', seed, difficulty, includeMetrics: true })
    expect(response.ok).toBe(true)
    if (!response.ok) return
    expect(response.snapshot).toEqual(direct)
    expect(JSON.stringify(response.snapshot)).toBe(JSON.stringify(direct))
    expect(response.snapshot.caseData).toEqual(direct.caseData)
    expect(response.snapshot).toMatchObject({ originalSeed: seed, effectiveSeed: direct.effectiveSeed, seedOffset: direct.seedOffset, killerId: direct.killerId })
  }, 30_000)
})
