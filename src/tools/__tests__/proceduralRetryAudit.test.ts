import { describe, expect, it } from 'vitest'
import { parseRetryAuditArgs, formatRetryAuditSummary, retryAuditExitCode, runProceduralRetryAudit, writeRetryAuditOutput } from '../proceduralRetryAudit'
import { aggregateProceduralDiagnostics } from '../../game/generation/observability'

describe('procedural retry audit CLI', () => {
  it('parses safe explicit options and rejects malformed or duplicate arguments', () => {
    expect(parseRetryAuditArgs(['--samples=7', '--json', '--detailed', '--output=reports/a.json', '--overwrite'])).toEqual({ samples: 7, json: true, detailed: true, output: 'reports/a.json', overwrite: true })
    expect(() => parseRetryAuditArgs(['--samples=0'])).toThrow('between 1 and 1000')
    expect(() => parseRetryAuditArgs(['--json', '--json'])).toThrow('Duplicate')
    expect(() => parseRetryAuditArgs(['--wat'])).toThrow('Unknown')
    expect(() => parseRetryAuditArgs(['--overwrite'])).toThrow('requires --output')
  })

  it('formats an empty aggregate without NaN or Infinity', () => {
    const aggregate = aggregateProceduralDiagnostics([])
    const text = formatRetryAuditSummary({ datasetVersion: 1, samplesPerModeAndDifficulty: 1, diagnostics: [], aggregate, generationFailures: 0 })
    expect(text).toContain('Requests: 0')
    expect(text).not.toMatch(/NaN|Infinity/)
  })

  it('rejects paths outside the workspace and accidental overwrite', () => {
    expect(() => writeRetryAuditOutput(process.cwd(), '../outside.json', '{}', false)).toThrow()
    expect(() => writeRetryAuditOutput(process.cwd(), 'package.json', '{}', false)).toThrow('already exists')
  })

  it('runs the reproducible 2-mode D1-D5 sample, emits JSON and succeeds without output', () => {
    const report = runProceduralRetryAudit(parseRetryAuditArgs(['--samples=1', '--json']))
    expect(report.aggregate.requests).toBe(10)
    expect(report.aggregate.groups).toHaveLength(10)
    expect(report.diagnostics.every(item => item.reproduction === undefined)).toBe(true)
    expect(JSON.parse(JSON.stringify(report))).toMatchObject({ datasetVersion: 1, generationFailures: 0 })
    expect(retryAuditExitCode(report)).toBe(0)
  }, 30_000)
})
