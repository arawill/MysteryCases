import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { frozenNormalCaseSet } from '../../data/normal/frozen'
import { avatarCatalog } from '../characters/avatarCatalog'
import { hydrateFrozenNormalCase, NORMAL_CASE_SET_VERSION } from '../normal/frozen'
import { scenarioPacks } from '../scenarios/catalog'

const packs = ['cafeteria', 'house', 'office', 'outdoor', 'hotel', 'hospital'] as const
const expected = {
  1: [14, 14, 13, 13, 13, 13],
  2: [13, 13, 14, 14, 13, 13],
  3: [13, 13, 13, 13, 14, 14],
  4: [14, 13, 14, 13, 13, 13],
  5: [13, 14, 13, 14, 13, 13],
} as const

describe('frozen Normal case set', () => {
  const all = [{ difficulty: 1, caseNumber: 1, scenarioPackId: 'cafeteria', caseData: case001 }, ...frozenNormalCaseSet.cases.map(item => ({ difficulty: item.difficulty, caseNumber: item.caseNumber, scenarioPackId: item.scenarioPackId, caseData: hydrateFrozenNormalCase(item) }))]

  it('contains the manual case plus exactly 399 literal g6 frozen records', () => {
    expect(NORMAL_CASE_SET_VERSION).toBe(1)
    expect(frozenNormalCaseSet).toMatchObject({ formatVersion: 1, proceduralGenerationVersion: 6 })
    expect(frozenNormalCaseSet.cases).toHaveLength(399)
    expect(all).toHaveLength(400)
    expect(frozenNormalCaseSet.cases.every(item => item.id === `normal-d${item.difficulty}-c${String(item.caseNumber).padStart(2, '0')}-g6`)).toBe(true)
    for (const difficulty of [1, 2, 3, 4, 5] as const) expect(all.filter(item => item.difficulty === difficulty).map(item => item.caseNumber).sort((a, b) => a - b)).toEqual(Array.from({ length: 80 }, (_, index) => index + 1))
  })

  it('hydrates all frozen references and preserves their dimensions, people and pack vocabulary', () => {
    for (const frozen of frozenNormalCaseSet.cases) {
      const caseData = hydrateFrozenNormalCase(frozen), pack = scenarioPacks.find(candidate => candidate.id === frozen.scenarioPackId)
      expect(pack).toBeDefined()
      expect(caseData.board).toHaveLength(caseData.rows * caseData.columns)
      expect(caseData.characters).toHaveLength(caseData.rows)
      expect(caseData.characters.filter(character => character.isVictim)).toHaveLength(1)
      expect(caseData.characters.every(character => typeof character.name === 'string' && character.name.length > 0 && Boolean(character.avatarImage) && Boolean(character.roleId) && Boolean(character.roleLabel))).toBe(true)
      expect(caseData.characters.every(character => avatarCatalog.some(avatar => avatar.image === character.avatarImage))).toBe(true)
      expect(caseData.zones.every(zone => pack?.zones.some(candidate => candidate.id === zone.id))).toBe(true)
      expect(caseData.board.every(cell => !cell.object || pack?.objects.some(candidate => candidate.id === cell.object?.id))).toBe(true)
    }
  })

  it('uses the exact balanced pack distribution without consecutive packs', () => {
    for (const difficulty of [1, 2, 3, 4, 5] as const) {
      const cases = all.filter(item => item.difficulty === difficulty).sort((a, b) => a.caseNumber - b.caseNumber)
      expect(packs.map(pack => cases.filter(item => item.scenarioPackId === pack).length)).toEqual(expected[difficulty])
      for (let index = 1; index < cases.length; index += 1) expect(cases[index].scenarioPackId).not.toBe(cases[index - 1].scenarioPackId)
    }
    expect(packs.map(pack => all.filter(item => item.scenarioPackId === pack).length)).toEqual([67, 67, 67, 67, 66, 66])
  })

  it('keeps case001 as the original handcrafted case', () => {
    expect(all[0].caseData).toBe(case001)
    expect(case001.title).toBe('La última taza')
    expect(case001.characters.map(character => [character.name, character.avatar])).toEqual([['Lucía', '🦊'], ['Mateo', '🦉'], ['Nora', '🐈'], ['Bruno', '🦬'], ['Inés', '🦋'], ['Alma', '🌙']])
    expect(case001.solution).toEqual([{ characterId: 'lucia', position: { row: 1, column: 3 } }, { characterId: 'mateo', position: { row: 2, column: 4 } }, { characterId: 'nora', position: { row: 3, column: 6 } }, { characterId: 'bruno', position: { row: 4, column: 1 } }, { characterId: 'ines', position: { row: 5, column: 5 } }, { characterId: 'alma', position: { row: 6, column: 2 } }])
  })

  it('keeps Normal runtime independent from procedural generation', () => {
    const source = readFileSync(new URL('../normal/generator.ts', import.meta.url), 'utf8')
    expect(source).not.toContain('generateProceduralCase')
    expect(source).toContain('getFrozenNormalGeneratedCase')
  })
})
