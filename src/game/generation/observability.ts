import type { DifficultyRating } from '../types'
import { PROCEDURAL_GENERATION_VERSION } from './version'

export const PROCEDURAL_DIAGNOSTIC_VERSION = 1 as const
export type ProceduralGenerationMode = 'daily' | 'infinite' | 'procedural'
export type ProceduralGenerationResult = 'success' | 'fallback' | 'failure'

export const proceduralRejectionReasons = [
  'roster-invariant',
  'scenario-zone-layout',
  'scenario-object-placement',
  'scenario-edge-or-trait',
  'scenario-template-validation',
  'scenario-placement-feasibility',
  'scenario-attempt-limit',
  'puzzle-placement',
  'readable-clue-shortage',
  'advanced-clue-shortage',
  'global-clue-shortage',
  'solver-call-limit',
  'solver-node-limit',
  'refinement-limit',
  'candidate-evaluation-limit',
  'no-counterexample-clue',
  'contradictory-clues',
  'non-unique-puzzle',
  'canonical-mismatch',
  'definition-validation',
  'final-uniqueness',
  'analysis-validation',
  'killer-validation',
  'post-generation-quality',
  'controlled-exception',
  'candidate-limit',
] as const
export type ProceduralRejectionReason = typeof proceduralRejectionReasons[number]

export interface ProceduralReproduction {
  baseSeed: number
  effectiveSeed?: number
  seedOffset?: number
}

export interface ProceduralGenerationDiagnostic {
  diagnosticVersion: typeof PROCEDURAL_DIAGNOSTIC_VERSION
  generatorVersion: number
  mode: ProceduralGenerationMode
  difficulty: DifficultyRating
  result: ProceduralGenerationResult
  candidateCount: number
  attemptCount: number
  solverCalls: number
  totalMilliseconds: number
  solverMilliseconds: number
  generatorMilliseconds: number
  rejections: Partial<Record<ProceduralRejectionReason, number>>
  acceptedAttempt?: number
  reachedLimits: ProceduralRejectionReason[]
  reproduction?: ProceduralReproduction
}

export interface ProceduralObservabilityOptions {
  observer: (diagnostic: Readonly<ProceduralGenerationDiagnostic>) => void
  clock?: () => number
  detailed?: boolean
}

export interface GenerationInstrumentation {
  recordScenarioAttempt(): void
  recordRejection(reason: ProceduralRejectionReason): void
  measureSolver<T>(operation: () => T): T
}

const limitReasons = new Set<ProceduralRejectionReason>([
  'scenario-attempt-limit', 'solver-call-limit', 'solver-node-limit', 'refinement-limit', 'candidate-evaluation-limit', 'candidate-limit',
])
const defaultClock = () => typeof performance === 'undefined' ? Date.now() : performance.now()
const roundDuration = (value: number) => Math.max(0, Math.round(value * 1000) / 1000)

export class ProceduralDiagnosticTracker implements GenerationInstrumentation {
  private readonly mode: ProceduralGenerationMode
  private readonly difficulty: DifficultyRating
  private readonly baseSeed: number
  private readonly options: ProceduralObservabilityOptions
  private readonly startedAt: number
  private lastClock: number | undefined
  private candidateCount = 0
  private attemptCount = 0
  private solverCalls = 0
  private solverMilliseconds = 0
  private emitted = false
  private readonly rejections: Partial<Record<ProceduralRejectionReason, number>> = {}
  private readonly reachedLimits = new Set<ProceduralRejectionReason>()

  constructor(
    mode: ProceduralGenerationMode,
    difficulty: DifficultyRating,
    baseSeed: number,
    options: ProceduralObservabilityOptions,
  ) {
    this.mode = mode
    this.difficulty = difficulty
    this.baseSeed = baseSeed
    this.options = options
    this.startedAt = this.readClock()
    this.lastClock = this.startedAt
  }

  private readClock(): number {
    try {
      const value = (this.options.clock ?? defaultClock)()
      if (Number.isFinite(value)) { this.lastClock = Math.max(this.lastClock ?? value, value); return this.lastClock }
    } catch { /* A diagnostic clock cannot affect generation. */ }
    return this.lastClock ?? 0
  }

  recordCandidate() { this.candidateCount += 1 }
  recordScenarioAttempt() { this.attemptCount += 1 }
  recordRejection(reason: ProceduralRejectionReason) {
    this.rejections[reason] = (this.rejections[reason] ?? 0) + 1
    if (limitReasons.has(reason)) this.reachedLimits.add(reason)
  }
  measureSolver<T>(operation: () => T): T {
    const startedAt = this.readClock()
    this.solverCalls += 1
    try { return operation() } finally { this.solverMilliseconds += Math.max(0, this.readClock() - startedAt) }
  }

  emit(result: ProceduralGenerationResult, acceptedOffset?: number, effectiveSeed?: number) {
    if (this.emitted) return
    this.emitted = true
    const totalMilliseconds = Math.max(0, this.readClock() - this.startedAt)
    const diagnostic: ProceduralGenerationDiagnostic = {
      diagnosticVersion: PROCEDURAL_DIAGNOSTIC_VERSION,
      generatorVersion: PROCEDURAL_GENERATION_VERSION,
      mode: this.mode,
      difficulty: this.difficulty,
      result,
      candidateCount: this.candidateCount,
      attemptCount: this.attemptCount,
      solverCalls: this.solverCalls,
      totalMilliseconds: roundDuration(totalMilliseconds),
      solverMilliseconds: roundDuration(this.solverMilliseconds),
      generatorMilliseconds: roundDuration(Math.max(0, totalMilliseconds - this.solverMilliseconds)),
      rejections: Object.freeze({ ...this.rejections }),
      ...(acceptedOffset === undefined ? {} : { acceptedAttempt: acceptedOffset + 1 }),
      reachedLimits: Object.freeze([...this.reachedLimits]) as ProceduralRejectionReason[],
      ...(this.options.detailed ? { reproduction: Object.freeze({ baseSeed: this.baseSeed, ...(effectiveSeed === undefined ? {} : { effectiveSeed }), ...(acceptedOffset === undefined ? {} : { seedOffset: acceptedOffset }) }) } : {}),
    }
    try { this.options.observer(Object.freeze(diagnostic)) } catch { /* Observers are isolated from generation. */ }
  }
}

export function createProceduralDiagnosticTracker(mode: ProceduralGenerationMode, difficulty: DifficultyRating, baseSeed: number, options?: ProceduralObservabilityOptions) {
  return options ? new ProceduralDiagnosticTracker(mode, difficulty, baseSeed, options) : undefined
}

export function classifyGenerationError(error: unknown): ProceduralRejectionReason {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('Character roster does not match')) return 'roster-invariant'
  if (message.includes('Unable to generate a valid scenario template')) return 'scenario-attempt-limit'
  if (message.includes('Unable to generate a valid placement')) return 'puzzle-placement'
  if (message.includes('Not enough readable candidate clues')) return 'readable-clue-shortage'
  if (message.includes('Not enough advanced candidate clues')) return 'advanced-clue-shortage'
  if (message.includes('Not enough required global candidate clues')) return 'global-clue-shortage'
  if (message.includes('solver-call budget')) return 'solver-call-limit'
  if (message.includes('solver-node budget')) return 'solver-node-limit'
  if (message.includes('refinement budget')) return 'refinement-limit'
  if (message.includes('candidate-evaluation budget')) return 'candidate-evaluation-limit'
  if (message.includes('No readable clue eliminates')) return 'no-counterexample-clue'
  if (message.includes('contradict the generated placement')) return 'contradictory-clues'
  if (message.includes('uniquely solvable puzzle')) return 'non-unique-puzzle'
  if (message.includes('unique solution different')) return 'canonical-mismatch'
  if (message.includes('case validation failed')) return 'definition-validation'
  if (message.includes('final uniqueness validation')) return 'final-uniqueness'
  if (message.includes('analysis validation')) return 'analysis-validation'
  if (message.includes('no unique killer')) return 'killer-validation'
  return 'controlled-exception'
}

export interface DistributionSummary {
  count: number
  total: number
  mean: number | null
  median: number | null
  p90: number | null
  p95: number | null
  p99: number | null
  max: number | null
}

export interface ProceduralDiagnosticSummary {
  requests: number
  successes: number
  failures: number
  fallbacks: number
  attempts: DistributionSummary
  attemptDistribution: Record<string, number>
  rejections: Partial<Record<ProceduralRejectionReason, number>>
  solverCalls: number
  solverTimePercentage: number
  totalMilliseconds: number
  averageMilliseconds: number | null
}

export interface ProceduralDiagnosticAggregate extends ProceduralDiagnosticSummary {
  diagnosticVersion: typeof PROCEDURAL_DIAGNOSTIC_VERSION
  generatorVersion: number
  groups: Array<{ mode: ProceduralGenerationMode; difficulty: DifficultyRating; summary: ProceduralDiagnosticSummary }>
}

const percentile = (sorted: readonly number[], percentage: number) => sorted.length ? sorted[Math.max(0, Math.ceil(percentage * sorted.length) - 1)] : null
export function summarizeDistribution(values: readonly number[]): DistributionSummary {
  if (!values.length) return { count: 0, total: 0, mean: null, median: null, p90: null, p95: null, p99: null, max: null }
  const sorted = [...values].sort((left, right) => left - right), total = sorted.reduce((sum, value) => sum + value, 0), middle = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
  return { count: sorted.length, total, mean: total / sorted.length, median, p90: percentile(sorted, .9), p95: percentile(sorted, .95), p99: percentile(sorted, .99), max: sorted.at(-1)! }
}

function summarize(diagnostics: readonly ProceduralGenerationDiagnostic[]): ProceduralDiagnosticSummary {
  const rejections: Partial<Record<ProceduralRejectionReason, number>> = {}, attemptDistribution: Record<string, number> = {}
  for (const diagnostic of diagnostics) {
    attemptDistribution[String(diagnostic.candidateCount)] = (attemptDistribution[String(diagnostic.candidateCount)] ?? 0) + 1
    for (const [reason, count] of Object.entries(diagnostic.rejections) as Array<[ProceduralRejectionReason, number]>) rejections[reason] = (rejections[reason] ?? 0) + count
  }
  const totalMilliseconds = diagnostics.reduce((sum, item) => sum + item.totalMilliseconds, 0)
  const solverMilliseconds = diagnostics.reduce((sum, item) => sum + item.solverMilliseconds, 0)
  return {
    requests: diagnostics.length,
    successes: diagnostics.filter(item => item.result !== 'failure').length,
    failures: diagnostics.filter(item => item.result === 'failure').length,
    fallbacks: diagnostics.filter(item => item.result === 'fallback').length,
    attempts: summarizeDistribution(diagnostics.map(item => item.candidateCount)),
    attemptDistribution,
    rejections,
    solverCalls: diagnostics.reduce((sum, item) => sum + item.solverCalls, 0),
    solverTimePercentage: totalMilliseconds === 0 ? 0 : solverMilliseconds / totalMilliseconds * 100,
    totalMilliseconds,
    averageMilliseconds: diagnostics.length ? totalMilliseconds / diagnostics.length : null,
  }
}

export function aggregateProceduralDiagnostics(diagnostics: readonly ProceduralGenerationDiagnostic[]): ProceduralDiagnosticAggregate {
  const groups = new Map<string, ProceduralGenerationDiagnostic[]>()
  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.mode}:${diagnostic.difficulty}`
    const values = groups.get(key) ?? []; values.push(diagnostic); groups.set(key, values)
  }
  return {
    diagnosticVersion: PROCEDURAL_DIAGNOSTIC_VERSION,
    generatorVersion: PROCEDURAL_GENERATION_VERSION,
    ...summarize(diagnostics),
    groups: [...groups.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, values]) => ({ mode: values[0].mode, difficulty: values[0].difficulty, summary: summarize(values) })),
  }
}
