import { describe, expect, it } from 'vitest'
import { case004 } from '../../data/cases/case004'
import { case005 } from '../../data/cases/case005'
import { case006 } from '../../data/cases/case006'
import { case007 } from '../../data/cases/case007'

const signature = (caseData: typeof case004) => JSON.stringify({ zones: caseData.board.map(cell => cell.zoneId), objects: caseData.board.filter(cell => cell.object).map(cell => [cell.row, cell.column, cell.object!.id, cell.object!.footprint?.positions]), solution: caseData.solution })
describe('manual D1 C04-C07 structural diversity', () => it('uses four materially different plans rather than a shared geometry', () => expect(new Set([case004, case005, case006, case007].map(signature)).size).toBe(4)))
