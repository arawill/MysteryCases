import { describe, expect, it } from 'vitest'
import { analyzeCase } from '../analysis'
import { dailyCharacterCatalog, selectDailyCharactersForDate } from '../daily/characters'
import { getDailyCaseId, getDailyDateKey, getDailySeed } from '../daily/date'
import { clearDailyCaseCache, generateDailyCase, getCachedDailyCase } from '../daily/generator'
import { getCaseSaveKey } from '../persistence/caseSave'
import { isCaseCompleted, markCaseCompleted } from '../persistence/progress'
import { findKiller } from '../rules'
import { solveCase } from '../solver'
import { validateCaseDefinition } from '../validation'
import { case001 } from '../../data/cases/case001'

const memory = () => { const data = new Map<string, string>(); return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key), clear: () => data.clear(), key: () => null, get length() { return data.size } } as Storage }
const dateA = new Date(2026, 8, 8, 12), dateB = new Date(2026, 8, 9, 12)
describe('daily case', () => {
  it('uses the shared deterministic 200-name roster', () => { expect(dailyCharacterCatalog).toHaveLength(200); for (const date of [dateA, dateB]) { const roster = selectDailyCharactersForDate(date); expect(roster).toHaveLength(6); expect(new Set(roster.map(item => item.name)).size).toBe(6); expect(new Set(roster.map(item => item.avatarImage)).size).toBe(6); expect(roster.filter(item => item.isVictim)).toHaveLength(1); expect(roster.every(item => item.gender && item.roleId && item.roleLabel)).toBe(true) }; expect(selectDailyCharactersForDate(dateA)).toEqual(selectDailyCharactersForDate(dateA)) })
  it.each([1, 2, 3, 4, 5] as const)('generates valid unique Daily difficulty %s', difficulty => { const generated = generateDailyCase(dateA, difficulty); expect(validateCaseDefinition(generated.caseData)).toEqual([]); expect(solveCase(generated.caseData).solutionsFound).toBe(1); expect(analyzeCase(generated.caseData)).toMatchObject({ status: 'unique', matchesCanonical: true }); expect(findKiller(generated.caseData, generated.caseData.solution)?.id).toBe(generated.killerId) }, 30000)
  it('derives stable date IDs, separate cache and progress', () => { clearDailyCaseCache(); expect(getDailyDateKey(dateA)).toBe('2026-09-08'); expect(getDailySeed(dateA)).not.toBe(getDailySeed(dateB)); expect(generateDailyCase(dateA)).toEqual(generateDailyCase(dateA)); expect(getCachedDailyCase(dateA)).toBe(getCachedDailyCase(dateA)); const storage = memory(), idA = getDailyCaseId(dateA), idB = getDailyCaseId(dateB); markCaseCompleted(idA, storage); expect(isCaseCompleted(idA, storage)).toBe(true); expect(isCaseCompleted(idB, storage)).toBe(false); expect(getCaseSaveKey(idA)).toBe('mystery-cases-daily-2026-09-08') })
  it('does not mutate Case001 or catalog data', () => { const originalCase = structuredClone(case001), originalCatalog = structuredClone(dailyCharacterCatalog); generateDailyCase(dateA); expect(case001).toEqual(originalCase); expect(dailyCharacterCatalog).toEqual(originalCatalog) })
})
