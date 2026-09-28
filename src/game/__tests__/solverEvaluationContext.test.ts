import { describe, expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { case002 } from '../../data/cases/case002'
import { allDifficultyPresets } from '../difficultyPresets'
import { solveCaseWithStats } from '../solver'
import { createSolverEvaluationContext } from '../solverEvaluationContext'
import type { BoardCell, GameCase } from '../types'

const fixture = (): GameCase => ({
  id: 'context', title: '', intro: '', difficulty: 1, rows: 2, columns: 2,
  zones: [{ id: 'z', name: 'First', tone: 'cafe' }, { id: 'z', name: 'Second', tone: 'x', surface: 'tile' }],
  board: [
    { row: 1, column: 1, zoneId: 'z', occupiable: true, object: { id: 'table', label: 'First', icon: '', occupiable: true } },
    { row: 1, column: 1, zoneId: 'other', occupiable: false, object: { id: 'table', label: 'Duplicate', icon: '', occupiable: false } },
    { row: 2, column: 2, zoneId: 'z', occupiable: true, object: { id: 'table', label: 'Last', icon: '', occupiable: true } },
  ],
  characters: [
    { id: 'a', name: 'First', avatar: '', isVictim: false, traitIds: ['staff', 3] as unknown as string[], clues: [] },
    { id: 'a', name: 'Second', avatar: '', isVictim: true, traitIds: ['visitor'], clues: [] },
  ],
  solution: [],
})

const cell = (row: unknown, column: unknown, zoneId: string): BoardCell => ({ row, column, zoneId, occupiable: true } as BoardCell)
const boardCase = (rows: unknown, columns: unknown, board: BoardCell[]): GameCase => ({
  ...fixture(), rows, columns, board,
} as GameCase)

describe('solve-local evaluation context', () => {
  it('preserves first-match lookup semantics and original grouping order', () => {
    const game = fixture(), context = createSolverEvaluationContext(game)
    expect(context.cellAt({ row: 1, column: 1 })).toBe(game.board[0])
    expect(context.characterById('a')).toBe(game.characters[0])
    expect(context.cellsByObjectId('table')).toEqual(game.board)
    expect(context.cellsByObjectId('missing')).toEqual([])
    expect(context.surfaceByZoneId('z')).toBe('wood')
    expect(context.surfaceByZoneId('missing')).toBe('generic')
    expect(context.characterHasTrait('a', 'staff')).toBe(true)
    expect(context.characterHasTrait('a', 'visitor')).toBe(false)
    expect(context.characterHasTrait('missing', 'staff')).toBe(false)
    expect(Object.isFrozen(context)).toBe(true)
  })

  it('creates isolated contexts and never reuses stale public-call state', () => {
    const first = fixture(), firstContext = createSolverEvaluationContext(first)
    const second = fixture(); second.board[0] = { ...second.board[0], zoneId: 'changed' }; second.characters[0] = { ...second.characters[0], traitIds: ['visitor'] }
    const secondContext = createSolverEvaluationContext(second)
    expect(firstContext.cellAt({ row: 1, column: 1 })?.zoneId).toBe('z')
    expect(secondContext.cellAt({ row: 1, column: 1 })?.zoneId).toBe('changed')
    expect(firstContext.characterHasTrait('a', 'staff')).toBe(true)
    expect(secondContext.characterHasTrait('a', 'staff')).toBe(false)
  })

  it('does not contaminate consecutive solves and preserves exact stats', () => {
    const first = solveCaseWithStats(case001, { maxSolutions: 2 })
    solveCaseWithStats(case002, { maxSolutions: 2 })
    expect(solveCaseWithStats(case001, { maxSolutions: 2 })).toEqual(first)
  })

  it('preserves solution order for maxSolutions 1 and 2 plus truncation', () => {
    const ambiguous = structuredClone(case001)
    for (const character of ambiguous.characters) character.clues = []
    ambiguous.globalClues = []
    const one = solveCaseWithStats(ambiguous, { maxSolutions: 1 })
    const two = solveCaseWithStats(ambiguous, { maxSolutions: 2 })
    expect(one.solutionsFound).toBe(1)
    expect(two.solutionsFound).toBe(2)
    expect(one.solutions).toEqual(two.solutions.slice(0, 1))
    expect(solveCaseWithStats(ambiguous, { maxSolutions: 2 })).toEqual(two)
    const truncated = solveCaseWithStats(ambiguous, { maxSolutions: 2, maxNodes: 1 })
    expect(truncated.truncated).toBe(true)
    expect(solveCaseWithStats(ambiguous, { maxSolutions: 2, maxNodes: 1 })).toEqual(truncated)
  })

  it('characterizes row-major corners, middle, last, holes, ordering, duplicates, empty boards, and 1x1', () => {
    const last = cell(3, 4, 'last'), first = cell(1, 1, 'first'), middle = cell(2, 3, 'middle'), otherCorner = cell(1, 4, 'corner')
    const duplicate = cell(2, 3, 'duplicate')
    const game = boardCase(3, 4, [last, middle, first, duplicate, otherCorner])
    const context = createSolverEvaluationContext(game)
    expect(context.cellAt({ row: 1, column: 1 })).toBe(first)
    expect(context.cellAt({ row: 1, column: 4 })).toBe(otherCorner)
    expect(context.cellAt({ row: 2, column: 3 })).toBe(middle)
    expect(context.cellAt({ row: 3, column: 4 })).toBe(last)
    expect(context.cellAt({ row: 2, column: 2 })).toBeUndefined()
    expect(createSolverEvaluationContext(boardCase(1, 1, [])).cellAt({ row: 1, column: 1 })).toBeUndefined()
    const only = cell(1, 1, 'only')
    expect(createSolverEvaluationContext(boardCase(1, 1, [only])).cellAt({ row: 1, column: 1 })).toBe(only)
  })

  it('covers the usual D1-D5 dimensions without depending on board order', () => {
    for (const preset of allDifficultyPresets) {
      const first = cell(1, 1, `d${preset.rating}-first`), last = cell(preset.rows, preset.columns, `d${preset.rating}-last`)
      const context = createSolverEvaluationContext(boardCase(preset.rows, preset.columns, [last, first]))
      expect(context.cellAt({ row: 1, column: 1 })).toBe(first)
      expect(context.cellAt({ row: preset.rows, column: preset.columns })).toBe(last)
      expect(context.cellAt({ row: Math.ceil(preset.rows / 2), column: Math.ceil(preset.columns / 2) })).toBeUndefined()
    }
  })

  it.each([
    ['row zero', 0, 1], ['column zero', 1, 0], ['negative row', -1, 1], ['negative column', 1, -1],
    ['row over dimensions', 3, 1], ['column over dimensions', 1, 3], ['fractional row', 1.5, 1], ['fractional column', 1, 1.5],
    ['NaN row', Number.NaN, 1], ['NaN column', 1, Number.NaN], ['positive infinity', Number.POSITIVE_INFINITY, 1],
    ['negative infinity', Number.NEGATIVE_INFINITY, 1], ['string row', '1', 1], ['string column', 1, '1'],
  ] as Array<[string, unknown, unknown]>)('preserves fallback Map semantics and first match for %s', (_name, row, column) => {
    const first = cell(row, column, 'first'), duplicate = cell(row, column, 'duplicate')
    const context = createSolverEvaluationContext(boardCase(2, 2, [first, duplicate]))
    expect(context.cellAt({ row, column } as never)).toBe(first)
  })

  it.each([
    ['zero rows', 0, 2], ['zero columns', 2, 0], ['negative rows', -1, 2], ['negative columns', 2, -1],
    ['fractional rows', 2.5, 2], ['fractional columns', 2, 2.5], ['NaN rows', Number.NaN, 2],
    ['infinite columns', 2, Number.POSITIVE_INFINITY], ['string rows', '2', 2],
    ['unsafe product', Number.MAX_SAFE_INTEGER, 2], ['above defensive limit', 65_537, 1],
  ] as Array<[string, unknown, unknown]>)('preserves full fallback and duplicates for malformed dimensions: %s', (_name, rows, columns) => {
    const first = cell(1, 1, 'first'), duplicate = cell(1, 1, 'duplicate')
    const context = createSolverEvaluationContext(boardCase(rows, columns, [first, duplicate]))
    expect(context.cellAt({ row: 1, column: 1 })).toBe(first)
    expect(context.cellAt({ row: 2, column: 2 })).toBeUndefined()
  })

  it('keeps out-of-range cells and duplicates addressable through the fallback', () => {
    const first = cell(9, 8, 'outside'), duplicate = cell(9, 8, 'duplicate')
    const context = createSolverEvaluationContext(boardCase(2, 2, [cell(1, 1, 'inside'), first, duplicate]))
    expect(context.cellAt({ row: 9, column: 8 })).toBe(first)
  })

  it('returns original references, observes their property mutation, and exposes no internal index', () => {
    const original = cell(1, 1, 'before'), game = boardCase(2, 2, [original])
    const context = createSolverEvaluationContext(game)
    expect(context.cellAt({ row: 1, column: 1 })).toBe(original)
    original.zoneId = 'after'
    expect(context.cellAt({ row: 1, column: 1 })?.zoneId).toBe('after')
    expect(Object.keys(context).sort()).toEqual(['cellAt', 'cellsByObjectId', 'characterById', 'characterHasTrait', 'surfaceByZoneId'].sort())
    expect(Object.values(context).every(value => typeof value === 'function')).toBe(true)
  })

  it('makes a fresh context observe board replacement and reordering without changing the old context', () => {
    const oldFirst = cell(1, 1, 'old'), oldDuplicate = cell(1, 1, 'old-duplicate')
    const game = boardCase(2, 2, [oldFirst, oldDuplicate]), oldContext = createSolverEvaluationContext(game)
    const newFirst = cell(1, 1, 'new')
    game.board = [newFirst, oldFirst]
    const newContext = createSolverEvaluationContext(game)
    expect(oldContext.cellAt({ row: 1, column: 1 })).toBe(oldFirst)
    expect(newContext.cellAt({ row: 1, column: 1 })).toBe(newFirst)
  })
})
