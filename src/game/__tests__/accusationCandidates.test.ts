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
import { getAccusationCandidates } from '../accusationCandidates'
import { generateDailyCase } from '../daily/generator'
import { generateInfiniteCase } from '../infinite/generator'
import { findKiller } from '../rules'

const ids = (caseId: string, characters: Parameters<typeof getAccusationCandidates>[1]) => getAccusationCandidates(caseId, characters).map(character => character.id)

describe('accusation candidates', () => {
  it('excludes only the victim, preserves candidate identities and remains stable per case', () => {
    const first = getAccusationCandidates(case001.id, case001.characters)
    expect(first.map(character => character.id).sort()).toEqual(case001.characters.filter(character => !character.isVictim).map(character => character.id).sort())
    expect(first).toEqual(getAccusationCandidates(case001.id, case001.characters))
    expect(new Set(first.map(character => character.id)).size).toBe(first.length)
    expect(first.every(character => !character.isVictim)).toBe(true)
  })

  it('varies deterministic public ordering across manual cases without using killer identity', () => {
    const cases = [case001, case002, case003, case004, case005, case006, case007, case008, case009, case010, case011, case012, case013, case014, case015]
    const killerPositions = cases.map(caseData => {
      const killerId = findKiller(caseData, caseData.solution)!.id
      return ids(caseData.id, caseData.characters).indexOf(killerId)
    })
    expect(new Set(killerPositions).size).toBeGreaterThan(1)
    expect(killerPositions.every(position => position === 1)).toBe(false)
    expect(new Set(cases.map(caseData => ids(caseData.id, caseData.characters).join('|'))).size).toBeGreaterThan(1)
  })

  it('uses the same stable public ordering for Daily and Infinite cases', () => {
    const daily = generateDailyCase(new Date(2026, 8, 8, 12)).caseData
    const infinite = generateInfiniteCase({ difficulty: 3, seed: 314159 }).caseData
    expect(ids(daily.id, daily.characters)).toEqual(ids(daily.id, daily.characters))
    expect(ids(infinite.id, infinite.characters)).toEqual(ids(infinite.id, infinite.characters))
    expect(ids(daily.id, daily.characters).sort()).toEqual(daily.characters.filter(character => !character.isVictim).map(character => character.id).sort())
    expect(ids(infinite.id, infinite.characters).sort()).toEqual(infinite.characters.filter(character => !character.isVictim).map(character => character.id).sort())
  }, 30000)
})
