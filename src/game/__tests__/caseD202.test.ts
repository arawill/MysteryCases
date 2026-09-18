import { describe, expect, it } from 'vitest'
import { caseD202 } from '../../data/cases/caseD202'
import { getManualNormalCase } from '../../data/cases/manualNormalCases'
import { nameCatalog } from '../characters/nameCatalog'
import { areAllCluesSatisfied } from '../clues'
import { resolveObjectVisualProfile } from '../objects/appearanceCatalog'
import { getObjectFootprintBounds, isFootprintReservedCell, isObjectPositionOccupiable } from '../objects/footprints'
import { findKiller, placementsEqual } from '../rules'
import { solveCaseWithStats } from '../solver'
import { validateCaseDefinition } from '../validation'

const objectCells = (id: string) => caseD202.board.filter(cell => cell.object?.id === id)

describe('manual D2 case 02', () => {
  it('is registered as a 7×7 D2 case with seven canonical rows and columns', () => {
    expect(getManualNormalCase(2, 2)).toBe(caseD202)
    expect(caseD202.rows).toBe(7)
    expect(caseD202.columns).toBe(7)
    expect(caseD202.board).toHaveLength(49)
    expect(caseD202.characters).toHaveLength(7)
    expect(caseD202.characters.filter(character => character.isVictim)).toHaveLength(1)
    expect(caseD202.solution.some(placement => placement.characterId === 'female-035')).toBe(true)
    expect(caseD202.solution.map(placement => placement.position.row).sort((first, second) => first - second)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(caseD202.solution.map(placement => placement.position.column).sort((first, second) => first - second)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(caseD202.characters.every(character => nameCatalog.some(entry => entry.id === character.id && entry.name === character.name))).toBe(true)
  })

  it('uses all five approved objects as non-occupiable, non-overlapping footprints', () => {
    const expectations = [
      ['xenoLabBench', ['1:1', '1:2'], 'wide'],
      ['specimenTank', ['1:5', '1:6'], 'wide'],
      ['sampleAnalyzer', ['4:2'], 'compact'],
      ['containmentPod', ['2:7'], 'tall'],
      ['decontaminationArch', ['4:4'], 'tall'],
    ] as const
    const occupiedKeys: string[] = []
    for (const [id, expectedCells, profile] of expectations) {
      const cells = objectCells(id)
      expect(cells.map(cell => `${cell.row}:${cell.column}`)).toEqual(expectedCells)
      expect(cells.every(cell => !cell.occupiable && !isObjectPositionOccupiable(cell.object!, cell))).toBe(true)
      expect(cells.every(cell => cell.object?.footprint ? isFootprintReservedCell(cell.object, cell) : true)).toBe(true)
      expect(resolveObjectVisualProfile(cells[0].object!)).toBe(profile)
      occupiedKeys.push(...cells.map(cell => `${cell.row}:${cell.column}`))
    }
    expect(new Set(occupiedKeys).size).toBe(occupiedKeys.length)
    expect(getObjectFootprintBounds(objectCells('specimenTank')[0].object!, objectCells('specimenTank')[0])).toMatchObject({ rows: 1, columns: 2 })
    expect(getObjectFootprintBounds(objectCells('xenoLabBench')[0].object!, objectCells('xenoLabBench')[0])).toMatchObject({ rows: 1, columns: 2 })
  })

  it('keeps labels on free cells in their own zones and all clues visible and true', () => {
    for (const zone of caseD202.zones) {
      const anchor = zone.labelAnchor!.position
      const cell = caseD202.board.find(candidate => candidate.row === anchor.row && candidate.column === anchor.column)!
      expect(cell.zoneId).toBe(zone.id)
      expect(cell.object).toBeUndefined()
      expect(caseD202.solution.some(placement => placement.position.row === anchor.row && placement.position.column === anchor.column)).toBe(false)
    }
    expect(caseD202.characters.flatMap(character => character.clues).every(clue => clue.text.trim() !== '' && !clue.text.includes('…') && !clue.text.toLocaleLowerCase('es').includes('ocupaba'))).toBe(true)
    expect(areAllCluesSatisfied(caseD202, caseD202.solution)).toBe(true)
  })

  it('has one non-truncated canonical solution and identifies Diego alone with Eva', () => {
    expect(validateCaseDefinition(caseD202)).toEqual([])
    const solved = solveCaseWithStats(caseD202)
    expect(solved.truncated).not.toBe(true)
    expect(solved.solutionsFound).toBe(1)
    expect(placementsEqual(solved.solutions[0], caseD202.solution)).toBe(true)
    expect(findKiller(caseD202, caseD202.solution)?.id).toBe('male-029')
    const observation = caseD202.solution.filter(placement => caseD202.board.find(cell => cell.row === placement.position.row && cell.column === placement.position.column)?.zoneId === 'observation')
    expect(observation.map(placement => placement.characterId).sort()).toEqual(['female-035', 'male-029'])
  })

  it('rejects every pairwise exchange through at least one visible clue', () => {
    for (let index = 0; index < caseD202.solution.length; index += 1) for (let otherIndex = index + 1; otherIndex < caseD202.solution.length; otherIndex += 1) {
      const first = caseD202.solution[index], second = caseD202.solution[otherIndex]
      const swapped = caseD202.solution.map(placement => placement.characterId === first.characterId
        ? { ...placement, position: { ...second.position } }
        : placement.characterId === second.characterId
          ? { ...placement, position: { ...first.position } }
          : placement)
      expect(areAllCluesSatisfied(caseD202, swapped)).toBe(false)
    }
  })
})
