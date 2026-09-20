import { describe, expect, it } from 'vitest'
import { caseD206 } from '../../data/cases/caseD206'
import { getManualNormalCase } from '../../data/cases/manualNormalCases'
import { areAllCluesSatisfied } from '../clues'
import { findKiller, getCell, placementsEqual } from '../rules'
import { solveCaseWithStats } from '../solver'
import { validateCaseDefinition } from '../validation'

describe('manual D2 case 06', () => {
  it('is a valid, unique seven-by-seven lunar mine', () => {
    expect(getManualNormalCase(2, 6)).toBe(caseD206)
    expect(validateCaseDefinition(caseD206)).toEqual([])
    expect(caseD206.characters).toHaveLength(7)
    expect(caseD206.solution.map(placement => placement.position.row).sort()).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(caseD206.solution.map(placement => placement.position.column).sort()).toEqual([1, 2, 3, 4, 5, 6, 7])
    const solved = solveCaseWithStats(caseD206)
    expect(solved.truncated).not.toBe(true)
    expect(solved.solutionsFound).toBe(1)
    expect(placementsEqual(solved.solutions[0], caseD206.solution)).toBe(true)
    expect(areAllCluesSatisfied(caseD206, caseD206.solution)).toBe(true)
    expect(findKiller(caseD206, caseD206.solution)?.id).toBe('celia')
  })

  it('uses the declared footprints, clear anchors, and only Celia with the victim', () => {
    expect(caseD206.board.filter(cell => cell.object?.id === 'lunarDrill')).toHaveLength(4)
    expect(caseD206.board.filter(cell => cell.object?.id === 'oreCart')).toHaveLength(2)
    expect(caseD206.board.filter(cell => cell.object?.id === 'lunarExcavation')).toHaveLength(4)
    expect(caseD206.board.filter(cell => cell.object?.id === 'surveyConsole' && cell.occupiable)).toHaveLength(1)
    for (const zone of caseD206.zones) {
      const anchor = zone.labelAnchor!.position
      expect(getCell(caseD206.board, anchor)?.zoneId).toBe(zone.id)
      expect(getCell(caseD206.board, anchor)?.object).toBeUndefined()
      expect(caseD206.solution.some(placement => placement.position.row === anchor.row && placement.position.column === anchor.column)).toBe(false)
      expect(caseD206.solution.some(placement => getCell(caseD206.board, placement.position)?.zoneId === zone.id)).toBe(true)
    }
    expect(caseD206.solution.filter(placement => getCell(caseD206.board, placement.position)?.zoneId === 'access').map(placement => placement.characterId).sort()).toEqual(['celia', 'julieta'])
  })
})
