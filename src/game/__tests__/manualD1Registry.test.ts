import { describe, expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { case002 } from '../../data/cases/case002'
import { case003 } from '../../data/cases/case003'
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
import { generateDailyCase } from '../daily/generator'
import { generateInfiniteCase } from '../infinite/generator'
import { getFrozenNormalGeneratedCase } from '../normal/frozen'
import { generateNormalCase } from '../normal/generator'

describe('manual D1 registry', () => {
  it('routes C01-C15 to their official manual cases and C16 to frozen data', () => {
    const manual = [case001, case002, case003, case004, case005, case006, case007, case008, case009, case010, case011, case012, case013, case014, case015]
    for (const [index, caseData] of manual.entries()) {
      expect(generateNormalCase({ difficulty: 1, caseNumber: index + 1 }).caseData).toBe(caseData)
    }
    expect(generateNormalCase({ difficulty: 1, caseNumber: 16 }).caseData).toEqual(getFrozenNormalGeneratedCase(1, 16)!.caseData)
  })

  it('does not leak manual C15 into Daily or Infinite generation', () => {
    expect(generateDailyCase(new Date(2026, 8, 8, 12), 1).caseData.id).not.toBe(case015.id)
    expect(generateInfiniteCase({ difficulty: 1, seed: 12015 }).caseData.id).not.toBe(case015.id)
  })
})
