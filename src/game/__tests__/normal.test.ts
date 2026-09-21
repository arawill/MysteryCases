import { describe, expect, it } from 'vitest'
import { analyzeCase } from '../analysis'
import { formatDifficultyStars } from '../difficulty'
import { clearNormalCaseCache, generateNormalCase, getCachedNormalCase } from '../normal/generator'
import { getNormalCaseId, getNormalCaseSeed } from '../normal/ids'
import { getVersionedProceduralCaseId } from '../generation/version'
import { NORMAL_PROGRESS_KEY, countCompletedUnlockCases, getUnlockedDifficulties, isDifficultyUnlocked, loadNormalProgress, markNormalCaseCompleted, saveNormalProgress, setSelectedDifficulty } from '../persistence/normalProgress'
import { recordCaseCompletion } from '../persistence/completion'
import { clearCaseSave, loadCaseSave, saveCase } from '../persistence/caseSave'
import { recordInvestigationCompletion } from '../persistence/investigationHistory'
import { isCaseCompleted } from '../persistence/progress'
import { findKiller } from '../rules'
import { solveCase, solveCaseWithStats } from '../solver'
import { validateCaseDefinition } from '../validation'
import { zoneTheme } from '../zones/theme'

class MemoryStorage { private values = new Map<string, string>(); get length() { return this.values.size } clear() { this.values.clear() } getItem(key: string) { return this.values.get(key) ?? null } key(index: number) { return [...this.values.keys()][index] ?? null } removeItem(key: string) { this.values.delete(key) } setItem(key: string, value: string) { this.values.set(key, value) } }

describe('normal progress', () => {
  it('clears a solved Normal save after recording the run, so a replay starts empty', () => {
    const storage = new MemoryStorage() as unknown as Storage
    const caseSaveId = 'normal-d1-c02-g7'
    saveCase(caseSaveId, { placements: [{ characterId: 'person-01', position: { row: 1, column: 1 } }], manualExcludedCells: [{ row: 2, column: 2 }], hintsUsed: { review: 2, exclusion: 1, reveal: 0 }, positionChecksUsed: 3 }, storage)
    markNormalCaseCompleted(1, 2, storage)
    recordInvestigationCompletion({ mode: 'normal', logicalId: 'normal-d1-c02', difficulty: 1, assists: { review: 2, exclusion: 1, positionChecks: 3 } }, storage)
    clearCaseSave(caseSaveId, storage)
    expect(loadCaseSave(caseSaveId, storage)).toEqual({ saveVersion: 4, placements: [], manualExcludedCells: [], hintsUsed: { review: 0, exclusion: 0, reveal: 0 }, checkpoints: [], positionChecksUsed: 0 })
    expect(loadNormalProgress(storage).completedCaseNumbersByDifficulty[1]).toEqual([2])
  })
  it('can record a completion without writing global progress', () => { const storage = new MemoryStorage() as unknown as Storage; recordCaseCompletion('normal-d1-c02', false, storage); expect(isCaseCompleted('normal-d1-c02', storage)).toBe(false); recordCaseCompletion('daily-2026-09-08', true, storage); expect(isCaseCompleted('daily-2026-09-08', storage)).toBe(true) })
  it('starts with one star only and unlocks published D2 after fifteen cases and keeps D3 unavailable', () => { const storage = new MemoryStorage() as unknown as Storage; let progress = loadNormalProgress(storage); expect(getUnlockedDifficulties(progress)).toEqual([1]); expect(isDifficultyUnlocked(2, progress)).toBe(false); for (let number = 1; number < 15; number += 1) progress = markNormalCaseCompleted(1, number, storage); expect(isDifficultyUnlocked(2, progress)).toBe(false); progress = markNormalCaseCompleted(1, 15, storage); expect(isDifficultyUnlocked(2, progress)).toBe(true); for (let number = 1; number <= 15; number += 1) progress = markNormalCaseCompleted(2, number, storage); expect(isDifficultyUnlocked(3, progress)).toBe(false) })
  it('keeps progress independent, persists selection and sanitises bad values', () => { const storage = new MemoryStorage() as unknown as Storage; let progress = markNormalCaseCompleted(1, 16, storage); expect(progress.completedCaseNumbersByDifficulty[2]).toEqual([]); progress = setSelectedDifficulty(1, storage); expect(loadNormalProgress(storage).selectedDifficulty).toBe(1); saveNormalProgress({ ...progress, selectedDifficulty: 5, completedCaseNumbersByDifficulty: { ...progress.completedCaseNumbersByDifficulty, 1: [1, 1, 0, 16, 2] } }, storage); expect(loadNormalProgress(storage).selectedDifficulty).toBe(1); expect(loadNormalProgress(storage).completedCaseNumbersByDifficulty[1]).toEqual([1, 2, 16]); storage.setItem(NORMAL_PROGRESS_KEY, '{'); expect(loadNormalProgress(storage)).toEqual({ saveVersion: 2, selectedDifficulty: 1, completedCaseNumbersByDifficulty: { 1: [], 2: [], 3: [], 4: [], 5: [] } }) })
  it('requires a transitive unlock chain', () => { const storage = new MemoryStorage() as unknown as Storage; for (let number = 1; number <= 40; number += 1) markNormalCaseCompleted(2, number, storage); const progress = loadNormalProgress(storage); expect(isDifficultyUnlocked(2, progress)).toBe(false); expect(isDifficultyUnlocked(3, progress)).toBe(false) })
})

describe('normal generator', () => {
  it('uses the handcrafted first case and deterministic descriptors', () => { const first = generateNormalCase({ difficulty: 1, caseNumber: 1 }); expect(first.caseData.id).toBe('case001'); expect(first.caseData.rows).toBe(6); expect(first.caseData.columns).toBe(6); expect(first.killerId).toBe('bruno'); expect(getNormalCaseId(3, 27)).toBe('normal-d3-c27'); expect(getNormalCaseSeed(3, 27)).toBe(getNormalCaseSeed(3, 27)); expect(formatDifficultyStars(3)).toBe('★★★') })
  it.each([[1, 17, 6], [2, 7, 7], [3, 12, 8], [4, 8, 9], [5, 1, 10]] as const)('generates valid unique normal %s/%s', (difficulty, caseNumber, size) => { const first = generateNormalCase({ difficulty, caseNumber }), second = generateNormalCase({ difficulty, caseNumber }); const clues = first.caseData.characters.flatMap(character => character.clues); const isNegative = (type: string) => type === 'notZone' || type === 'notOnObject' || type === 'notBesideObject'; const negative = clues.filter(clue => isNegative(clue.type)); const solved = solveCaseWithStats(first.caseData); expect(first.caseData).toEqual(second.caseData); expect(first.caseData.id).toBe(getVersionedProceduralCaseId(getNormalCaseId(difficulty, caseNumber))); expect(first.caseData.rows).toBe(size); expect(first.caseData.columns).toBe(size); expect(first.caseData.characters).toHaveLength(size); expect(first.caseData.characters.every(character => character.clues.length >= 2 && character.clues.some(clue => !isNegative(clue.type)) && !(character.clues.some(clue => clue.type === 'row') && character.clues.some(clue => clue.type === 'column')))).toBe(true); expect(first.caseData.characters.find(character => character.isVictim)?.clues.length).toBeGreaterThanOrEqual(2); expect(first.caseData.characters.find(character => character.isVictim)?.clues.some(clue => !isNegative(clue.type))).toBe(true); expect(negative.length / clues.length).toBeLessThanOrEqual(.4); expect(validateCaseDefinition(first.caseData)).toEqual([]); expect(solveCase(first.caseData).solutionsFound).toBe(1); expect(solved.solutionsFound).toBe(1); expect(solved.stats.nodesVisited).toBeGreaterThan(0); expect(solved.stats.candidateChecks).toBeGreaterThan(0); expect(analyzeCase(first.caseData)).toMatchObject({ status: 'unique', matchesCanonical: true }); expect(findKiller(first.caseData, first.caseData.solution)?.id).toBe(first.killerId); expect(first.seedOffset).toBeGreaterThanOrEqual(0); expect(first.seedOffset).toBeLessThan(100) }, 30000)
  it('caches Normal cases only for the matching descriptor', () => { clearNormalCaseCache(); const first = getCachedNormalCase({ difficulty: 5, caseNumber: 1 }), same = getCachedNormalCase({ difficulty: 5, caseNumber: 1 }), other = getCachedNormalCase({ difficulty: 5, caseNumber: 2 }); expect(first).toBe(same); expect(other).not.toBe(first); clearNormalCaseCache(); expect(getCachedNormalCase({ difficulty: 5, caseNumber: 1 })).not.toBe(first); expect(getCachedNormalCase({ difficulty: 5, caseNumber: 1 }).caseData).toEqual(first.caseData) })
  it('changes an actual generated descriptor when its difficulty or number changes', () => { const first = generateNormalCase({ difficulty: 1, caseNumber: 2 }); const otherNumber = generateNormalCase({ difficulty: 1, caseNumber: 3 }); const otherDifficulty = generateNormalCase({ difficulty: 2, caseNumber: 2 }); expect(first.caseData.id).not.toBe(otherNumber.caseData.id); expect(first.caseData.id).not.toBe(otherDifficulty.caseData.id) })
})

describe('normal presentation data', () => {
  it('provides four distinct zone tones', () => { expect(Object.keys(zoneTheme).sort()).toEqual(['bathroom', 'cafe', 'kitchen', 'storage']); expect(new Set(Object.values(zoneTheme).map(theme => theme.background)).size).toBe(4); expect(Object.values(zoneTheme).every(theme => Boolean(theme.dot))).toBe(true) })
  it('ignores legacy case numbers outside the active campaign', () => { const storage = new MemoryStorage() as unknown as Storage; let progress = loadNormalProgress(storage); for (let number = 16; number <= 80; number += 1) progress = markNormalCaseCompleted(1, number, storage); expect(countCompletedUnlockCases(1, progress)).toBe(0); expect(isDifficultyUnlocked(2, progress)).toBe(false) })
})
