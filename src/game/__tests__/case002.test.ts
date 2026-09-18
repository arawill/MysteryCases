import { describe, expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { case002 } from '../../data/cases/case002'
import { analyzeCase } from '../analysis'
import { generateDailyCase } from '../daily/generator'
import { generateInfiniteCase } from '../infinite/generator'
import { generateNormalCase } from '../normal/generator'
import { resolveObjectAppearance, resolveObjectAppearanceScale } from '../objects/appearanceCatalog'
import { getObjectFootprint, getObjectFootprintBounds, isFootprintReservedCell, isObjectFootprintAnchor, isObjectPositionOccupiable } from '../objects/footprints'
import { canPlace, findKiller, placementsEqual } from '../rules'
import { solveCase, solveCaseWithStats } from '../solver'
import { validateCaseDefinition } from '../validation'

describe('manual Normal case002', () => {
  it('is a valid unique six-by-six case with its unhinted victim and single killer', () => {
    const victim = case002.characters.find(character => character.isVictim)!
    expect(validateCaseDefinition(case002)).toEqual([])
    expect(case002.rows).toBe(6)
    expect(case002.columns).toBe(6)
    expect(case002.characters).toHaveLength(6)
    expect(victim.clues).toEqual([])
    expect(case002.solution).toEqual([{ characterId: 'vera', position: { row: 1, column: 2 } }, { characterId: 'dario', position: { row: 2, column: 5 } }, { characterId: 'clara', position: { row: 3, column: 6 } }, { characterId: 'tomas', position: { row: 4, column: 1 } }, { characterId: 'lidia', position: { row: 5, column: 4 } }, { characterId: 'noa', position: { row: 6, column: 3 } }])
    const solved = solveCaseWithStats(case002)
    expect(solved.truncated).toBeUndefined()
    expect(solved.solutionsFound).toBe(1)
    expect(solveCase(case002).solutionsFound).toBe(1)
    expect(placementsEqual(solved.solutions[0], case002.solution)).toBe(true)
    expect(analyzeCase(case002)).toMatchObject({ status: 'unique', matchesCanonical: true })
    expect(findKiller(case002, case002.solution)?.id).toBe('tomas')
  })

  it('uses four continuous zones and a vertically anchored patio lounger with two usable cells', () => {
    const patioLoungerCells = case002.board.filter(cell => cell.object?.footprint?.id === 'case002-patio-lounger')
    const upper = case002.board.find(cell => cell.row === 4 && cell.column === 1)!
    const lower = case002.board.find(cell => cell.row === 5 && cell.column === 1)!
    expect(case002.zones.map(zone => zone.id).sort()).toEqual(['archive', 'gallery', 'patio', 'workshop'])
    expect(case002.board.some(cell => cell.zoneId === 'bathroom' || cell.object?.id === 'toilet')).toBe(false)
    expect(patioLoungerCells.map(cell => [cell.row, cell.column])).toEqual([[4, 1], [5, 1]])
    expect(isObjectFootprintAnchor(upper.object!, upper)).toBe(true)
    expect(isObjectFootprintAnchor(lower.object!, lower)).toBe(false)
    expect(getObjectFootprint(upper.object!, upper)).toEqual([{ row: 4, column: 1 }, { row: 5, column: 1 }])
    expect(getObjectFootprintBounds(upper.object!, upper)).toMatchObject({ rows: 2, columns: 1 })
    expect(upper.object?.occupiablePositions).toEqual([{ row: 4, column: 1 }, { row: 5, column: 1 }])
    expect(isObjectPositionOccupiable(upper.object!, upper)).toBe(true)
    expect(isObjectPositionOccupiable(lower.object!, lower)).toBe(true)
    expect(upper.occupiable).toBe(true)
    expect(lower.occupiable).toBe(true)
    expect(isFootprintReservedCell(upper.object, upper)).toBe(false)
    expect(isFootprintReservedCell(lower.object, lower)).toBe(false)
    expect(canPlace('tomás', upper, [], case002.board).ok).toBe(true)
    expect(canPlace('tomás', lower, [], case002.board).ok).toBe(true)
    expect(resolveObjectAppearance(upper.object!).label).toBe('Tumbona')
    expect(case002.characters.find(character => character.id === 'tomas')?.clues.find(clue => clue.type === 'onObject')).toMatchObject({ objectId: 'patioLounger', text: 'Estaba sentado en una tumbona.' })
  })

  it('declares visual-only label anchors in free cells and catalog-driven object scales', () => {
    for (const zone of case002.zones) {
      const anchor = zone.labelAnchor
      expect(anchor).toBeDefined()
      const cell = case002.board.find(candidate => candidate.row === anchor!.position.row && candidate.column === anchor!.position.column)
      expect(cell?.zoneId).toBe(zone.id)
      expect(cell?.object).toBeUndefined()
      expect(case002.solution.some(placement => placement.position.row === anchor!.position.row && placement.position.column === anchor!.position.column)).toBe(false)
    }
    const stool = case002.board.find(cell => cell.object?.id === 'stool')!.object!
    const before = structuredClone(case002.board)
    expect(resolveObjectAppearanceScale(stool)).toBeLessThan(1)
    const chairAppearances = case002.board.flatMap(cell => cell.object?.appearance === 'diningChair' ? [cell.object] : [])
    expect(chairAppearances).not.toHaveLength(0)
    expect(chairAppearances.every(object => resolveObjectAppearanceScale(object) === .92 && resolveObjectAppearanceScale(object) <= 1)).toBe(true)
    expect(resolveObjectAppearanceScale(stool)).toBe(.7)
    expect(resolveObjectAppearanceScale(case002.board.find(cell => cell.object?.id === 'patioLounger')!.object!)).toBe(1)
    expect(case002.board).toEqual(before)
  })

  it('overrides only Normal D1/C02 while C01 and C03 retain their sources', () => {
    expect(generateNormalCase({ difficulty: 1, caseNumber: 1 }).caseData).toBe(case001)
    expect(generateNormalCase({ difficulty: 1, caseNumber: 2 }).caseData).toBe(case002)
    expect(generateNormalCase({ difficulty: 1, caseNumber: 3 }).caseData.id).not.toBe('case002')
  })

  it('does not add contextual resources to Daily or Infinite procedural definitions', () => {
    const procedural = [generateDailyCase(new Date(2026, 8, 8, 12), 1).caseData, generateInfiniteCase({ difficulty: 1, seed: 12001 }).caseData]
    expect(procedural.every(caseData => caseData.board.every(cell => cell.object?.appearance === undefined && cell.object?.footprint === undefined))).toBe(true)
  })
})
