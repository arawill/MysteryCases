import { describe, expect, it } from 'vitest'
import { case009 } from '../../data/cases/case009'
import { getObjectFootprint, isFootprintReservedCell } from '../objects/footprints'
import { expectManualD1Case } from './manualD1Case.testUtils'
describe('case009', () => { it('is valid, unique and identifies Diego', () => expectManualD1Case(case009, 9, 'diego')); it('uses an occupiable cart and a reserved horizontal freezer', () => { const cart = case009.board.find(cell => cell.object?.id === 'shoppingCart')!; expect(cart.object?.appearance).toBe('shoppingCart'); expect(cart.occupiable).toBe(true); const freezer = case009.board.filter(cell => cell.object?.id === 'freezer'); expect(freezer.map(c => `${c.row}:${c.column}`)).toEqual(['5:4', '5:5']); expect(freezer.every(c => !c.occupiable)).toBe(true); expect(getObjectFootprint(freezer[0].object!, freezer[0])).toHaveLength(2); expect(isFootprintReservedCell(freezer[1].object, freezer[1])).toBe(true) }) })
