import { describe, expect, it } from 'vitest'
import { evaluateClue } from '../clues'
import { solveCase } from '../solver'
import { isBesideWall, isBoardCorner, isWallSide, isZoneCorner } from '../spatial'
import type { BoardCell, GameCase, Placement } from '../types'
import { validateCaseDefinition } from '../validation'

const cells = (): BoardCell[] => Array.from({ length: 9 }, (_, index) => ({ row: Math.floor(index / 3) + 1, column: index % 3 + 1, zoneId: index === 8 ? 'other' : 'main', occupiable: true }))
const solution: Placement[] = [{ characterId: 'a', position: { row: 1, column: 1 } }, { characterId: 'b', position: { row: 2, column: 2 } }, { characterId: 'c', position: { row: 3, column: 3 } }]
const advancedCase = (): GameCase => ({ id: 'advanced-test', title: 'Test', intro: 'Test', difficulty: 1, rows: 3, columns: 3, zones: [{ id: 'main', name: 'Main', tone: 'main' }, { id: 'other', name: 'Other', tone: 'other' }], board: cells(), characters: [
  { id: 'a', name: 'A', avatar: 'A', isVictim: false, clues: [{ id: 'a-row', type: 'row', row: 1, text: 'row' }, { id: 'a-column', type: 'column', column: 1, text: 'column' }, { id: 'a-corner', type: 'cornerOfBoard', text: 'corner' }] },
  { id: 'b', name: 'B', avatar: 'B', isVictim: true, clues: [{ id: 'b-offset', type: 'rowOffsetFromCharacter', targetCharacterId: 'a', rowOffset: 1, text: 'offset' }, { id: 'b-column', type: 'column', column: 2, text: 'column' }, { id: 'b-open', type: 'notBesideWall', text: 'open' }] },
  { id: 'c', name: 'C', avatar: 'C', isVictim: false, clues: [{ id: 'c-zone', type: 'zone', zoneId: 'other', text: 'zone' }, { id: 'c-row', type: 'row', row: 3, text: 'row' }, { id: 'c-objects', type: 'oneOfZones', zoneIds: ['main', 'other'], text: 'zones' }] },
], solution })

describe('advanced spatial clues', () => {
  it('recognises board corners, walls and irregular zone corners', () => {
    const board = cells(), at = (row: number, column: number) => board.find(cell => cell.row === row && cell.column === column) as BoardCell
    expect([[1, 1], [1, 3], [3, 1], [3, 3]].every(([row, column]) => isBoardCorner(at(row, column), 3, 3))).toBe(true)
    expect(isBoardCorner(at(1, 2), 3, 3)).toBe(false)
    expect(isWallSide(at(1, 2), 'N', board)).toBe(true)
    expect(isWallSide(at(2, 3), 'E', board)).toBe(true)
    expect(isWallSide(at(2, 2), 'N', board)).toBe(false)
    at(1, 2).object = { id: 'cabinet', label: 'cabinet', icon: '', occupiable: false }
    expect(isWallSide(at(2, 2), 'N', board)).toBe(false)
    expect(isBesideWall(at(2, 2), board)).toBe(false)
    expect(isZoneCorner(at(3, 3), board)).toBe(true)
    expect(isZoneCorner(at(2, 2), board)).toBe(false)
  })

  it('evaluates offset, walls and disjunctions with tri-state semantics', () => {
    const game = advancedCase()
    const offset = game.characters[1].clues[0], wall = { id: 'wall', type: 'besideWall' as const, text: 'wall' }, notWall = { id: 'not-wall', type: 'notBesideWall' as const, text: 'open' }, zones = { id: 'zones', type: 'oneOfZones' as const, zoneIds: ['main', 'other'], text: 'zones' }
    expect(evaluateClue(offset, 'b', game, [])).toBe('undetermined')
    expect(evaluateClue(offset, 'b', game, [{ characterId: 'b', position: { row: 2, column: 3 } }])).toBe('undetermined')
    expect(evaluateClue(offset, 'b', game, solution.slice(0, 2))).toBe('satisfied')
    expect(evaluateClue(offset, 'b', game, [{ characterId: 'a', position: { row: 1, column: 3 } }, { characterId: 'b', position: { row: 3, column: 1 } }])).toBe('violated')
    expect(evaluateClue(wall, 'a', game, solution)).toBe('satisfied')
    expect(evaluateClue(notWall, 'b', game, solution)).toBe('satisfied')
    expect(evaluateClue(zones, 'c', game, solution)).toBe('satisfied')
    expect(evaluateClue({ id: 'objects', type: 'oneOfObjects', objectIds: ['x', 'y'], text: 'objects' }, 'a', game, solution)).toBe('violated')
    game.board[0].object = { id: 'chair', label: 'chair', icon: '', occupiable: true }
    game.board[4].object = { id: 'table', label: 'table', icon: '', occupiable: true }
    expect(evaluateClue({ id: 'included', type: 'oneOfObjects', objectIds: ['chair', 'bed'], text: 'objects' }, 'a', game, solution)).toBe('satisfied')
    expect(evaluateClue({ id: 'different', type: 'oneOfObjects', objectIds: ['chair', 'bed'], text: 'objects' }, 'b', game, solution)).toBe('violated')
  })

  it('validates new clue parameters and solves a unique mixed case', () => {
    const game = advancedCase()
    expect(validateCaseDefinition(game)).toEqual([])
    const solved = solveCase(game, { maxSolutions: 2 })
    expect(solved.solutionsFound).toBe(1)
    expect(solved.solutions[0]).toEqual(solution)
    const invalid = advancedCase()
    invalid.characters[1].clues[0] = { id: 'bad-offset', type: 'rowOffsetFromCharacter', targetCharacterId: 'b', rowOffset: 0, text: 'bad' }
    invalid.characters[2].clues[2] = { id: 'bad-zones', type: 'oneOfZones', zoneIds: ['missing'], text: 'bad' }
    invalid.characters[0].clues.push({ id: 'bad-objects', type: 'oneOfObjects', objectIds: ['x', 'x'], text: 'bad' })
    const errors = validateCaseDefinition(invalid)
    expect(errors.some(error => error.includes('offset de fila inválido'))).toBe(true)
    expect(errors.some(error => error.includes('propio personaje'))).toBe(true)
    expect(errors.some(error => error.includes('al menos dos zona'))).toBe(true)
    expect(errors.some(error => error.includes('zona inexistente'))).toBe(true)
    expect(errors.some(error => error.includes('repetir objeto'))).toBe(true)
    for (const clue of [
      { id: 'empty-zones', type: 'oneOfZones' as const, zoneIds: [], text: 'bad' },
      { id: 'duplicate-zones', type: 'oneOfZones' as const, zoneIds: ['main', 'main'], text: 'bad' },
      { id: 'empty-objects', type: 'oneOfObjects' as const, objectIds: [], text: 'bad' },
      { id: 'single-object', type: 'oneOfObjects' as const, objectIds: ['x'], text: 'bad' },
    ]) { const candidate = advancedCase(); candidate.characters[0].clues.push(clue); expect(validateCaseDefinition(candidate).length).toBeGreaterThan(0) }
  })
})
