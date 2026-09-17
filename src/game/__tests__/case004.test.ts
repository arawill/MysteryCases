import { describe, expect, it } from 'vitest'
import { case004 } from '../../data/cases/case004'
import { expectManualD1Case } from './manualD1Case.testUtils'
describe('case004', () => { it('is valid and unique', () => expectManualD1Case(case004, 4, 'sergio')); it('uses the hospital bed footprint and the occupiable wheelchair', () => { const bed = case004.board.filter(cell => cell.object?.id === 'hospitalBed'); expect(bed).toHaveLength(2); expect(bed.filter(cell => cell.occupiable).map(cell => `${cell.row}:${cell.column}`)).toEqual(['3:2']); expect(case004.board.find(cell => cell.object?.id === 'wheelchair')?.occupiable).toBe(true) }) })
