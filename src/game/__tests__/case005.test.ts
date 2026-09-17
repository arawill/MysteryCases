import { describe, expect, it } from 'vitest'
import { case005 } from '../../data/cases/case005'
import { expectManualD1Case } from './manualD1Case.testUtils'
describe('case005', () => { it('is valid and unique', () => expectManualD1Case(case005, 5, 'alvaro')); it('keeps the café counter as a blocking horizontal footprint', () => { const counter = case005.board.filter(cell => cell.object?.id === 'cafeCounter'); expect(counter.map(cell => `${cell.row}:${cell.column}`)).toEqual(['1:1', '1:2']); expect(counter.every(cell => !cell.occupiable)).toBe(true); expect(case005.board.some(cell => cell.object?.appearance === 'coffeeMachine')).toBe(true) }) })
