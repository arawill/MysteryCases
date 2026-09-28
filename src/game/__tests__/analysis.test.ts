import { afterEach, describe, expect, it, vi } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { analyzeCase, createPrecomputedCaseAnalysis, type PrecomputedCaseAnalysis as PrecomputedCaseAnalysisEvidence } from '../analysis'
import * as solver from '../solver'
import type { GameCase } from '../types'

const options = { maxSolutions: 2, maxNodes: 4000 } as const
const clone = <T>(value: T): T => structuredClone(value)
const evidenceFor = (solvedCase: GameCase, analyzedCase: GameCase = solvedCase, solveOptions = options) => createPrecomputedCaseAnalysis({ solvedCase, analyzedCase, result: solver.solveCase(solvedCase, solveOptions), solveOptions })

afterEach(() => vi.restoreAllMocks())

describe('precomputed case analysis', () => {
  it('produces exactly the same ordered analysis without another solve', () => {
    const expected = analyzeCase(case001)
    const evidence = evidenceFor(case001)
    const solve = vi.spyOn(solver, 'solveCase')
    const actual = analyzeCase(case001, { precomputed: evidence })
    expect(actual).toEqual(expected)
    expect(actual.solution).not.toBe(expected.solution)
    expect(solve).not.toHaveBeenCalled()
  })

  it('keeps independent structural and semantic validation errors in the same order', () => {
    const evidence = evidenceFor(case001)
    const invalid = clone(case001)
    invalid.characters[1].isVictim = true
    invalid.characters[0].clues[0] = { id: 'bad-zone', type: 'zone', text: '', zoneId: 'missing' }
    const expected = analyzeCase(invalid)
    expect(analyzeCase(invalid, { precomputed: evidence })).toEqual(expected)
    expect(expected.status).toBe('none')
    expect(expected.validationErrors.length).toBeGreaterThan(0)
  })

  it('accepts only an exhaustive unique result obtained with maxSolutions >= 2', () => {
    const ambiguous = clone(case001)
    for (const character of ambiguous.characters) character.clues = []
    ambiguous.globalClues = []
    const impossible = clone(case001)
    impossible.characters[0].clues = [{ id: 'impossible', type: 'row', text: '', row: 99 }]
    const unique = solver.solveCase(case001, options)
    const two = solver.solveCase(ambiguous, options)
    const zero = solver.solveCase(impossible, options)
    expect(createPrecomputedCaseAnalysis({ solvedCase: case001, analyzedCase: case001, result: unique, solveOptions: options })).toBeDefined()
    expect(createPrecomputedCaseAnalysis({ solvedCase: ambiguous, analyzedCase: ambiguous, result: two, solveOptions: options })).toBeUndefined()
    expect(createPrecomputedCaseAnalysis({ solvedCase: impossible, analyzedCase: impossible, result: zero, solveOptions: options })).toBeUndefined()
    expect(createPrecomputedCaseAnalysis({ solvedCase: case001, analyzedCase: case001, result: unique, solveOptions: { maxSolutions: 1 } })).toBeUndefined()
    expect(createPrecomputedCaseAnalysis({ solvedCase: case001, analyzedCase: case001, result: { ...unique, truncated: true }, solveOptions: { maxSolutions: 2, maxNodes: 1 } })).toBeUndefined()
  })

  it('uses the normal solve fallback for zero, multiple, truncated, insufficient, and unknown results', () => {
    const ambiguous = clone(case001)
    for (const character of ambiguous.characters) character.clues = []
    ambiguous.globalClues = []
    const impossible = clone(case001)
    impossible.characters[0].clues = [{ id: 'impossible', type: 'row', text: '', row: 99 }]
    const unique = solver.solveCase(case001, options)
    const unsafe = [
      createPrecomputedCaseAnalysis({ solvedCase: impossible, analyzedCase: impossible, result: solver.solveCase(impossible, options), solveOptions: options }),
      createPrecomputedCaseAnalysis({ solvedCase: ambiguous, analyzedCase: ambiguous, result: solver.solveCase(ambiguous, options), solveOptions: options }),
      createPrecomputedCaseAnalysis({ solvedCase: case001, analyzedCase: case001, result: { ...unique, truncated: true }, solveOptions: { maxSolutions: 2, maxNodes: 1 } }),
      createPrecomputedCaseAnalysis({ solvedCase: case001, analyzedCase: case001, result: unique, solveOptions: { maxSolutions: 1 } }),
      createPrecomputedCaseAnalysis({ solvedCase: case001, analyzedCase: case001, result: { solutions: [], solutionsFound: 1 } as never, solveOptions: options }),
    ]
    const solve = vi.spyOn(solver, 'solveCase')
    for (const precomputed of unsafe) {
      expect(precomputed).toBeUndefined()
      expect(analyzeCase(case001, { precomputed })).toEqual(analyzeCase(case001))
    }
    expect(solve).toHaveBeenCalledTimes(unsafe.length * 2)
  })

  it('falls back for absent, unknown, or forged evidence and preserves solver exceptions', () => {
    const valid = evidenceFor(case001)
    const solve = vi.spyOn(solver, 'solveCase')
    expect(analyzeCase(case001, { precomputed: {} as PrecomputedCaseAnalysisEvidence })).toEqual(analyzeCase(case001))
    expect(solve).toHaveBeenCalledTimes(2)
    const changedNodeLimit = { ...valid, solveOptions: { maxSolutions: 2, maxNodes: 1 } } as unknown as PrecomputedCaseAnalysisEvidence
    expect(analyzeCase(case001, { precomputed: changedNodeLimit })).toEqual(analyzeCase(case001))
    expect(solve).toHaveBeenCalledTimes(4)
    solve.mockImplementationOnce(() => { throw new Error('solver failure') })
    expect(() => analyzeCase(case001, { precomputed: {} as PrecomputedCaseAnalysisEvidence })).toThrow('solver failure')
  })

  it('binds evidence to the exact target id while permitting the explicit solve-to-final id transition', () => {
    const analyzedCase = { ...case001, id: 'generated-final-id' }
    const evidence = evidenceFor(case001, analyzedCase)
    const solve = vi.spyOn(solver, 'solveCase')
    expect(analyzeCase(analyzedCase, { precomputed: evidence })).toEqual(analyzeCase(analyzedCase))
    expect(solve).toHaveBeenCalledOnce()
    solve.mockClear()
    expect(analyzeCase({ ...analyzedCase, id: 'another-id' }, { precomputed: evidence })).toEqual(analyzeCase({ ...analyzedCase, id: 'another-id' }))
    expect(solve).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['clue added', (value: GameCase) => { const placement = value.solution.find(item => item.characterId === value.characters[0].id)!; value.characters[0].clues.push({ id: 'added-row', type: 'row', text: '', row: placement.position.row }) }],
    ['clue removed', (value: GameCase) => { value.characters[0].clues = value.characters[0].clues.slice(1) }],
    ['clues reordered', (value: GameCase) => { value.characters[0].clues.reverse() }],
    ['clue changed with same id', (value: GameCase) => { value.characters[0].clues[0].text += ' changed' }],
    ['board changed', (value: GameCase) => { const cell = value.board.find(candidate => candidate.object)!; cell.object = { ...cell.object!, icon: `${cell.object!.icon}-changed` } }],
    ['character changed', (value: GameCase) => { value.characters[0].name += ' changed' }],
    ['global changed', (value: GameCase) => { const occupied = new Set(value.solution.map(placement => value.board.find(cell => cell.row === placement.position.row && cell.column === placement.position.column)?.zoneId)); value.globalClues = [...(value.globalClues ?? []), { id: 'empty-zones', type: 'emptyZoneCount', text: '', count: value.zones.filter(zone => !occupied.has(zone.id)).length }] }],
    ['zone changed', (value: GameCase) => { value.zones[0].name += ' changed' }],
  ] as const)('falls back when the case identity differs: %s', (_label, mutate) => {
    const evidence = evidenceFor(case001)
    const changed = clone(case001)
    mutate(changed)
    const expected = analyzeCase(changed)
    const solve = vi.spyOn(solver, 'solveCase')
    expect(analyzeCase(changed, { precomputed: evidence })).toEqual(expected)
    expect(solve).toHaveBeenCalledOnce()
  })
})
