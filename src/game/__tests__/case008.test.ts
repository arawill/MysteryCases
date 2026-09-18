import { describe, expect, it } from 'vitest'
import { case008 } from '../../data/cases/case008'
import { getObjectFootprintBounds, isFootprintReservedCell, isObjectFootprintAnchor } from '../objects/footprints'
import { canPlace, findKiller, placementsEqual } from '../rules'
import { solveCaseWithStats } from '../solver'
import { expectManualD1Case } from './manualD1Case.testUtils'
describe('case008', () => {
  it('is valid, unique and identifies Pablo', () => expectManualD1Case(case008, 8, 'pablo'))
  it('models the pool as one blocked 2×3 continuous visual footprint', () => {
    const pool = case008.board.filter(cell => cell.zoneId === 'pool')
    const expectedPositions = ['2:2', '2:3', '2:4', '3:2', '3:3', '3:4']
    expect(pool).toHaveLength(6)
    expect(pool.map(cell => `${cell.row}:${cell.column}`)).toEqual(expectedPositions)
    expect(pool.every(cell => cell.object?.id === 'poolSurface' && cell.object.appearance === 'poolSurface')).toBe(true)
    expect(new Set(pool.map(cell => cell.object)).size).toBe(1)
    const poolObject = pool[0].object!
    expect(poolObject.footprint?.positions.map(position => `${position.row}:${position.column}`)).toEqual(expectedPositions)
    expect(getObjectFootprintBounds(poolObject, pool[0])).toMatchObject({ rows: 2, columns: 3 })
    expect(isObjectFootprintAnchor(poolObject, pool[0])).toBe(true)
    expect(pool.slice(1).every(cell => !isObjectFootprintAnchor(poolObject, cell))).toBe(true)
    expect(pool.every(cell => !cell.occupiable && isFootprintReservedCell(cell.object, cell))).toBe(true)
    expect(pool.every(cell => !canPlace('sara', cell, [], case008.board).ok)).toBe(true)
    expect(case008.solution.every(placement => !pool.some(cell => cell.row === placement.position.row && cell.column === placement.position.column))).toBe(true)
  })
  it('keeps themed object rules explicit', () => { expect(case008.board.find(cell => cell.object?.id === 'lockerBank')?.object?.appearance).toBe('lockerBank'); const chair = case008.board.find(cell => cell.object?.id === 'lifeguardChair')!; expect(chair.occupiable).toBe(true); expect(chair.object?.occupiablePositions).toEqual([{ row: 4, column: 1 }]); expect(case008.characters.find(c => c.isVictim)?.name).toBe('Vera'); expect(findKiller(case008, case008.solution)?.id).toBe('pablo') })
  it('keeps the canonical resolution unchanged after adding the visual pool surface', () => {
    const solved = solveCaseWithStats(case008)
    expect(solved.truncated).toBeUndefined()
    expect(solved.solutionsFound).toBe(1)
    expect(placementsEqual(solved.solutions[0], case008.solution)).toBe(true)
    expect(findKiller(case008, case008.solution)?.id).toBe('pablo')
  })
})
