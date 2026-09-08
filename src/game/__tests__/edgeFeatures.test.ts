import { describe, expect, it } from 'vitest'
import { evaluateClue } from '../clues'
import { adjacentCellsForEdgeSegment, areCollinearContiguousEdgeSegments, edgeSegmentKey, isCellBesideEdgeFeature } from '../edgeFeatures'
import { findKiller } from '../rules'
import { solveCase } from '../solver'
import type { BoardCell, EdgeFeature, GameCase, Placement } from '../types'
import { validateCaseDefinition } from '../validation'
import { case001 } from '../../data/cases/case001'

const solution: Placement[] = [
  { characterId: 'a', position: { row: 1, column: 2 } },
  { characterId: 'b', position: { row: 2, column: 1 } },
  { characterId: 'c', position: { row: 3, column: 3 } },
]

const board = (): BoardCell[] => Array.from({ length: 9 }, (_, index) => {
  const row = Math.floor(index / 3) + 1, column = index % 3 + 1
  return { row, column, zoneId: column === 3 ? 'right' : 'left', occupiable: true }
})

const fixture = (): GameCase => ({
  id: 'edges', title: 'Edges', intro: 'Test', difficulty: 1, rows: 3, columns: 3,
  zones: [{ id: 'left', name: 'Left', tone: 'left' }, { id: 'right', name: 'Right', tone: 'right' }],
  board: board(),
  edgeFeatures: [
    { id: 'window-top', type: 'window', label: 'Ventanal', segments: [{ position: { row: 1, column: 2 }, side: 'N' }] },
    { id: 'door-room', type: 'door', label: 'Puerta del archivo', segments: [{ position: { row: 2, column: 2 }, side: 'E' }] },
  ],
  characters: [
    { id: 'a', name: 'A', avatar: 'A', isVictim: false, clues: [{ id: 'a-row', type: 'row', row: 1, text: 'row' }, { id: 'a-window', type: 'besideEdgeFeature', featureType: 'window', text: 'window' }] },
    { id: 'b', name: 'B', avatar: 'B', isVictim: true, clues: [{ id: 'b-row', type: 'row', row: 2, text: 'row' }, { id: 'b-column', type: 'column', column: 1, text: 'column' }] },
    { id: 'c', name: 'C', avatar: 'C', isVictim: false, clues: [{ id: 'c-row', type: 'row', row: 3, text: 'row' }, { id: 'c-column', type: 'column', column: 3, text: 'column' }] },
  ],
  solution,
})

const cell = (game: GameCase, row: number, column: number) => {
  const found = game.board.find(candidate => candidate.row === row && candidate.column === column)
  if (!found) throw new Error('Celda de prueba no encontrada.')
  return found
}

describe('edge features', () => {
  it('normalizes equivalent E/W and N/S physical edges', () => {
    expect(edgeSegmentKey({ position: { row: 2, column: 1 }, side: 'E' })).toBe(edgeSegmentKey({ position: { row: 2, column: 2 }, side: 'W' }))
    expect(edgeSegmentKey({ position: { row: 1, column: 2 }, side: 'S' })).toBe(edgeSegmentKey({ position: { row: 2, column: 2 }, side: 'N' }))
  })

  it('finds cells adjacent to exterior and internal edge features', () => {
    const game = fixture(), window = game.edgeFeatures?.[0], door = game.edgeFeatures?.[1]
    if (!window || !door) throw new Error('Features de prueba no encontrados.')
    expect(adjacentCellsForEdgeSegment(window.segments[0], game.board).map(item => `${item.row}:${item.column}`)).toEqual(['1:2'])
    expect(adjacentCellsForEdgeSegment(door.segments[0], game.board).map(item => `${item.row}:${item.column}`)).toEqual(['2:2', '2:3'])
    expect(isCellBesideEdgeFeature(cell(game, 2, 2), door, game.board)).toBe(true)
    expect(isCellBesideEdgeFeature(cell(game, 2, 3), door, game.board)).toBe(true)
  })

  it('evaluates positive and negative window and door clues with tri-state semantics', () => {
    const game = fixture()
    const window = { id: 'window', type: 'besideEdgeFeature' as const, featureType: 'window' as const, text: 'window' }
    const notWindow = { id: 'not-window', type: 'notBesideEdgeFeature' as const, featureType: 'window' as const, text: 'not window' }
    const door = { id: 'door', type: 'besideEdgeFeature' as const, featureType: 'door' as const, text: 'door' }
    expect(evaluateClue(window, 'a', game, [])).toBe('undetermined')
    expect(evaluateClue(window, 'a', game, solution)).toBe('satisfied')
    expect(evaluateClue(window, 'a', game, [{ characterId: 'a', position: { row: 2, column: 1 } }])).toBe('violated')
    expect(evaluateClue(notWindow, 'a', game, solution)).toBe('violated')
    expect(evaluateClue(notWindow, 'a', game, [{ characterId: 'a', position: { row: 2, column: 1 } }])).toBe('satisfied')
    expect(evaluateClue(door, 'a', game, [{ characterId: 'a', position: { row: 2, column: 2 } }])).toBe('satisfied')
    expect(evaluateClue(door, 'a', game, [{ characterId: 'a', position: { row: 2, column: 3 } }])).toBe('satisfied')
  })

  it('validates walls, wide geometry, duplicate physical edges and clue references', () => {
    const valid = fixture()
    expect(validateCaseDefinition(valid)).toEqual([])
    const wide: EdgeFeature = { id: 'wide-window', type: 'window', label: 'Ventanal doble', segments: [{ position: { row: 1, column: 1 }, side: 'N' }, { position: { row: 1, column: 2 }, side: 'N' }] }
    expect(areCollinearContiguousEdgeSegments(wide.segments[0], wide.segments[1])).toBe(true)
    const lShape = [{ position: { row: 1, column: 1 }, side: 'N' as const }, { position: { row: 1, column: 1 }, side: 'W' as const }]
    const separate = [{ position: { row: 1, column: 1 }, side: 'N' as const }, { position: { row: 1, column: 3 }, side: 'N' as const }]
    expect(areCollinearContiguousEdgeSegments(lShape[0], lShape[1])).toBe(false)
    expect(areCollinearContiguousEdgeSegments(separate[0], separate[1])).toBe(false)
    const invalid = fixture()
    invalid.edgeFeatures = [wide, { id: 'first-edge', type: 'door', label: 'Original', segments: [{ position: { row: 2, column: 2 }, side: 'E' }] }, { id: 'same-edge', type: 'door', label: 'Duplicada', segments: [{ position: { row: 2, column: 3 }, side: 'W' }] }, { id: 'interior', type: 'window', label: 'Interior', segments: [{ position: { row: 2, column: 1 }, side: 'E' }] }]
    invalid.board.find(item => item.row === 2 && item.column === 2)!.object = { id: 'cabinet', label: 'Cabinet', icon: '', occupiable: false }
    invalid.board.find(item => item.row === 2 && item.column === 2)!.occupiable = false
    invalid.characters[0].clues.push({ id: 'missing-window', type: 'besideEdgeFeature', featureType: 'window', text: 'still present' })
    const errors = validateCaseDefinition(invalid).join(' ')
    expect(errors).toContain('duplica un borde físico')
    expect(errors).toContain('no está sobre una pared')
    const malformed = fixture()
    malformed.edgeFeatures = [
      { id: 'l-shape', type: 'window', label: 'L', segments: lShape },
      { id: 'separated', type: 'door', label: 'Separada', segments: separate },
      { id: 'repeated', type: 'window', label: 'Repetida', segments: [{ position: { row: 1, column: 1 }, side: 'N' }, { position: { row: 1, column: 1 }, side: 'N' }] },
    ]
    const malformedErrors = validateCaseDefinition(malformed).join(' ')
    expect(malformedErrors).toContain('colineales y contiguos')
    expect(malformedErrors).toContain('duplica un borde físico')
    const invalidReference = fixture()
    invalidReference.edgeFeatures = []
    invalidReference.characters[0].clues[1] = { id: 'bad-type', type: 'besideEdgeFeature', featureType: 'arch' as never, text: 'bad' }
    expect(() => validateCaseDefinition(invalidReference)).not.toThrow()
    expect(validateCaseDefinition(invalidReference).join(' ')).toContain('tipo de edge feature inválido')
  })

  it.each([
    ['edgeFeatures no es un array', {} as unknown as EdgeFeature[]],
    ['segments es null', [{ id: 'bad-window', type: 'window', label: 'Ventana', segments: null }] as unknown as EdgeFeature[]],
    ['position de segmento es null', [{ id: 'bad-window', type: 'window', label: 'Ventana', segments: [{ position: null, side: 'N' }] }] as unknown as EdgeFeature[]],
  ])('does not throw while validating runtime-corrupt edge features: %s', (_label, edgeFeatures) => {
    const corrupt = fixture()
    corrupt.edgeFeatures = edgeFeatures
    const validate = () => validateCaseDefinition(corrupt)
    expect(validate).not.toThrow()
    expect(validate().length).toBeGreaterThan(0)
  })

  it('solves the unique synthetic case and leaves case001 backward compatible', () => {
    const game = fixture(), solved = solveCase(game, { maxSolutions: 2 })
    expect(solved.solutionsFound).toBe(1)
    expect(solved.solutions[0]).toEqual(solution)
    expect(findKiller(game, game.solution)?.id).toBe('a')
    expect(validateCaseDefinition(case001)).toEqual([])
    expect(solveCase(case001).solutionsFound).toBe(1)
    expect(findKiller(case001, case001.solution)?.id).toBe('bruno')
  })
})
