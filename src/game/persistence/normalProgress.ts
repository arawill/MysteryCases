import { isDifficultyRating } from '../difficulty'
import type { DifficultyRating } from '../types'

export const NORMAL_PROGRESS_KEY = 'mystery-cases-normal-progress'
export const NORMAL_CASE_COUNT = 80
export interface NormalModeProgress { saveVersion: 1; selectedDifficulty: DifficultyRating; completedCaseNumbersByDifficulty: Record<DifficultyRating, number[]> }

const emptyCompletions = (): Record<DifficultyRating, number[]> => ({ 1: [], 2: [], 3: [], 4: [], 5: [] })
const empty = (): NormalModeProgress => ({ saveVersion: 1, selectedDifficulty: 1, completedCaseNumbersByDifficulty: emptyCompletions() })
const validCaseNumber = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 1 && (value as number) <= NORMAL_CASE_COUNT
const normalise = (value: unknown): NormalModeProgress => {
  if (!value || typeof value !== 'object') return empty()
  const record = value as Partial<NormalModeProgress>
  const completed = emptyCompletions()
  for (const difficulty of [1, 2, 3, 4, 5] as DifficultyRating[]) {
    const values = record.completedCaseNumbersByDifficulty?.[difficulty]
    completed[difficulty] = Array.isArray(values) ? [...new Set(values.filter(validCaseNumber))].sort((a, b) => a - b) : []
  }
  const provisional = { saveVersion: 1 as const, selectedDifficulty: isDifficultyRating(record.selectedDifficulty) ? record.selectedDifficulty : 1, completedCaseNumbersByDifficulty: completed }
  return { ...provisional, selectedDifficulty: isDifficultyUnlocked(provisional.selectedDifficulty, provisional) ? provisional.selectedDifficulty : getUnlockedDifficulties(provisional).at(-1) ?? 1 }
}
export function loadNormalProgress(storage: Storage = localStorage): NormalModeProgress { try { return normalise(JSON.parse(storage.getItem(NORMAL_PROGRESS_KEY) ?? 'null')) } catch { return empty() } }
export function saveNormalProgress(progress: NormalModeProgress, storage: Storage = localStorage) { storage.setItem(NORMAL_PROGRESS_KEY, JSON.stringify(normalise(progress))) }
export function countCompletedNormalCases(difficulty: DifficultyRating, progress: NormalModeProgress) { return progress.completedCaseNumbersByDifficulty[difficulty].length }
export function countCompletedFirstForty(difficulty: DifficultyRating, progress: NormalModeProgress) { return progress.completedCaseNumbersByDifficulty[difficulty].filter(number => number <= 40).length }
export function isDifficultyUnlocked(difficulty: DifficultyRating, progress: NormalModeProgress) { return difficulty === 1 || countCompletedFirstForty((difficulty - 1) as DifficultyRating, progress) === 40 }
export function getUnlockedDifficulties(progress: NormalModeProgress) { return ([1, 2, 3, 4, 5] as DifficultyRating[]).filter(difficulty => isDifficultyUnlocked(difficulty, progress)) }
export function isNormalCaseCompleted(difficulty: DifficultyRating, caseNumber: number, progress: NormalModeProgress) { return validCaseNumber(caseNumber) && progress.completedCaseNumbersByDifficulty[difficulty].includes(caseNumber) }
export function markNormalCaseCompleted(difficulty: DifficultyRating, caseNumber: number, storage: Storage = localStorage) { if (!validCaseNumber(caseNumber)) return loadNormalProgress(storage); const progress = loadNormalProgress(storage); const next = { ...progress, completedCaseNumbersByDifficulty: { ...progress.completedCaseNumbersByDifficulty, [difficulty]: [...new Set([...progress.completedCaseNumbersByDifficulty[difficulty], caseNumber])].sort((a, b) => a - b) } }; saveNormalProgress(next, storage); return loadNormalProgress(storage) }
export function setSelectedDifficulty(difficulty: DifficultyRating, storage: Storage = localStorage) { const progress = loadNormalProgress(storage); const selectedDifficulty = isDifficultyUnlocked(difficulty, progress) ? difficulty : getUnlockedDifficulties(progress).at(-1) ?? 1; const next = { ...progress, selectedDifficulty }; saveNormalProgress(next, storage); return next }
