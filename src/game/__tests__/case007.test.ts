import { describe, expect, it } from 'vitest'
import { case007 } from '../../data/cases/case007'
import { expectManualD1Case } from './manualD1Case.testUtils'
describe('case007', () => { it('is valid and unique', () => expectManualD1Case(case007, 7, 'marcos')); it('uses the meeting table footprint and tall lockers', () => { const table = case007.board.filter(cell => cell.object?.id === 'meetingTable'); expect(table.map(cell => `${cell.row}:${cell.column}`)).toEqual(['4:3', '4:4']); expect(table.every(cell => !cell.occupiable)).toBe(true); expect(case007.board.find(cell => cell.object?.id === 'lockerBank')?.object?.appearance).toBe('lockerBank') }) })
