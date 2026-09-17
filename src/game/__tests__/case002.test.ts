import { describe, expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { case002 } from '../../data/cases/case002'
import { analyzeCase } from '../analysis'
import { generateNormalCase } from '../normal/generator'
import { findKiller, placementsEqual } from '../rules'
import { solveCaseWithStats } from '../solver'
import { validateCaseDefinition } from '../validation'
import { resolveObjectAppearance } from '../objects/appearanceCatalog'
import { generateDailyCase } from '../daily/generator'
import { generateInfiniteCase } from '../infinite/generator'

describe('manual Normal case002', () => {
  it('is a valid unique six-by-six case with an unhinted victim and a single killer', () => { const victim = case002.characters.find(character => character.isVictim)!; expect(validateCaseDefinition(case002)).toEqual([]); expect(case002.rows).toBe(6); expect(case002.columns).toBe(6); expect(case002.characters).toHaveLength(6); expect(victim.clues).toEqual([]); expect(case002.characters.flatMap(character => character.clues).every(clue => !('targetCharacterId' in clue) || clue.targetCharacterId !== victim.id)).toBe(true); expect(new Set(case002.solution.map(item => item.position.row)).size).toBe(6); expect(new Set(case002.solution.map(item => item.position.column)).size).toBe(6); expect(case002.solution.every(item => case002.board.find(cell => cell.row === item.position.row && cell.column === item.position.column)?.occupiable)).toBe(true); const solved = solveCaseWithStats(case002); expect(solved.truncated).toBeUndefined(); expect(solved.solutionsFound).toBe(1); expect(placementsEqual(solved.solutions[0], case002.solution)).toBe(true); expect(analyzeCase(case002)).toMatchObject({ status: 'unique', matchesCanonical: true }); expect(findKiller(case002, case002.solution)?.id).toBe('tomas'); const zone = case002.board.find(cell => cell.row === 6 && cell.column === 3)!.zoneId; expect(case002.solution.filter(item => case002.board.find(cell => cell.row === item.position.row && cell.column === item.position.column)?.zoneId === zone).map(item => item.characterId).sort()).toEqual(['noa', 'tomas']) })
  it('overrides only Normal D1/C02 while C01 and C03 retain their existing sources', () => { expect(generateNormalCase({ difficulty: 1, caseNumber: 1 }).caseData).toBe(case001); expect(generateNormalCase({ difficulty: 1, caseNumber: 2 }).caseData).toBe(case002); expect(generateNormalCase({ difficulty: 1, caseNumber: 3 }).caseData.id).not.toBe('case002') })
  it('uses contextual visuals without changing its logical clues or canonical outcome', () => {
    const patio = case002.board.find(cell => cell.row === 4 && cell.column === 1)!
    const bathroom = case002.board.find(cell => cell.zoneId === 'bathroom')!
    const tomas = case002.characters.find(character => character.id === 'tomas')!
    expect(patio.object).toMatchObject({ id: 'patioLounger', label: 'una tumbona', occupiable: true, appearance: 'sunLounger' })
    expect(resolveObjectAppearance(patio.object!).label).toBe('Tumbona')
    expect(tomas.clues.find(clue => clue.type === 'onObject')).toMatchObject({ objectId: 'patioLounger', text: 'Estaba sentado en una tumbona.' })
    expect(bathroom.object).toMatchObject({ id: 'toilet', label: 'un retrete', occupiable: false, appearance: 'toilet' })
    expect(resolveObjectAppearance(bathroom.object!).label).toBe('Retrete')
    expect(findKiller(case002, case002.solution)?.id).toBe('tomas')
  })
  it('does not add contextual resources to Daily or Infinite procedural definitions', () => {
    const procedural = [generateDailyCase(new Date(2026, 8, 8, 12), 1).caseData, generateInfiniteCase({ difficulty: 1, seed: 12001 }).caseData]
    expect(procedural.every(caseData => caseData.board.every(cell => cell.object?.appearance === undefined))).toBe(true)
  })
})
