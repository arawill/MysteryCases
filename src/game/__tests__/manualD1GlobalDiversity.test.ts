import { describe, expect, it } from 'vitest'
import { case004 } from '../../data/cases/case004'
import { case005 } from '../../data/cases/case005'
import { case006 } from '../../data/cases/case006'
import { case007 } from '../../data/cases/case007'
import { case008 } from '../../data/cases/case008'
import { case009 } from '../../data/cases/case009'
import { case010 } from '../../data/cases/case010'
import { case011 } from '../../data/cases/case011'
import { case012 } from '../../data/cases/case012'
import { case013 } from '../../data/cases/case013'
import { case014 } from '../../data/cases/case014'
import { case015 } from '../../data/cases/case015'
import type { GameCase } from '../types'

const structuralSignature = (caseData: GameCase) => JSON.stringify({
  zones: caseData.board.map(cell => [cell.row, cell.column, cell.zoneId]),
  objects: caseData.board.filter(cell => cell.object).map(cell => [
    cell.row,
    cell.column,
    cell.object!.appearance ?? cell.object!.id,
    cell.object!.footprint?.positions,
    cell.object!.occupiablePositions,
  ]),
  edgeFeatures: caseData.edgeFeatures,
  solution: caseData.solution,
})

describe('manual D1 C04-C15 structural diversity', () => {
  it('keeps all twelve plans structurally distinct', () => {
    const cases = [case004, case005, case006, case007, case008, case009, case010, case011, case012, case013, case014, case015]
    expect(new Set(cases.map(structuralSignature)).size).toBe(12)
  })
})
