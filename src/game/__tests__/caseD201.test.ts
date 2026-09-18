import { describe, expect, it } from 'vitest'
import { caseD201 } from '../../data/cases/caseD201'
import { getManualNormalCase } from '../../data/cases/manualNormalCases'
import { areAllCluesSatisfied } from '../clues'
import { resolveObjectVisualProfile } from '../objects/appearanceCatalog'
import { isFootprintReservedCell, isObjectPositionOccupiable } from '../objects/footprints'
import { findKiller, placementsEqual } from '../rules'
import { solveCaseWithStats } from '../solver'
import { validateCaseDefinition } from '../validation'

describe('manual D2 case 01', () => {
  it('is registered as D2/C01 and has a valid, canonical unique solution', () => {
    expect(getManualNormalCase(2, 1)).toBe(caseD201)
    expect(validateCaseDefinition(caseD201)).toEqual([])
    const solved = solveCaseWithStats(caseD201)
    expect(solved.truncated).not.toBe(true)
    expect(solved.solutionsFound).toBe(1)
    expect(placementsEqual(solved.solutions[0], caseD201.solution)).toBe(true)
    expect(areAllCluesSatisfied(caseD201, caseD201.solution)).toBe(true)
    expect(findKiller(caseD201, caseD201.solution)?.id).toBe('irene')
  })

  it('uses exactly the five approved terminal assets with their manifest footprints and occupation', () => {
    const conveyor = caseD201.board.filter(cell => cell.object?.id === 'baggageConveyor')
    expect(conveyor.map(cell => `${cell.row}:${cell.column}`)).toEqual(['1:1', '1:2'])
    expect(conveyor.every(cell => cell.occupiable === false)).toBe(true)
    expect(isFootprintReservedCell(conveyor[1].object, conveyor[1])).toBe(true)

    const bench = caseD201.board.filter(cell => cell.object?.id === 'departureBench')
    expect(bench.map(cell => `${cell.row}:${cell.column}`)).toEqual(['3:2', '3:3'])
    expect(bench.every(cell => isObjectPositionOccupiable(cell.object!, cell))).toBe(true)
    expect(bench.every(cell => cell.occupiable)).toBe(true)

    const scanner = caseD201.board.find(cell => cell.object?.id === 'securityScanner')!
    const kiosk = caseD201.board.find(cell => cell.object?.id === 'checkinKiosk')!
    const drone = caseD201.board.find(cell => cell.object?.id === 'luggageDrone')!
    for (const cell of [scanner, kiosk, drone]) expect(cell.occupiable).toBe(false)
    expect(resolveObjectVisualProfile(scanner.object!)).toBe('tall')
    expect(resolveObjectVisualProfile(kiosk.object!)).toBe('tall')
    expect(resolveObjectVisualProfile(drone.object!)).toBe('compact')
  })

  it('keeps the victim clue-free and leaves only Irene with Alma in Llegadas', () => {
    expect(caseD201.characters.find(character => character.isVictim)?.clues).toEqual([])
    const arrivals = caseD201.solution.filter(placement => caseD201.board.find(cell => cell.row === placement.position.row && cell.column === placement.position.column)?.zoneId === 'arrivals')
    expect(arrivals.map(placement => placement.characterId).sort()).toEqual(['alma', 'irene'])
  })

  it('keeps all zone labels anchored to free cells in their own zone', () => {
    for (const zone of caseD201.zones) {
      const anchor = zone.labelAnchor!.position
      const cell = caseD201.board.find(candidate => candidate.row === anchor.row && candidate.column === anchor.column)!
      expect(cell.zoneId).toBe(zone.id)
      expect(cell.object).toBeUndefined()
      expect(caseD201.solution.some(placement => placement.position.row === anchor.row && placement.position.column === anchor.column)).toBe(false)
    }
  })
})
