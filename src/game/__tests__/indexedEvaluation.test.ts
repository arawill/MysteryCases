import { describe, expect, it } from 'vitest'
import { evaluateAllClues, evaluateAllCluesWithContext, evaluateClue, evaluateClueWithContext } from '../clues'
import { evaluateAllGlobalClues, evaluateAllGlobalCluesWithContext, evaluateGlobalClue, evaluateGlobalClueWithContext } from '../globalClues'
import { createSolverEvaluationContext } from '../solverEvaluationContext'
import type { Clue, GameCase, GlobalClue, Placement } from '../types'

const placements: Placement[] = [
  { characterId: 'a', position: { row: 1, column: 1 } },
  { characterId: 'b', position: { row: 2, column: 2 } },
  { characterId: 'c', position: { row: 3, column: 3 } },
  { characterId: 'd', position: { row: 4, column: 4 } },
]
const clues = (): Clue[] => [
  { id: 'row', type: 'row', row: 1, text: '' },
  { id: 'column', type: 'column', column: 1, text: '' },
  { id: 'zone', type: 'zone', zoneId: 'wood', text: '' },
  { id: 'object', type: 'onObject', objectId: 'chair', text: '' },
  { id: 'beside-object', type: 'besideObject', objectId: 'bench', text: '' },
  { id: 'north', type: 'northOfCharacter', targetCharacterId: 'b', text: '' },
  { id: 'south', type: 'southOfCharacter', targetCharacterId: 'b', text: '' },
  { id: 'same-zone', type: 'sameZoneAsCharacter', targetCharacterId: 'b', text: '' },
  { id: 'beside-character', type: 'besideCharacter', targetCharacterId: 'b', text: '' },
  { id: 'not-zone', type: 'notZone', zoneId: 'tile', text: '' },
  { id: 'not-object', type: 'notOnObject', objectId: 'bench', text: '' },
  { id: 'not-beside-object', type: 'notBesideObject', objectId: 'missing', text: '' },
  { id: 'offset', type: 'rowOffsetFromCharacter', targetCharacterId: 'b', rowOffset: -1, text: '' },
  { id: 'board-corner', type: 'cornerOfBoard', text: '' },
  { id: 'zone-corner', type: 'cornerOfZone', text: '' },
  { id: 'wall', type: 'besideWall', text: '' },
  { id: 'not-wall', type: 'notBesideWall', text: '' },
  { id: 'edge', type: 'besideEdgeFeature', featureType: 'window', text: '' },
  { id: 'not-edge', type: 'notBesideEdgeFeature', featureType: 'door', text: '' },
  { id: 'with-trait', type: 'withTraitInZone', traitId: 'visitor', text: '' },
  { id: 'without-trait', type: 'withoutTraitInZone', traitId: 'missing', text: '' },
  { id: 'trait-count', type: 'companionTraitCount', traitId: 'visitor', count: 1, text: '' },
  { id: 'zones', type: 'oneOfZones', zoneIds: ['wood', 'tile'], text: '' },
  { id: 'objects', type: 'oneOfObjects', objectIds: ['chair', 'bench'], text: '' },
  { id: 'alone', type: 'aloneInZone', text: '' },
  { id: 'not-alone', type: 'notAloneInZone', text: '' },
  { id: 'own-count', type: 'ownZoneOccupancyCount', count: 2, text: '' },
  { id: 'same-column-object', type: 'sameColumnAsObject', objectId: 'chair', zoneRelation: 'same', text: '' },
  { id: 'relative-object', type: 'relativeToObject', objectId: 'bench', direction: 'northWest', zoneRelation: 'same', text: '' },
  { id: 'surface', type: 'onSurface', surface: 'wood', text: '' },
  { id: 'missing-zone', type: 'zone', zoneId: 'missing', text: '' },
  { id: 'missing-object', type: 'onObject', objectId: 'missing', text: '' },
]
const globalClues = (): GlobalClue[] => [
  { id: 'empty', type: 'emptyZoneCount', count: 0, text: '' },
  { id: 'zone-count', type: 'zoneOccupancyCount', zoneId: 'wood', count: 2, text: '' },
  { id: 'object-count', type: 'objectOccupancyCount', objectId: 'chair', count: 1, text: '' },
  { id: 'zone-trait', type: 'zoneTraitCount', zoneId: 'wood', traitId: 'staff', count: 1, text: '' },
  { id: 'surface-count', type: 'surfaceOccupancyCount', surface: 'wood', count: 2, text: '' },
]
const fixture = (): GameCase => ({
  id: 'indexed', title: '', intro: '', difficulty: 3, rows: 4, columns: 4,
  zones: [{ id: 'wood', name: 'Wood', tone: 'cafe' }, { id: 'tile', name: 'Tile', tone: 'x', surface: 'tile' }],
  board: Array.from({ length: 16 }, (_, index) => {
    const row = Math.floor(index / 4) + 1, column = index % 4 + 1
    const object = row === 1 && column === 1
      ? { id: 'chair', label: 'Chair', icon: '', occupiable: true }
      : row === 1 && (column === 2 || column === 3)
        ? { id: 'bench', label: 'Bench', icon: '', occupiable: true, footprint: { id: 'bench-footprint', positions: [{ row: 1, column: 2 }, { row: 1, column: 3 }] } }
        : undefined
    return { row, column, zoneId: row <= 2 ? 'wood' : 'tile', occupiable: true, ...(object ? { object } : {}) }
  }),
  edgeFeatures: [{ id: 'window', type: 'window', label: 'Window', segments: [{ position: { row: 1, column: 1 }, side: 'N' }] }],
  traitDefinitions: [{ id: 'staff', label: 'Staff' }, { id: 'visitor', label: 'Visitor' }],
  characters: [
    { id: 'a', name: 'A', avatar: '', isVictim: false, traitIds: ['staff'], clues: clues() },
    { id: 'b', name: 'B', avatar: '', isVictim: true, traitIds: ['visitor'], clues: [] },
    { id: 'c', name: 'C', avatar: '', isVictim: false, traitIds: ['staff'], clues: [] },
    { id: 'd', name: 'D', avatar: '', isVictim: false, traitIds: null as unknown as string[], clues: [] },
  ],
  solution: placements,
  globalClues: globalClues(),
})

describe('indexed evaluator equivalence', () => {
  it.each([[[]], [placements.slice(0, 2)], [placements]] as Array<[Placement[]]>)('matches every character and global clue for empty, partial, and complete placements', current => {
    const game = fixture(), context = createSolverEvaluationContext(game)
    for (const clue of clues()) expect(evaluateClueWithContext(clue, 'a', game, current, context)).toBe(evaluateClue(clue, 'a', game, current))
    for (const clue of globalClues()) expect(evaluateGlobalClueWithContext(clue, game, current, context)).toBe(evaluateGlobalClue(clue, game, current))
    expect(evaluateAllCluesWithContext(game, current, context)).toEqual(evaluateAllClues(game, current))
    expect(evaluateAllGlobalCluesWithContext(game, current, context)).toEqual(evaluateAllGlobalClues(game, current))
  })

  it('preserves missing coordinates and absent optional arrays', () => {
    const game = fixture(); delete game.edgeFeatures; delete game.globalClues; delete game.traitDefinitions
    const current = [{ characterId: 'a', position: { row: 99, column: 99 } }], context = createSolverEvaluationContext(game)
    for (const clue of clues()) expect(evaluateClueWithContext(clue, 'a', game, current, context)).toBe(evaluateClue(clue, 'a', game, current))
    expect(evaluateAllGlobalCluesWithContext(game, current, context)).toEqual(evaluateAllGlobalClues(game, current))
  })

  it('preserves first matches and ordered object collections with duplicate invalid data', () => {
    const game = fixture()
    game.board.push({ ...game.board[0], zoneId: 'tile', object: { id: 'bench', label: 'Duplicate', icon: '', occupiable: true } })
    game.characters.push({ ...game.characters[0], name: 'Duplicate', traitIds: ['visitor'] })
    game.zones.push({ ...game.zones[0], name: 'Duplicate', surface: 'tile' })
    const context = createSolverEvaluationContext(game)
    for (const clue of clues()) expect(evaluateClueWithContext(clue, 'a', game, placements, context)).toBe(evaluateClue(clue, 'a', game, placements))
    for (const clue of globalClues()) expect(evaluateGlobalClueWithContext(clue, game, placements, context)).toBe(evaluateGlobalClue(clue, game, placements))
  })

  it('keeps unsupported-type exception messages identical', () => {
    const game = fixture(), context = createSolverEvaluationContext(game)
    const unsupportedClue = { id: 'future', type: 'futureClue', text: '' } as unknown as Clue
    const unsupportedGlobal = { id: 'future-global', type: 'futureGlobal', text: '' } as unknown as GlobalClue
    expect(() => evaluateClue(unsupportedClue, 'a', game, placements)).toThrowError('Unsupported clue type: futureClue')
    expect(() => evaluateClueWithContext(unsupportedClue, 'a', game, placements, context)).toThrowError('Unsupported clue type: futureClue')
    expect(() => evaluateGlobalClue(unsupportedGlobal, game, placements)).toThrowError('Unsupported global clue type: futureGlobal')
    expect(() => evaluateGlobalClueWithContext(unsupportedGlobal, game, placements, context)).toThrowError('Unsupported global clue type: futureGlobal')
  })

  it('keeps public calls live after case mutation while a fresh solve context sees the new case', () => {
    const game = fixture(), row = clues()[0]
    expect(evaluateClue(row, 'a', game, placements)).toBe('satisfied')
    game.board[0] = { ...game.board[0], row: 2 }
    expect(evaluateClue(row, 'a', game, placements)).toBe('undetermined')
    const context = createSolverEvaluationContext(game)
    expect(evaluateClueWithContext(row, 'a', game, placements, context)).toBe('undetermined')
  })
})
