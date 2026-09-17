import { describe, expect, it } from 'vitest'
import { case012 } from '../../data/cases/case012'
import { isFootprintReservedCell } from '../objects/footprints'
import { expectManualD1Case } from './manualD1Case.testUtils'
describe('case012', () => { it('is valid, unique and identifies Bruno', () => expectManualD1Case(case012, 12, 'bruno')); it('uses a blocking ticket counter and tall vending machine', () => { const counter = case012.board.filter(c => c.object?.id === 'ticketCounter'); expect(counter.map(c => `${c.row}:${c.column}`)).toEqual(['1:2', '1:3']); expect(counter.every(c => !c.occupiable)).toBe(true); expect(isFootprintReservedCell(counter[1].object, counter[1])).toBe(true); const vending = case012.board.find(c => c.object?.id === 'vendingMachine')!; expect(vending.object?.appearance).toBe('vendingMachine'); expect(vending.occupiable).toBe(false) }) })
