import { describe, expect, it } from 'vitest'
import { analyzeCase } from '../analysis'
import { characterCatalog } from '../characters/catalog'
import { selectCharactersForDifficulty } from '../characters/selector'
import { allDifficultyPresets, getDifficultyPreset } from '../difficultyPresets'
import { generateProceduralCase } from '../generation/proceduralCase'
import { findKiller } from '../rules'
import { solveCase } from '../solver'
import { validateCaseDefinition } from '../validation'
import { case001 } from '../../data/cases/case001'

describe('difficulty presets', () => {
  it('define exactamente los tamaños 6x6 a 10x10', () => { expect(allDifficultyPresets.map(preset => [preset.rating, preset.rows, preset.columns, preset.characterCount])).toEqual([[1,6,6,6],[2,7,7,7],[3,8,8,8],[4,9,9,9],[5,10,10,10]]) })
  it('mantiene catálogo global y selector seeded sin mutación', () => { const before = structuredClone(characterCatalog); expect(characterCatalog.length).toBeGreaterThanOrEqual(18); expect(new Set(characterCatalog.map(character => character.id)).size).toBe(characterCatalog.length); expect(characterCatalog.every(character => character.name.trim() && character.avatar.trim())).toBe(true); for (const preset of allDifficultyPresets) { const first = selectCharactersForDifficulty(preset.rating, 1000 + preset.rating), second = selectCharactersForDifficulty(preset.rating, 1000 + preset.rating); expect(first).toEqual(second); expect(first).toHaveLength(preset.characterCount); expect(new Set(first.map(character => character.id)).size).toBe(preset.characterCount); expect(first.filter(character => character.isVictim)).toHaveLength(1) } expect(characterCatalog).toEqual(before) })
  it.each(allDifficultyPresets.map(preset => [preset.rating, 4000 + preset.rating] as const))('genera un caso válido para dificultad %s', (difficulty, seed) => { const generated = generateProceduralCase({ id: `test-${difficulty}`, title: 'Test', intro: 'Test', difficulty, seed }), preset = getDifficultyPreset(difficulty), { caseData } = generated; expect(caseData.rows).toBe(preset.rows); expect(caseData.columns).toBe(preset.columns); expect(caseData.board).toHaveLength(preset.rows * preset.columns); expect(caseData.characters).toHaveLength(preset.characterCount); expect(caseData.solution).toHaveLength(preset.characterCount); expect(caseData.difficulty).toBe(difficulty); expect(caseData.characters.filter(character => character.isVictim)).toHaveLength(1); expect(validateCaseDefinition(caseData)).toEqual([]); expect(solveCase(caseData).solutionsFound).toBe(1); const analysis = analyzeCase(caseData); expect(analysis.status).toBe('unique'); expect(analysis.matchesCanonical).toBe(true); expect(findKiller(caseData, caseData.solution)?.id).toBe(generated.killerId); expect(generated.seedOffset).toBeGreaterThanOrEqual(0); expect(generated.seedOffset).toBeLessThan(100); expect(generated.effectiveSeed).toBe((generated.baseSeed + generated.seedOffset) >>> 0) }, 20000)
  it('no muta case001 al generar 6x6 y 10x10', () => { const before = structuredClone(case001); generateProceduralCase({ id: 'small', title: '', intro: '', difficulty: 1, seed: 4101 }); generateProceduralCase({ id: 'large', title: '', intro: '', difficulty: 5, seed: 4105 }); expect(case001).toEqual(before) }, 20000)
})
