import { describe, expect, it } from 'vitest'
import { analyzeCase } from '../analysis'
import { nameCatalog, femaleNameCatalog, maleNameCatalog } from '../characters/nameCatalog'
import { buildCharacterRoster, getGenderCountsForDifficulty } from '../characters/roster'
import { allDifficultyPresets } from '../difficultyPresets'
import { generateProceduralCase } from '../generation/proceduralCase'
import { PROCEDURAL_GENERATION_LIMITS } from '../generation/generator'
import { validateHumanClueQuality } from '../generation/clueQuality'
import { findKiller } from '../rules'
import { scenarioPacks, selectScenarioPack } from '../scenarios/catalog'
import { solveCase } from '../solver'
import { validateCaseDefinition } from '../validation'
import { case001 } from '../../data/cases/case001'

describe('procedural people', () => {
  it('contains exactly 100 names per gender and 200 independent entries', () => {
    expect(maleNameCatalog).toHaveLength(100); expect(femaleNameCatalog).toHaveLength(100); expect(nameCatalog).toHaveLength(200)
    expect(new Set(nameCatalog.map(entry => entry.id)).size).toBe(200)
    for (const catalog of [maleNameCatalog, femaleNameCatalog]) { expect(new Set(catalog.map(entry => entry.name)).size).toBe(100); expect(catalog.every(entry => entry.name.trim() !== '')).toBe(true) }
    expect(maleNameCatalog.some(entry => entry.name === 'José')).toBe(true); expect(femaleNameCatalog.some(entry => entry.name === 'Eulàlia')).toBe(true)
  })
  it('balances genders exactly and uses both odd majorities', () => {
    expect(getGenderCountsForDifficulty(1, 1)).toEqual({ female: 3, male: 3 }); expect(getGenderCountsForDifficulty(3, 1)).toEqual({ female: 4, male: 4 }); expect(getGenderCountsForDifficulty(5, 1)).toEqual({ female: 5, male: 5 })
    for (const difficulty of [2, 4] as const) expect(new Set(Array.from({ length: 100 }, (_, seed) => getGenderCountsForDifficulty(difficulty, seed).female))).toEqual(new Set([Math.floor((5 + difficulty) / 2), Math.ceil((5 + difficulty) / 2)]))
  })
  it('is deterministic, unique in a case, and respects pack roles', () => {
    for (let seed = 0; seed < 100; seed += 1) for (const difficulty of allDifficultyPresets.map(item => item.rating)) {
      const pack = selectScenarioPack(seed), roster = buildCharacterRoster({ difficulty, seed, scenarioPack: pack })
      expect(roster).toEqual(buildCharacterRoster({ difficulty, seed, scenarioPack: pack })); expect(new Set(roster.map(person => person.name)).size).toBe(roster.length); expect(new Set(roster.map(person => person.avatarImage)).size).toBe(roster.length)
      expect(roster.every(person => person.gender && person.roleId && person.roleLabel && person.avatarImage)).toBe(true); expect(roster.filter(person => person.isVictim)).toHaveLength(1)
      for (const person of roster) expect(pack.roles.some(role => role.id === person.roleId)).toBe(true)
    }
  })
  it('keeps names, avatars and roles independent across seeds', () => {
    const seen = new Map<string, { avatars: Set<string>; roles: Set<string> }>()
    for (let seed = 0; seed < 1000; seed += 1) for (const person of buildCharacterRoster({ difficulty: 1, seed, scenarioPack: selectScenarioPack(seed) })) {
      const value = seen.get(person.name) ?? { avatars: new Set<string>(), roles: new Set<string>() }; value.avatars.add(person.avatarImage!); value.roles.add(person.roleId!); seen.set(person.name, value)
    }
    expect([...seen.values()].some(value => value.avatars.size > 1)).toBe(true)
    expect([...seen.values()].some(value => value.roles.size > 1)).toBe(true)
  })
  it('defines role catalogs with capacity and never exceeds their limits', () => {
    for (const pack of scenarioPacks) {
      expect(new Set(pack.roles.map(role => role.id)).size).toBe(pack.roles.length); expect(pack.roles.every(role => role.maleLabel && role.femaleLabel && role.maxPerCase >= 1)).toBe(true); expect(pack.roles.reduce((sum, role) => sum + role.maxPerCase, 0)).toBeGreaterThanOrEqual(10)
      for (let seed = 0; seed < 20; seed += 1) { const roster = buildCharacterRoster({ difficulty: 5, seed, scenarioPack: pack }); for (const role of pack.roles) expect(roster.filter(person => person.roleId === role.id).length).toBeLessThanOrEqual(role.maxPerCase) }
    }
  })
  it('generates valid unique cases for every difficulty without mutating Case001', () => {
    const before = structuredClone(case001)
    for (const preset of allDifficultyPresets) { const generated = generateProceduralCase({ id: `test-${preset.rating}`, title: 'Test', intro: 'Test', difficulty: preset.rating, seed: 4000 + preset.rating }), { caseData } = generated; expect(caseData.characters).toHaveLength(preset.characterCount); expect(validateCaseDefinition(caseData)).toEqual([]); expect(solveCase(caseData).solutionsFound).toBe(1); expect(analyzeCase(caseData)).toMatchObject({ status: 'unique', matchesCanonical: true }); expect(findKiller(caseData, caseData.solution)?.id).toBe(generated.killerId) }
    expect(case001).toEqual(before)
  }, 30000)
  it('rejects pathological D5 attempts within deterministic budgets and completes seed 2301207300', () => {
    const generated = generateProceduralCase({ id: 'd5-regression', title: 'D5 regression', intro: '', difficulty: 5, seed: 2301207300 })
    expect(generated.seedOffset).toBeLessThan(100)
    expect(generated.stats.solverCalls).toBeLessThanOrEqual(PROCEDURAL_GENERATION_LIMITS.maxSolverCalls)
    expect(generated.caseData.characters.find(character => character.isVictim)?.clues).toEqual([])
    expect(validateHumanClueQuality(generated.caseData)).toEqual([])
    expect(analyzeCase(generated.caseData)).toMatchObject({ status: 'unique', matchesCanonical: true })
    expect(findKiller(generated.caseData, generated.caseData.solution)?.id).toBe(generated.killerId)
  }, 30000)
  it('keeps Case001 canonical names, legacy emojis and logic while adding portraits', () => {
    expect(case001.characters.map(person => [person.name, person.avatar, person.gender, person.roleId])).toEqual([['Lucía', '🦊', undefined, undefined], ['Mateo', '🦉', undefined, undefined], ['Nora', '🐈', undefined, undefined], ['Bruno', '🦬', undefined, undefined], ['Inés', '🦋', undefined, undefined], ['Alma', '🌙', undefined, undefined]])
    expect(new Set(case001.characters.map(person => person.avatarImage)).size).toBe(6)
    expect(findKiller(case001, case001.solution)?.id).toBe('bruno'); expect(solveCase(case001).solutionsFound).toBe(1)
  })
})
