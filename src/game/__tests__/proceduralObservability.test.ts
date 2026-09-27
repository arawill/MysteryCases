import { describe, expect, it, vi } from 'vitest'
import { generateDailyCase } from '../daily/generator'
import { generateInfiniteCase } from '../infinite/generator'
import { getNormalCaseId, getNormalCaseSeed } from '../normal/ids'
import { aggregateProceduralDiagnostics, classifyGenerationError, ProceduralDiagnosticTracker, summarizeDistribution, type ProceduralGenerationDiagnostic } from '../generation/observability'
import { generateProceduralCase } from '../generation/proceduralCase'

describe('procedural generation observability', () => {
  it('preserves exact generated output with observability enabled and isolates observer failures', () => {
    const request = { difficulty: 3 as const, seed: 0x12345678 }
    const baseline = generateInfiniteCase(request)
    const observer = vi.fn(() => { throw new Error('observer failure') })
    expect(generateInfiniteCase(request, { observer })).toEqual(baseline)
    expect(observer).toHaveBeenCalledOnce()
  })

  it('emits typed Daily and fallback diagnostics without narrative or solution data', () => {
    const daily: ProceduralGenerationDiagnostic[] = []
    const generatedDaily = generateDailyCase(new Date(2026, 0, 1, 12), 1, { observer: value => daily.push(value as ProceduralGenerationDiagnostic), detailed: true })
    expect(daily).toHaveLength(1)
    expect(daily[0]).toMatchObject({ mode: 'daily', difficulty: 1, candidateCount: generatedDaily.seedOffset + 1, acceptedAttempt: generatedDaily.seedOffset + 1 })

    const fallback: ProceduralGenerationDiagnostic[] = [], seed = getNormalCaseSeed(5, 2)
    const generated = generateProceduralCase({ id: getNormalCaseId(5, 2), title: 'Test', intro: '', difficulty: 5, seed }, { observer: value => fallback.push(value as ProceduralGenerationDiagnostic), detailed: true })
    expect(fallback[0]).toMatchObject({ result: generated.seedOffset === 0 ? 'success' : 'fallback', candidateCount: generated.seedOffset + 1, solverCalls: expect.any(Number), reproduction: { baseSeed: seed, effectiveSeed: generated.effectiveSeed, seedOffset: generated.seedOffset } })
    const serialized = JSON.stringify(fallback[0])
    expect(serialized).not.toContain('solution')
    expect(serialized).not.toContain('intro')
  }, 30_000)

  it('uses an injectable monotonic clock and freezes the emitted envelope', () => {
    const values = [10, 8, 15, 18], diagnostics: Readonly<ProceduralGenerationDiagnostic>[] = []
    const tracker = new ProceduralDiagnosticTracker('procedural', 2, 42, { clock: () => values.shift() ?? 18, detailed: true, observer: value => diagnostics.push(value) })
    tracker.recordCandidate(); tracker.recordScenarioAttempt(); tracker.measureSolver(() => 'ok'); tracker.emit('success', 0, 42)
    expect(diagnostics[0]).toMatchObject({ totalMilliseconds: 8, solverMilliseconds: 5, generatorMilliseconds: 3, candidateCount: 1, attemptCount: 1 })
    expect(Object.isFrozen(diagnostics[0])).toBe(true)
  })

  it('classifies controlled exceptions and records exhaustion limits', () => {
    expect(classifyGenerationError(new Error('unexpected controlled branch'))).toBe('controlled-exception')
    const diagnostics: Readonly<ProceduralGenerationDiagnostic>[] = []
    const tracker = new ProceduralDiagnosticTracker('procedural', 1, 7, { observer: value => diagnostics.push(value) })
    tracker.recordCandidate(); tracker.recordRejection('scenario-attempt-limit'); tracker.recordRejection('candidate-limit'); tracker.emit('failure')
    expect(diagnostics[0]).toMatchObject({ diagnosticVersion: 1, result: 'failure', rejections: { 'scenario-attempt-limit': 1, 'candidate-limit': 1 }, reachedLimits: ['scenario-attempt-limit', 'candidate-limit'] })
  })

  it('computes empty, even, odd and nearest-rank distributions', () => {
    expect(summarizeDistribution([])).toMatchObject({ count: 0, mean: null, median: null, p90: null, max: null })
    expect(summarizeDistribution([4])).toMatchObject({ mean: 4, median: 4, p99: 4, max: 4 })
    expect(summarizeDistribution([1, 2, 3, 4])).toMatchObject({ mean: 2.5, median: 2.5, p90: 4 })
    expect(summarizeDistribution([1, 2, 3])).toMatchObject({ median: 2, p95: 3 })
  })

  it('aggregates fallback, failure, rejection, solver and mode/difficulty groups purely', () => {
    const base = { diagnosticVersion: 1 as const, generatorVersion: 1, difficulty: 1 as const, attemptCount: 2, solverCalls: 3, totalMilliseconds: 10, solverMilliseconds: 5, generatorMilliseconds: 5, acceptedAttempt: 1, reachedLimits: [] }
    const diagnostics: ProceduralGenerationDiagnostic[] = [
      { ...base, mode: 'daily', result: 'success', candidateCount: 1, rejections: {} },
      { ...base, mode: 'infinite', result: 'fallback', candidateCount: 3, acceptedAttempt: 3, rejections: { 'solver-node-limit': 2 } },
      { ...base, mode: 'infinite', result: 'failure', candidateCount: 5, acceptedAttempt: undefined, rejections: { 'candidate-limit': 1 }, reachedLimits: ['candidate-limit'] },
    ]
    const aggregate = aggregateProceduralDiagnostics(diagnostics)
    expect(aggregate).toMatchObject({ requests: 3, successes: 2, fallbacks: 1, failures: 1, solverCalls: 9, solverTimePercentage: 50, attemptDistribution: { 1: 1, 3: 1, 5: 1 }, rejections: { 'solver-node-limit': 2, 'candidate-limit': 1 } })
    expect(aggregate.groups).toHaveLength(2)
    expect(diagnostics).toHaveLength(3)
  })
})
