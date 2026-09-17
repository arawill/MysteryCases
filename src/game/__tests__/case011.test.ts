import { describe, expect, it } from 'vitest'
import { case011 } from '../../data/cases/case011'
import { expectManualD1Case } from './manualD1Case.testUtils'
describe('case011', () => { it('is valid, unique and identifies Raúl', () => expectManualD1Case(case011, 11, 'raul')); it('uses a blocking reading table and library shelves', () => { const table = case011.board.filter(c => c.object?.id === 'readingTable'); expect(table.map(c => `${c.row}:${c.column}`)).toEqual(['3:3', '3:4']); expect(table.every(c => !c.occupiable)).toBe(true); expect(case011.board.filter(c => c.object?.id === 'shelfA' || c.object?.id === 'shelfB').every(c => !c.occupiable)).toBe(true) }) })
