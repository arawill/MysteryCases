import { describe, expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { analyzeCase } from '../analysis'
import { evaluateClue } from '../clues'
import { evaluateGlobalClue } from '../globalClues'
import { buildTrueCluePool, buildTrueGlobalCluePool, type CandidateCharacterClue } from '../generation/cluePool'
import { canAddReadableClue, hasReadableClues, isNegativeClue } from '../generation/clueQuality'
import { isEdgeAdvanced, isLogicAdvanced, isSpatialAdvanced, isTraitAdvanced } from '../generation/clueDifficulty'
import { createGenerationTemplate } from '../generation/template'
import { cluePriority } from '../generation/generator'
import { generateInfiniteCase } from '../infinite/generator'
import { generateNormalCase } from '../normal/generator'
import { generateDailyCase } from '../daily/generator'
import { findKiller } from '../rules'
import { solveCase } from '../solver'
import type { EdgeFeature, Placement } from '../types'
import { validateCaseDefinition } from '../validation'

const edgeFeatures: EdgeFeature[] = [
  { id: 'window-north', type: 'window', label: 'Ventana', segments: [{ position: { row: 1, column: 3 }, side: 'N' }] },
  { id: 'window-east', type: 'window', label: 'Ventana', segments: [{ position: { row: 3, column: 6 }, side: 'E' }] },
  { id: 'door-storage', type: 'door', label: 'Puerta', segments: [{ position: { row: 3, column: 3 }, side: 'S' }] },
]

const traitSolution: Placement[] = case001.solution.map(placement => placement.characterId === 'lucia' ? { ...placement, position: { row: 5, column: 3 } } : placement)

const traitTemplate = () => {
  const template = createGenerationTemplate(case001)
  template.traitDefinitions = [{ id: 'staff', label: 'Personal' }, { id: 'hat', label: 'Sombrero' }]
  template.characters = template.characters.map(character => ({ ...character, ...(character.id === 'bruno' || character.id === 'alma' || character.id === 'lucia' ? { traitIds: ['staff'] } : character.id === 'ines' ? { traitIds: ['hat'] } : {}) }))
  return template
}

const familyCounts = (difficulty: 1 | 2 | 3 | 4 | 5) => {
  const caseData = generateNormalCase({ difficulty, caseNumber: difficulty + 50 }).caseData
  const clues = caseData.characters.flatMap(character => character.clues)
  return { caseData, clues, globals: caseData.globalClues ?? [] }
}

describe('5.5E.3 procedural edge and trait evidence', () => {
  it('builds canonical edge candidates by feature type, including multiple windows and a wide window', () => {
    const template = createGenerationTemplate(case001)
    template.edgeFeatures = [...edgeFeatures, { id: 'wide-window', type: 'window', label: 'Ventanal', segments: [{ position: { row: 1, column: 3 }, side: 'N' }, { position: { row: 1, column: 4 }, side: 'N' }] }]
    const pool = buildTrueCluePool(template, case001.solution)
    const luciaWindow = pool.find(candidate => candidate.characterId === 'lucia' && candidate.clue.type === 'besideEdgeFeature' && candidate.clue.featureType === 'window')
    const luciaDoor = pool.find(candidate => candidate.characterId === 'lucia' && candidate.clue.type === 'notBesideEdgeFeature' && candidate.clue.featureType === 'door')
    const noraWindow = pool.find(candidate => candidate.characterId === 'nora' && candidate.clue.type === 'besideEdgeFeature' && candidate.clue.featureType === 'window')
    expect(luciaWindow).toBeDefined()
    expect(luciaDoor).toBeDefined()
    expect(noraWindow).toBeDefined()
    for (const candidate of pool.filter(candidate => candidate.clue.type === 'besideEdgeFeature' || candidate.clue.type === 'notBesideEdgeFeature')) expect(evaluateClue(candidate.clue, candidate.characterId, { ...case001, edgeFeatures: template.edgeFeatures, characters: case001.characters.map(character => ({ ...character, clues: [] })) }, case001.solution)).toBe('satisfied')
  })

  it('recognizes either segment of one wide window as the same feature', () => {
    const wide: EdgeFeature = { id: 'wide-window', type: 'window', label: 'Ventanal', segments: [{ position: { row: 1, column: 3 }, side: 'N' }, { position: { row: 1, column: 4 }, side: 'N' }] }
    const clue = { id: 'wide', type: 'besideEdgeFeature' as const, text: '', featureType: 'window' as const }
    const caseData = { ...case001, edgeFeatures: [wide] }
    const first = case001.solution
    const second = case001.solution.map(placement => placement.characterId === 'lucia' ? { ...placement, position: { row: 1, column: 4 } } : placement)
    expect(evaluateClue(clue, 'lucia', caseData, first)).toBe('satisfied')
    expect(evaluateClue(clue, 'lucia', caseData, second)).toBe('satisfied')
  })

  it('creates zero, positive and exact trait companion evidence while excluding the subject', () => {
    const template = traitTemplate()
    const pool = buildTrueCluePool(template, traitSolution)
    const brunoStaff = pool.filter(candidate => candidate.characterId === 'bruno' && 'traitId' in candidate.clue && candidate.clue.traitId === 'staff')
    const mateoStaff = pool.filter(candidate => candidate.characterId === 'mateo' && 'traitId' in candidate.clue && candidate.clue.traitId === 'staff')
    expect(brunoStaff.some(candidate => candidate.clue.type === 'withTraitInZone')).toBe(true)
    expect(brunoStaff.some(candidate => candidate.clue.type === 'companionTraitCount' && candidate.clue.count === 2)).toBe(true)
    expect(brunoStaff.some(candidate => candidate.clue.type === 'withoutTraitInZone')).toBe(false)
    expect(mateoStaff.some(candidate => candidate.clue.type === 'withoutTraitInZone')).toBe(true)
    expect(mateoStaff.some(candidate => candidate.clue.type === 'withTraitInZone' || candidate.clue.type === 'companionTraitCount')).toBe(false)
    expect(brunoStaff.every(candidate => candidate.clue.text.includes('Personal') && !candidate.clue.text.includes('staff'))).toBe(true)
    for (const candidate of pool.filter(candidate => 'traitId' in candidate.clue)) expect(evaluateClue(candidate.clue, candidate.characterId, { ...case001, traitDefinitions: template.traitDefinitions, characters: template.characters.map(character => ({ ...character, clues: [] })) }, traitSolution)).toBe('satisfied')
  })

  it('does not count a trait-bearing subject as their own companion', () => {
    const template = traitTemplate()
    template.characters = template.characters.map(character => ({ ...character, ...(character.id === 'alma' ? { traitIds: ['staff'] } : { traitIds: [] }) }))
    const almaStaff = buildTrueCluePool(template, case001.solution).filter(candidate => candidate.characterId === 'alma' && 'traitId' in candidate.clue && candidate.clue.traitId === 'staff')
    expect(almaStaff.some(candidate => candidate.clue.type === 'withoutTraitInZone')).toBe(true)
    expect(almaStaff.some(candidate => candidate.clue.type === 'withTraitInZone' || candidate.clue.type === 'companionTraitCount')).toBe(false)
  })

  it('does not combine imprecise and exact positive trait evidence for one subject and trait', () => {
    const withTrait: CandidateCharacterClue = { kind: 'character', characterId: 'a', clue: { id: 'with', type: 'withTraitInZone', text: '', traitId: 'staff' } }
    const count: CandidateCharacterClue = { kind: 'character', characterId: 'a', clue: { id: 'count', type: 'companionTraitCount', text: '', traitId: 'staff', count: 2 } }
    expect(canAddReadableClue([withTrait], count)).toBe(false)
    expect(canAddReadableClue([count], withTrait)).toBe(false)
  })

  it('builds global trait counts with natural zero, singular and plural text', () => {
    const template = traitTemplate()
    const pool = buildTrueGlobalCluePool(template, traitSolution).filter(candidate => candidate.clue.type === 'zoneTraitCount')
    const zero = pool.find(candidate => candidate.clue.count === 0)
    const one = pool.find(candidate => candidate.clue.count === 1)
    const many = pool.find(candidate => candidate.clue.count > 1)
    expect(zero?.clue.text).toContain('nadie')
    expect(one?.clue.text).toContain('una persona')
    expect(many?.clue.text).toMatch(/\d+ personas/)
    for (const candidate of pool) {
      expect(candidate.clue.text).not.toContain('staff')
      expect(evaluateGlobalClue(candidate.clue, { ...case001, traitDefinitions: template.traitDefinitions, characters: template.characters.map(character => ({ ...character, clues: [] })) }, traitSolution)).toBe('satisfied')
    }
  })

  it.each([1, 2, 3, 4, 5] as const)('enforces the final vocabulary matrix at difficulty %s', difficulty => {
    const { caseData, clues, globals } = familyCounts(difficulty)
    expect(clues.some(isSpatialAdvanced)).toBe(difficulty >= 2)
    expect(clues.some(isLogicAdvanced)).toBe(difficulty >= 3)
    expect(clues.some(isEdgeAdvanced)).toBe(difficulty >= 4)
    expect(clues.some(isTraitAdvanced)).toBe(difficulty >= 5)
    expect(globals).toHaveLength(difficulty >= 5 ? 2 : difficulty >= 4 ? 1 : 0)
    expect(globals.filter(clue => clue.type === 'zoneTraitCount')).toHaveLength(difficulty >= 5 ? 1 : 0)
    if (difficulty >= 4) expect(globals.some(clue => clue.type !== 'zoneTraitCount')).toBe(true)
    if (difficulty === 5) expect(globals.find(clue => clue.type === 'zoneTraitCount' && clue.count > 0)).toBeDefined()
    expect(caseData.characters.every(character => character.clues.length >= 2 && character.clues.some(clue => !isNegativeClue(clue)))).toBe(true)
    expect(clues.filter(isNegativeClue).length / clues.length).toBeLessThanOrEqual(.4)
    expect(validateCaseDefinition(caseData)).toEqual([])
    expect(solveCase(caseData, { maxSolutions: 2 }).solutionsFound).toBe(1)
    expect(analyzeCase(caseData)).toMatchObject({ status: 'unique', matchesCanonical: true })
    expect(hasReadableClues(caseData)).toBe(true)
  }, 30000)

  it('prioritizes positive edge and trait evidence before negative fallbacks', () => {
    const candidates: CandidateCharacterClue[] = [
      { kind: 'character', characterId: 'a', clue: { id: 'negative-edge', type: 'notBesideEdgeFeature', text: '', featureType: 'window' } },
      { kind: 'character', characterId: 'a', clue: { id: 'positive-edge', type: 'besideEdgeFeature', text: '', featureType: 'window' } },
      { kind: 'character', characterId: 'a', clue: { id: 'negative-trait', type: 'withoutTraitInZone', text: '', traitId: 'staff' } },
      { kind: 'character', characterId: 'a', clue: { id: 'positive-trait', type: 'withTraitInZone', text: '', traitId: 'staff' } },
    ]
    const ordered = [...candidates].sort((a, b) => cluePriority(a) - cluePriority(b))
    expect(ordered.map(candidate => candidate.clue.id)).toEqual(['positive-edge', 'positive-trait', 'negative-edge', 'negative-trait'])
  }, 30000)

  it('shares the five-star policy across Normal, Daily and Infinite', () => {
    const normal = generateNormalCase({ difficulty: 5, caseNumber: 56 }).caseData
    const daily = generateDailyCase(new Date(2026, 8, 8, 12), 5).caseData
    const infinite = generateInfiniteCase({ difficulty: 5, seed: 918273 }).caseData
    for (const caseData of [normal, daily, infinite]) {
      const clues = caseData.characters.flatMap(character => character.clues)
      expect(caseData.edgeFeatures?.length).toBe(3)
      expect(caseData.traitDefinitions?.length).toBe(3)
      expect(clues.some(isEdgeAdvanced)).toBe(true)
      expect(clues.some(isTraitAdvanced)).toBe(true)
      expect(caseData.globalClues).toHaveLength(2)
      expect(caseData.globalClues?.filter(clue => clue.type === 'zoneTraitCount')).toHaveLength(1)
    }
  }, 30000)

  it('is deterministic at four and five stars and changes a verified five-star descriptor', () => {
    const four = generateNormalCase({ difficulty: 4, caseNumber: 57 }).caseData
    const fourAgain = generateNormalCase({ difficulty: 4, caseNumber: 57 }).caseData
    const five = generateNormalCase({ difficulty: 5, caseNumber: 58 }).caseData
    const fiveAgain = generateNormalCase({ difficulty: 5, caseNumber: 58 }).caseData
    const otherFive = generateNormalCase({ difficulty: 5, caseNumber: 59 }).caseData
    expect(fourAgain).toEqual(four)
    expect(fiveAgain).toEqual(five)
    expect({ board: otherFive.board, clues: otherFive.characters.map(character => character.clues), globals: otherFive.globalClues }).not.toEqual({ board: five.board, clues: five.characters.map(character => character.clues), globals: five.globalClues })
  }, 30000)

  it('keeps the handcrafted case intact and uniquely solved', () => {
    expect(validateCaseDefinition(case001)).toEqual([])
    expect(analyzeCase(case001)).toMatchObject({ status: 'unique', matchesCanonical: true })
    expect(findKiller(case001, case001.solution)?.id).toBe('bruno')
  })
})
