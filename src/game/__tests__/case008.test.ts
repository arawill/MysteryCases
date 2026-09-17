import { describe, expect, it } from 'vitest'
import { case008 } from '../../data/cases/case008'
import { findKiller } from '../rules'
import { expectManualD1Case } from './manualD1Case.testUtils'
describe('case008', () => {
  it('is valid, unique and identifies Pablo', () => expectManualD1Case(case008, 8, 'pablo'))
  it('models the pool as one blocked 2×3 terrain rectangle', () => { const pool = case008.board.filter(cell => cell.zoneId === 'pool'); expect(pool).toHaveLength(6); expect(new Set(pool.map(cell => cell.row))).toEqual(new Set([2, 3])); expect(new Set(pool.map(cell => cell.column))).toEqual(new Set([2, 3, 4])); expect(pool.every(cell => !cell.occupiable && !cell.object)).toBe(true); expect(case008.solution.every(p => !pool.some(cell => cell.row === p.position.row && cell.column === p.position.column))).toBe(true) })
  it('keeps themed object rules explicit', () => { expect(case008.board.find(cell => cell.object?.id === 'lockerBank')?.object?.appearance).toBe('lockerBank'); const chair = case008.board.find(cell => cell.object?.id === 'lifeguardChair')!; expect(chair.occupiable).toBe(true); expect(chair.object?.occupiablePositions).toEqual([{ row: 4, column: 1 }]); expect(case008.characters.find(c => c.isVictim)?.name).toBe('Vera'); expect(findKiller(case008, case008.solution)?.id).toBe('pablo') })
})
