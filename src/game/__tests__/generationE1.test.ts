import { describe, expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { evaluateClue } from '../clues'
import { evaluateGlobalClue } from '../globalClues'
import { getNormalCaseId } from '../normal/ids'
import { generateNormalCase } from '../normal/generator'
import { generateDailyCase } from '../daily/generator'
import { getDailyPuzzleId } from '../daily/date'
import { generateInfiniteCase, getInfiniteCaseId } from '../infinite/generator'
import { solveCase } from '../solver'
import { validateCaseDefinition } from '../validation'
import { buildTrueCluePool, buildTrueGlobalCluePool } from '../generation/cluePool'
import { isLogicAdvanced, isSpatialAdvanced } from '../generation/clueDifficulty'
import { createGenerationTemplate } from '../generation/template'
import { getVersionedProceduralCaseId, PROCEDURAL_GENERATION_VERSION } from '../generation/version'

describe('5.5E.1 procedural vocabulary', () => {
  it('versions procedural save IDs without changing logical normal IDs', () => {
    expect(PROCEDURAL_GENERATION_VERSION).toBe(4)
    expect(getVersionedProceduralCaseId('normal-d2-c01')).toBe('normal-d2-c01-g4')
    expect(getNormalCaseId(2, 1)).toBe('normal-d2-c01')
    expect(case001.id).toBe('case001')
  })

  it('versions Normal, Daily and Infinite save slots while retaining logical IDs', () => {
    const date = new Date(2026, 8, 8, 12)
    expect(generateNormalCase({ difficulty: 1, caseNumber: 2 }).caseData.id).toBe(getVersionedProceduralCaseId(getNormalCaseId(1, 2)))
    expect(generateDailyCase(date).caseData.id).toBe(getVersionedProceduralCaseId(getDailyPuzzleId(date, 1)))
    expect(generateInfiniteCase({ difficulty: 1, seed: 42 }).caseData.id).toBe(getVersionedProceduralCaseId(getInfiniteCaseId(1, 42)))
    expect(getNormalCaseId(1, 2)).not.toContain('-g4')
    expect(getDailyPuzzleId(date, 1)).not.toContain('-g4')
    expect(getInfiniteCaseId(1, 42)).not.toContain('-g4')
  })

  it('builds only canonical-true advanced and global candidates', () => {
    const template = createGenerationTemplate(case001), clues = buildTrueCluePool(template, case001.solution), globals = buildTrueGlobalCluePool(template, case001.solution)
    for (const candidate of clues) expect(evaluateClue(candidate.clue, candidate.characterId, { ...case001, characters: case001.characters.map(character => ({ ...character, clues: [] })) }, case001.solution)).toBe('satisfied')
    for (const candidate of globals) expect(evaluateGlobalClue(candidate.clue, { ...case001, characters: case001.characters.map(character => ({ ...character, clues: [] })) }, case001.solution)).toBe('satisfied')
    expect(globals.some(candidate => candidate.clue.type === 'emptyZoneCount')).toBe(true)
    expect(globals.some(candidate => candidate.clue.type === 'zoneOccupancyCount')).toBe(true)
    expect(globals.some(candidate => candidate.clue.type === 'objectOccupancyCount')).toBe(true)
  })

  it.each([1, 2, 3, 4, 5] as const)('enforces vocabulary quotas for difficulty %s', difficulty => {
    const generated = generateNormalCase({ difficulty, caseNumber: difficulty + 10 }).caseData
    const clues = generated.characters.flatMap(character => character.clues)
    expect(validateCaseDefinition(generated)).toEqual([])
    expect(solveCase(generated).solutionsFound).toBe(1)
    if (difficulty === 1) expect(clues.some(clue => isSpatialAdvanced(clue) || isLogicAdvanced(clue))).toBe(false)
    if (difficulty >= 2) expect(clues.some(isSpatialAdvanced)).toBe(true)
    if (difficulty >= 3) expect(clues.some(isLogicAdvanced)).toBe(true)
    expect(generated.globalClues?.length ?? 0).toBe(difficulty === 4 ? 1 : difficulty === 5 ? 2 : 0)
  }, 30000)

  it.each([2, 3, 4, 5] as const)('keeps the intended advanced vocabulary boundary at difficulty %s', difficulty => {
    const clues = generateNormalCase({ difficulty, caseNumber: difficulty + 20 }).caseData.characters.flatMap(character => character.clues)
    expect(clues.some(isSpatialAdvanced)).toBe(true)
    expect(clues.some(isLogicAdvanced)).toBe(difficulty >= 3)
  }, 30000)
})
