import { describe, expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { case002 } from '../../data/cases/case002'
import { solveCaseWithStats } from '../solver'
import { createSolverEvaluationContext } from '../solverEvaluationContext'
import type { GameCase } from '../types'

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
})
