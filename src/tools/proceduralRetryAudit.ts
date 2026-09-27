import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { generateDailyCase } from '../game/daily/generator'
import { generateInfiniteCase } from '../game/infinite/generator'
import { aggregateProceduralDiagnostics, type ProceduralDiagnosticAggregate, type ProceduralGenerationDiagnostic } from '../game/generation/observability'
import type { DifficultyRating } from '../game/types'
import { assertPathInsideProject } from './caseAuthoring/drafts'

export interface RetryAuditOptions { samples: number; json: boolean; detailed: boolean; output?: string; overwrite: boolean }
export interface RetryAuditReport { datasetVersion: 1; samplesPerModeAndDifficulty: number; diagnostics: ProceduralGenerationDiagnostic[]; aggregate: ProceduralDiagnosticAggregate; generationFailures: number }

export function parseRetryAuditArgs(arguments_: readonly string[]): RetryAuditOptions {
  const options: RetryAuditOptions = { samples: 5, json: false, detailed: false, overwrite: false }
  const seen = new Set<string>()
  for (const argument of arguments_) {
    const [name, ...rest] = argument.split('='); const value = rest.join('=')
    if (!['--samples', '--json', '--detailed', '--output', '--overwrite'].includes(name)) throw new Error(`Unknown argument: ${argument}`)
    if (seen.has(name)) throw new Error(`Duplicate argument: ${name}`); seen.add(name)
    if (name === '--samples') { const parsed = Number(value); if (!value || !Number.isInteger(parsed) || parsed < 1 || parsed > 1000) throw new Error('--samples must be an integer between 1 and 1000.'); options.samples = parsed }
    else if (name === '--output') { if (!value) throw new Error('--output requires a path.'); options.output = value }
    else { if (value) throw new Error(`${name} does not accept a value.`); if (name === '--json') options.json = true; if (name === '--detailed') options.detailed = true; if (name === '--overwrite') options.overwrite = true }
  }
  if (options.overwrite && !options.output) throw new Error('--overwrite requires --output.')
  return options
}

export function runProceduralRetryAudit(options: RetryAuditOptions): RetryAuditReport {
  const diagnostics: ProceduralGenerationDiagnostic[] = []; let generationFailures = 0
  const observer = (diagnostic: Readonly<ProceduralGenerationDiagnostic>) => diagnostics.push(diagnostic as ProceduralGenerationDiagnostic)
  const difficulties: DifficultyRating[] = [1, 2, 3, 4, 5]
  for (const difficulty of difficulties) for (let sample = 0; sample < options.samples; sample += 1) {
    const date = new Date(2026, difficulty - 1, sample + 1, 12)
    try { generateDailyCase(date, difficulty, { observer, detailed: options.detailed }) } catch { generationFailures += 1 }
    const seed = (Math.imul(difficulty, 0x9e3779b1) + Math.imul(sample + 1, 0x85ebca6b) + 0x2468ace0) >>> 0
    try { generateInfiniteCase({ difficulty, seed }, { observer, detailed: options.detailed }) } catch { generationFailures += 1 }
  }
  return { datasetVersion: 1, samplesPerModeAndDifficulty: options.samples, diagnostics, aggregate: aggregateProceduralDiagnostics(diagnostics), generationFailures }
}

export function formatRetryAuditSummary(report: RetryAuditReport): string {
  const { aggregate } = report, attempts = aggregate.attempts
  const rows = [
    'Procedural retry audit',
    `Diagnostic v${aggregate.diagnosticVersion}; generator v${aggregate.generatorVersion}; dataset v${report.datasetVersion}`,
    `Requests: ${aggregate.requests}; success: ${aggregate.successes}; fallback: ${aggregate.fallbacks}; failure: ${aggregate.failures}`,
    `Retry ratio: ${aggregate.requests === 0 ? '0.0' : (aggregate.fallbacks / aggregate.requests * 100).toFixed(1)}%`,
    `Candidate attempts: mean ${attempts.mean?.toFixed(2) ?? 'n/a'}; median ${attempts.median ?? 'n/a'}; p90 ${attempts.p90 ?? 'n/a'}; p95 ${attempts.p95 ?? 'n/a'}; p99 ${attempts.p99 ?? 'n/a'}; max ${attempts.max ?? 'n/a'}`,
    `Solver: ${aggregate.solverCalls} calls; ${aggregate.solverTimePercentage.toFixed(1)}% of measured time`,
    `Duration: ${Math.round(aggregate.totalMilliseconds)} ms total; ${aggregate.averageMilliseconds === null ? 'n/a' : Math.round(aggregate.averageMilliseconds)} ms/request`,
    `Rejections: ${Object.entries(aggregate.rejections).sort((a, b) => b[1] - a[1]).map(([reason, count]) => `${reason}=${count}`).join(', ') || 'none'}`,
  ]
  for (const group of aggregate.groups) rows.push(`${group.mode} D${group.difficulty}: requests=${group.summary.requests}, fallback=${group.summary.fallbacks}, failure=${group.summary.failures}, mean-attempts=${group.summary.attempts.mean?.toFixed(2) ?? 'n/a'}`)
  const reproducibleExtremes = [...report.diagnostics].filter(item => item.reproduction).sort((left, right) => right.candidateCount - left.candidateCount).slice(0, 3)
  if (reproducibleExtremes.length) rows.push(`Reproduction extremes: ${reproducibleExtremes.map(item => `${item.mode}/D${item.difficulty}/seed=${item.reproduction!.baseSeed}/offset=${item.reproduction!.seedOffset ?? 'n/a'}/candidates=${item.candidateCount}`).join('; ')}`)
  return rows.join('\n')
}

export const retryAuditExitCode = (report: RetryAuditReport) => report.generationFailures > 0 ? 1 : 0

export function writeRetryAuditOutput(projectRoot: string, requestedPath: string, content: string, overwrite: boolean): string {
  const root = resolve(projectRoot), candidate = assertPathInsideProject(root, isAbsolute(requestedPath) ? requestedPath : join(root, requestedPath), 'Audit output')
  if (existsSync(candidate) && !overwrite) throw new Error(`Output already exists: ${candidate}. Use --overwrite to replace it.`)
  mkdirSync(dirname(candidate), { recursive: true }); writeFileSync(candidate, content, 'utf8'); return candidate
}
