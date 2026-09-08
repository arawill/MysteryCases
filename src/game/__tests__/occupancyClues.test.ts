import { describe, expect, it } from 'vitest'
import { evaluateClue } from '../clues'
import { evaluateGlobalClue } from '../globalClues'
import { reviewInvestigation } from '../hints'
import { solveCase } from '../solver'
import type { GameCase, Placement } from '../types'
import { validateCaseDefinition } from '../validation'

const placements: Placement[] = [{ characterId: 'a', position: { row: 1, column: 1 } }, { characterId: 'b', position: { row: 2, column: 2 } }, { characterId: 'c', position: { row: 3, column: 3 } }]
const fixture = (): GameCase => ({ id: 'occupancy', title: 'Occupancy', intro: 'Test', difficulty: 1, rows: 3, columns: 3, zones: [{ id: 'z', name: 'Z', tone: 'z' }, { id: 'o', name: 'O', tone: 'o' }], board: [
  { row: 1, column: 1, zoneId: 'z', occupiable: true, object: { id: 'chair', label: 'chair', icon: '', occupiable: true } }, { row: 1, column: 2, zoneId: 'z', occupiable: true }, { row: 1, column: 3, zoneId: 'z', occupiable: true },
  { row: 2, column: 1, zoneId: 'z', occupiable: true, object: { id: 'chair', label: 'chair', icon: '', occupiable: true } }, { row: 2, column: 2, zoneId: 'z', occupiable: true }, { row: 2, column: 3, zoneId: 'z', occupiable: true },
  { row: 3, column: 1, zoneId: 'z', occupiable: true }, { row: 3, column: 2, zoneId: 'z', occupiable: true }, { row: 3, column: 3, zoneId: 'o', occupiable: true },
], characters: [
  { id: 'a', name: 'A', avatar: 'A', isVictim: false, clues: [{ id: 'a-row', type: 'row', row: 1, text: 'row' }, { id: 'a-together', type: 'notAloneInZone', text: 'together' }] },
  { id: 'b', name: 'B', avatar: 'B', isVictim: true, clues: [{ id: 'b-row', type: 'row', row: 2, text: 'row' }, { id: 'b-col', type: 'column', column: 2, text: 'col' }] },
  { id: 'c', name: 'C', avatar: 'C', isVictim: false, clues: [{ id: 'c-row', type: 'row', row: 3, text: 'row' }, { id: 'c-col', type: 'column', column: 3, text: 'col' }] },
], solution: placements, globalClues: [{ id: 'chairs', type: 'objectOccupancyCount', objectId: 'chair', count: 1, text: 'one chair' }, { id: 'empty', type: 'emptyZoneCount', count: 0, text: 'no empty zones' }] })

describe('occupancy and global clues', () => {
  it('uses monotonic tri-state semantics for character occupancy', () => {
    const game = fixture(), alone = { id: 'alone', type: 'aloneInZone' as const, text: 'alone' }, notAlone = { id: 'not-alone', type: 'notAloneInZone' as const, text: 'together' }, count = { id: 'count', type: 'ownZoneOccupancyCount' as const, count: 2, text: 'two' }
    expect(evaluateClue(alone, 'a', game, [])).toBe('undetermined')
    expect(evaluateClue(alone, 'a', game, placements.slice(0, 1))).toBe('undetermined')
    expect(evaluateClue(alone, 'a', game, placements.slice(0, 2))).toBe('violated')
    expect(evaluateClue(notAlone, 'a', game, placements.slice(0, 1))).toBe('undetermined')
    expect(evaluateClue(notAlone, 'a', game, placements.slice(0, 2))).toBe('satisfied')
    expect(evaluateClue(count, 'a', game, placements.slice(0, 1))).toBe('undetermined')
    expect(evaluateClue(count, 'a', game, placements.slice(0, 2))).toBe('undetermined')
    expect(evaluateClue(count, 'a', game, [{ ...placements[0] }, { ...placements[1] }, { characterId: 'c', position: { row: 3, column: 1 } }])).toBe('violated')
  })

  it('evaluates global counts and review prioritises characters then global evidence', () => {
    const game = fixture(), chair = game.globalClues?.[0], empty = game.globalClues?.[1]
    expect(evaluateGlobalClue(chair!, game, placements.slice(0, 1))).toBe('undetermined')
    expect(evaluateGlobalClue(chair!, game, [{ ...placements[0] }, { characterId: 'b', position: { row: 2, column: 1 } }])).toBe('violated')
    expect(evaluateGlobalClue(empty!, game, placements.slice(0, 1))).toBe('undetermined')
    expect(evaluateGlobalClue(empty!, game, placements)).toBe('satisfied')
    expect(reviewInvestigation(game, [{ ...placements[0] }, { characterId: 'b', position: { row: 3, column: 1 } }])).toMatchObject({ status: 'contradiction', source: 'character' })
    const globalOnly = { ...game, characters: game.characters.map(character => ({ ...character, clues: [] })) }
    expect(reviewInvestigation(globalOnly, [{ ...placements[0] }, { characterId: 'b', position: { row: 2, column: 1 } }])).toMatchObject({ status: 'contradiction', source: 'global', globalClueId: 'chairs' })
  })

  it('validates globals and prunes an occupancy contradiction in a unique case', () => {
    const game = fixture()
    expect(validateCaseDefinition(game)).toEqual([])
    expect(solveCase(game, { maxSolutions: 2 }).solutionsFound).toBe(1)
    const invalid = fixture(); invalid.characters[0].clues[1] = { id: 'bad-own', type: 'ownZoneOccupancyCount', count: 0, text: 'bad' }; invalid.globalClues = [{ id: 'a-row', type: 'emptyZoneCount', count: -1, text: 'bad' }, { id: 'bad-zone', type: 'zoneOccupancyCount', zoneId: 'missing', count: 4, text: 'bad' }, { id: 'bad-object', type: 'objectOccupancyCount', objectId: 'chair', count: 3, text: 'bad' }]
    expect(validateCaseDefinition(invalid).length).toBeGreaterThan(0)
  })
})
