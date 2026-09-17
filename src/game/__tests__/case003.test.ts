import { describe, expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { case002 } from '../../data/cases/case002'
import { case003 } from '../../data/cases/case003'
import { evaluateAllClues } from '../clues'
import { generateDailyCase } from '../daily/generator'
import { generateInfiniteCase } from '../infinite/generator'
import { getFrozenNormalGeneratedCase } from '../normal/frozen'
import { getObjectFootprintBounds, isObjectPositionOccupiable } from '../objects/footprints'
import { generateNormalCase } from '../normal/generator'
import { findKiller, getCell, placementsEqual } from '../rules'
import { solveCase, solveCaseWithStats } from '../solver'
import { validateCaseDefinition } from '../validation'

const connected = (zoneId: string) => {
  const cells = case003.board.filter(cell => cell.zoneId === zoneId)
  const visited = new Set<string>(), queue = [cells[0]]
  while (queue.length) {
    const cell = queue.shift()!
    const key = `${cell.row}:${cell.column}`
    if (visited.has(key)) continue
    visited.add(key)
    for (const candidate of cells) if (Math.abs(candidate.row - cell.row) + Math.abs(candidate.column - cell.column) === 1) queue.push(candidate)
  }
  return visited.size === cells.length
}

describe('manual Normal case003', () => {
  it('is a valid, unique six-by-six case with a victim reserved for deduction', () => {
    const solved = solveCaseWithStats(case003)
    expect(validateCaseDefinition(case003)).toEqual([])
    expect(case003.rows).toBe(6)
    expect(case003.columns).toBe(6)
    expect(case003.characters).toHaveLength(6)
    expect(case003.characters.find(character => character.isVictim)).toMatchObject({ id: 'eva', clues: [] })
    expect(case003.characters.flatMap(character => character.clues).every(clue => !('targetCharacterId' in clue) || clue.targetCharacterId !== 'eva')).toBe(true)
    expect(new Set(case003.solution.map(placement => placement.position.row)).size).toBe(6)
    expect(new Set(case003.solution.map(placement => placement.position.column)).size).toBe(6)
    expect(case003.solution.every(placement => getCell(case003.board, placement.position)?.occupiable)).toBe(true)
    expect(solved.truncated).toBeUndefined()
    expect(solved.solutionsFound).toBe(1)
    expect(solveCase(case003).solutionsFound).toBe(1)
    expect(placementsEqual(solved.solutions[0], case003.solution)).toBe(true)
    expect(findKiller(case003, case003.solution)?.id).toBe('tomas')
    expect(case003.solution.filter(placement => getCell(case003.board, placement.position)?.zoneId === 'lounge').map(placement => placement.characterId).sort()).toEqual(['eva', 'tomas'])
  })

  it('uses continuous non-artificial zones, valid labels and a valid horizontal sofa footprint', () => {
    expect(case003.zones).toHaveLength(4)
    for (const zone of case003.zones) {
      expect(case003.board.filter(cell => cell.zoneId === zone.id).length).toBeGreaterThan(1)
      expect(connected(zone.id)).toBe(true)
      const anchor = zone.labelAnchor!
      expect(getCell(case003.board, anchor.position)?.zoneId).toBe(zone.id)
      expect(getCell(case003.board, anchor.position)?.object).toBeUndefined()
      expect(case003.solution.some(placement => placement.position.row === anchor.position.row && placement.position.column === anchor.position.column)).toBe(false)
    }
    expect(case003.zones.map(zone => [zone.id, zone.labelAnchor?.position])).toEqual([
      ['vestibule', { row: 1, column: 4 }], ['lounge', { row: 4, column: 2 }], ['study', { row: 2, column: 4 }], ['rooms', { row: 6, column: 3 }],
    ])
    const sofaCells = case003.board.filter(cell => cell.object?.footprint?.id === 'case003-lounge-sofa')
    const sofa = sofaCells[0].object!
    expect(sofaCells.map(cell => `${cell.row}:${cell.column}`)).toEqual(['2:1', '2:2'])
    expect(getObjectFootprintBounds(sofa, sofaCells[0])).toMatchObject({ rows: 1, columns: 2 })
    expect(sofaCells.filter(cell => cell.occupiable).map(cell => `${cell.row}:${cell.column}`)).toEqual(['2:1'])
    expect(isObjectPositionOccupiable(sofa, { row: 2, column: 1 })).toBe(true)
    expect(isObjectPositionOccupiable(sofa, { row: 2, column: 2 })).toBe(false)
    expect(sofa.appearance).toBe('sofa')
  })

  it('keeps the documented human deduction chain valid until Eva is the final remaining placement', () => {
    const steps = ['tomas', 'bruno', 'marta', 'raul', 'elisa']
    const placed = [] as typeof case003.solution
    for (const id of steps) {
      placed.push(case003.solution.find(placement => placement.characterId === id)!)
      expect(evaluateAllClues(case003, placed).some(result => result.evaluation === 'violated')).toBe(false)
    }
    const usedRows = new Set(placed.map(placement => placement.position.row)), usedColumns = new Set(placed.map(placement => placement.position.column))
    expect([...Array(6)].map((_, index) => index + 1).filter(row => !usedRows.has(row))).toEqual([4])
    expect([...Array(6)].map((_, index) => index + 1).filter(column => !usedColumns.has(column))).toEqual([3])
    expect(evaluateAllClues(case003, case003.solution).every(result => result.evaluation === 'satisfied')).toBe(true)
  })

  it('keeps C01-C03 and the newly manual C04 distinct from frozen, Daily and Infinite sources', () => {
    expect(generateNormalCase({ difficulty: 1, caseNumber: 1 }).caseData).toBe(case001)
    expect(generateNormalCase({ difficulty: 1, caseNumber: 2 }).caseData).toBe(case002)
    expect(generateNormalCase({ difficulty: 1, caseNumber: 3 }).caseData).toBe(case003)
    expect(generateNormalCase({ difficulty: 1, caseNumber: 16 }).caseData).toEqual(getFrozenNormalGeneratedCase(1, 16)!.caseData)
    expect(generateDailyCase(new Date(2026, 8, 8, 12), 1).caseData.id).not.toBe('case003')
    expect(generateInfiniteCase({ difficulty: 1, seed: 12001 }).caseData.id).not.toBe('case003')
  })
})
