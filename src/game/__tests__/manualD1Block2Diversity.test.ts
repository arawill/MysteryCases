import { describe, expect, it } from 'vitest'
import { case008 } from '../../data/cases/case008'; import { case009 } from '../../data/cases/case009'; import { case010 } from '../../data/cases/case010'; import { case011 } from '../../data/cases/case011'
const signature = (c: typeof case008) => JSON.stringify({ zones: c.board.map(x => x.zoneId), objects: c.board.filter(x => x.object).map(x => [x.row, x.column, x.object!.appearance, x.object!.footprint?.positions, x.object!.occupiablePositions]), edges: c.edgeFeatures, solution: c.solution.map(x => x.position) })
describe('manual D1 C08-C11 diversity', () => it('has four distinct structural signatures', () => expect(new Set([case008, case009, case010, case011].map(signature)).size).toBe(4)))
