import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
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
import { findKiller } from '../rules'

const stable = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).filter(key => record[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${stable(record[key])}`).join(',')}}`
}

const legacyReferences = {
  case003: { hash: '02f9759d075b6aeb187627ba14dddb29eb6443d304723bad37ab91cfb1c43afe', victimId: 'eva', killerId: 'tomas' },
  case004: { hash: '5df667077cd33a9efc483a9caed408ca76cef94e9129c7caba186af342d5486d', victimId: 'irene', killerId: 'sergio' },
  case005: { hash: 'e04582c1d91993716bb8cb58533efb102e7b972c8406ff29a15182ae4022abd9', victimId: 'nadia', killerId: 'alvaro' },
  case006: { hash: '23382611de1b6b500345e658fc078e167f6d239c38aa445788ceb62d981fdc74', victimId: 'carla', killerId: 'ivan' },
  case007: { hash: 'ea72adce5ae8c228e042c46533c0cca8c0a9ea6a8777e87b5e67aa3ae26e14e4', victimId: 'julia', killerId: 'marcos' },
  case008: { hash: '75c1d80f0af72247912dce71fb622696c755531659b2f93eb0704736f697dd4a', victimId: 'vera', killerId: 'pablo' },
  case009: { hash: '9fbbe7304d9a58d1a435b9336c345f4e0c44df5b7861f71f3924c294e841c8a7', victimId: 'marta', killerId: 'diego' },
  case010: { hash: 'a0e48770fbefe25815a1f1dfa233cf789c40c94e3864be90aff5b76e363c0d14', victimId: 'elisa', killerId: 'tomas' },
  case011: { hash: 'b89c6c6c36ebe5426c434d07d8eb9be13b1ac7dd0b5608dc0f9328a23d7622d4', victimId: 'lucia', killerId: 'raul' },
  case012: { hash: 'a43f189e87e5a6256b5ca87bbf78d59ce40b13f1be9f1fb0f77231464554637b', victimId: 'elena', killerId: 'bruno' },
  case013: { hash: '12d0e26420095b600abbe2ed1c6e4e4b75d8d7f2aafd00b2a4690d14b002e61b', victimId: 'ines', killerId: 'dario' },
  case014: { hash: 'df59e0799b5b73111782f3a396a744455e6e4d6f54dd71022f2860c17df0a292', victimId: 'noa', killerId: 'hector' },
  case015: { hash: '1fc652d2385bf64ada827599bd0db0d258593da324bfccc06b7fda3955445cf5', victimId: 'clara', killerId: 'mateo' },
} as const

describe('legacy references for normal cases C03-C15', () => {
  for (const caseData of [case003, case004, case005, case006, case007, case008, case009, case010, case011, case012, case013, case014, case015]) {
    it(`${caseData.id} remains byte-for-byte equivalent after stable serialization`, () => {
      const expected = legacyReferences[caseData.id as keyof typeof legacyReferences]
      const hash = createHash('sha256').update(stable(caseData)).digest('hex')
      expect(hash).toBe(expected.hash)
      expect(caseData.characters.find(character => character.isVictim)?.id).toBe(expected.victimId)
      expect(findKiller(caseData, caseData.solution)?.id).toBe(expected.killerId)
    })
  }
})
