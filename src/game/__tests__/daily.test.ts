import { describe, expect, it } from 'vitest'
import { analyzeCase } from '../analysis'
import { avatarCatalog } from '../characters/avatarCatalog'
import { dailyCharacterCatalog, selectDailyCharactersForDate } from '../daily/characters'
import { getDailyCaseId, getDailyDateKey, getDailySeed } from '../daily/date'
import { clearDailyCaseCache, generateDailyCase, getCachedDailyCase } from '../daily/generator'
import { hasReadableClues, isNegativeClue, validateHumanClueQuality } from '../generation/clueQuality'
import { clueFamily } from '../generation/clueSemantics'
import { getCaseSaveKey } from '../persistence/caseSave'
import { isCaseCompleted, markCaseCompleted } from '../persistence/progress'
import { findKiller } from '../rules'
import { scenarioPacks } from '../scenarios/catalog'
import { solveCase } from '../solver'
import { validateCaseDefinition } from '../validation'
import { case001 } from '../../data/cases/case001'

const memory = () => { const data = new Map<string, string>(); return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key), clear: () => data.clear(), key: () => null, get length() { return data.size } } as Storage }
const dateA = new Date(2026, 8, 8, 12), dateB = new Date(2026, 8, 9, 12), dateC = new Date(2026, 9, 1, 12)
const rosterSignature = (date: Date) => selectDailyCharactersForDate(date).map(person => `${person.name}:${person.avatarImage}:${person.roleId}`).join('|')
const clueQuality = (generated: ReturnType<typeof generateDailyCase>) => {
  const clues = generated.caseData.characters.flatMap(character => character.clues)
  expect(hasReadableClues(generated.caseData)).toBe(true)
  expect(generated.caseData.characters.every(character => character.clues.length >= 2 && character.clues.some(clue => !isNegativeClue(clue)) && !(character.clues.some(clue => clue.type === 'row') && character.clues.some(clue => clue.type === 'column')))).toBe(true)
  const victim = generated.caseData.characters.find(character => character.isVictim)
  expect(victim?.clues.length).toBeGreaterThanOrEqual(2); expect(victim?.clues.some(clue => !isNegativeClue(clue))).toBe(true)
  expect(clues.filter(isNegativeClue).length / clues.length).toBeLessThanOrEqual(.4)
}

describe('daily case', () => {
  it('uses the shared deterministic 200-name roster', () => { expect(dailyCharacterCatalog).toHaveLength(200); for (const date of [dateA, dateB]) { const roster = selectDailyCharactersForDate(date); expect(roster).toHaveLength(6); expect(new Set(roster.map(item => item.name)).size).toBe(6); expect(new Set(roster.map(item => item.avatarImage)).size).toBe(6); expect(roster.filter(item => item.isVictim)).toHaveLength(1); expect(roster.every(item => item.gender && item.roleId && item.roleLabel)).toBe(true) }; expect(selectDailyCharactersForDate(dateA)).toEqual(selectDailyCharactersForDate(dateA)) })
  it('has broad roster variety across 365 consecutive days without relying on person IDs', () => { const signatures = Array.from({ length: 365 }, (_, offset) => rosterSignature(new Date(2026, 0, 1 + offset, 12))); expect(new Set(signatures).size).toBeGreaterThan(350); expect(signatures.filter((signature, index) => index > 0 && signature === signatures[index - 1])).toHaveLength(0) })
  it('is deterministic by date and materially differs across dates', () => { const generated = [dateA, dateB, dateC].map(date => generateDailyCase(date)); expect(generateDailyCase(dateA)).toEqual(generated[0]); expect(new Set(generated.map(item => item.caseData.id)).size).toBe(3); for (let index = 1; index < generated.length; index += 1) { expect(generated[index].caseData.board).not.toEqual(generated[index - 1].caseData.board); expect(generated[index].caseData.characters.map(person => [person.name, person.avatarImage, person.roleId])).not.toEqual(generated[index - 1].caseData.characters.map(person => [person.name, person.avatarImage, person.roleId])) } })
  it.each([1, 2, 3, 4, 5] as const)('generates valid, readable and unique Daily difficulty %s', difficulty => { const generated = generateDailyCase(dateA, difficulty); clueQuality(generated); expect(validateCaseDefinition(generated.caseData)).toEqual([]); expect(solveCase(generated.caseData).solutionsFound).toBe(1); expect(analyzeCase(generated.caseData)).toMatchObject({ status: 'unique', matchesCanonical: true }); expect(findKiller(generated.caseData, generated.caseData.solution)?.id).toBe(generated.killerId); expect(generated.seedOffset).toBeGreaterThanOrEqual(0); expect(generated.seedOffset).toBeLessThan(100); expect(generated.effectiveSeed).toBe((generated.baseSeed + generated.seedOffset) >>> 0) }, 30000)
  it('keeps Daily 14/09/2026 D1 human-readable without coordinate clues', () => { const generated = generateDailyCase(new Date(2026, 8, 14, 12), 1), clues = generated.caseData.characters.flatMap(character => character.clues); expect(validateHumanClueQuality(generated.caseData)).toEqual([]); expect(analyzeCase(generated.caseData)).toMatchObject({ status: 'unique', matchesCanonical: true }); expect(findKiller(generated.caseData, generated.caseData.solution)?.id).toBe(generated.killerId); expect(clues.filter(clue => clue.type === 'row' || clue.type === 'column')).toHaveLength(0); expect(clues.filter(isNegativeClue)).toHaveLength(0); expect(generated.caseData.characters.every(character => character.clues.length >= 3 && new Set(character.clues.map(clueFamily)).size >= 2)).toBe(true) })
  it('derives stable date IDs, separate cache and progress', () => { clearDailyCaseCache(); expect(getDailyDateKey(dateA)).toBe('2026-09-08'); expect(getDailySeed(dateA)).not.toBe(getDailySeed(dateB)); expect(getCachedDailyCase(dateA)).toBe(getCachedDailyCase(dateA)); const storage = memory(), idA = getDailyCaseId(dateA), idB = getDailyCaseId(dateB); markCaseCompleted(idA, storage); expect(isCaseCompleted(idA, storage)).toBe(true); expect(isCaseCompleted(idB, storage)).toBe(false); expect(getCaseSaveKey(idA)).toBe('mystery-cases-daily-2026-09-08') })
  it('does not mutate Case001 or procedural catalogs', () => { const originalCase = structuredClone(case001), originalNames = structuredClone(dailyCharacterCatalog), originalAvatars = structuredClone(avatarCatalog), originalPacks = structuredClone(scenarioPacks); generateDailyCase(dateA); expect(case001).toEqual(originalCase); expect(dailyCharacterCatalog).toEqual(originalNames); expect(avatarCatalog).toEqual(originalAvatars); expect(scenarioPacks).toEqual(originalPacks) })
})
