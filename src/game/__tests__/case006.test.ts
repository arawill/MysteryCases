import { describe, expect, it } from 'vitest'
import { case006 } from '../../data/cases/case006'
import { expectManualD1Case } from './manualD1Case.testUtils'
describe('case006', () => { it('is valid and unique', () => expectManualD1Case(case006, 6, 'ivan')); it('uses a blocking workbench footprint and themed mechanic anchors', () => { const bench = case006.board.filter(cell => cell.object?.id === 'workbench'); expect(bench.map(cell => `${cell.row}:${cell.column}`)).toEqual(['1:3', '1:4']); expect(bench.every(cell => !cell.occupiable)).toBe(true); expect(case006.board.some(cell => cell.object?.id === 'tires')).toBe(true) }) })
