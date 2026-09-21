import { isNormalDifficultyAvailable, isPublishedNormalCase, getPublishedNormalCount } from '../normal/availability'
import { isDifficultyRating } from '../difficulty'
import { NORMAL_CASE_COUNT, NORMAL_UNLOCK_CASE_COUNT } from '../normal/constants'
import type { DifficultyRating } from '../types'

export const NORMAL_PROGRESS_KEY = 'mystery-cases-normal-progress'
export { NORMAL_CASE_COUNT, NORMAL_UNLOCK_CASE_COUNT }
export interface NormalModeProgress { saveVersion: 2; selectedDifficulty: DifficultyRating; completedCaseNumbersByDifficulty: Record<DifficultyRating, number[]> }
interface LegacyNormalModeProgress { saveVersion: 1; selectedDifficulty?: unknown; completedCaseNumbersByDifficulty?: Partial<Record<DifficultyRating, unknown>> }
interface CurrentNormalModeProgress { saveVersion: 2; selectedDifficulty?: unknown; completedCaseNumbersByDifficulty?: Partial<Record<DifficultyRating, unknown>> }

const difficulties = [1, 2, 3, 4, 5] as DifficultyRating[]
const emptyCompletions = (): Record<DifficultyRating, number[]> => ({ 1: [], 2: [], 3: [], 4: [], 5: [] })
const empty = (): NormalModeProgress => ({ saveVersion: 2, selectedDifficulty: 1, completedCaseNumbersByDifficulty: emptyCompletions() })
const normalise = (value: unknown): NormalModeProgress => {
  if (!value || typeof value !== 'object') return empty()
  const candidate = value as { saveVersion?: unknown }
  if (candidate.saveVersion !== 1 && candidate.saveVersion !== 2) return empty()
  const record: LegacyNormalModeProgress | CurrentNormalModeProgress = candidate.saveVersion === 1 ? value as LegacyNormalModeProgress : value as CurrentNormalModeProgress
  const completed = emptyCompletions()
  for (const difficulty of difficulties) {
    const values = record.completedCaseNumbersByDifficulty?.[difficulty]
    completed[difficulty] = Array.isArray(values) ? [...new Set(values.filter(value => Number.isInteger(value) && value >= 1 && value <= 80))].sort((a, b) => a - b) : []
  }
  const provisional: NormalModeProgress = { saveVersion: 2, selectedDifficulty: isDifficultyRating(record.selectedDifficulty) ? record.selectedDifficulty : 1, completedCaseNumbersByDifficulty: completed }
  return { ...provisional, selectedDifficulty: isDifficultyUnlocked(provisional.selectedDifficulty, provisional) ? provisional.selectedDifficulty : getUnlockedDifficulties(provisional).at(-1) ?? 1 }
}
export function loadNormalProgress(storage: Storage = localStorage): NormalModeProgress { try { return normalise(JSON.parse(storage.getItem(NORMAL_PROGRESS_KEY) ?? 'null')) } catch { return empty() } }
export function saveNormalProgress(progress: NormalModeProgress, storage: Storage = localStorage) { const safe = normalise(progress); storage.setItem(NORMAL_PROGRESS_KEY, JSON.stringify(safe)); return safe }
export function countCompletedNormalCases(difficulty: DifficultyRating, progress: NormalModeProgress) { return progress.completedCaseNumbersByDifficulty[difficulty].filter(number => isPublishedNormalCase(difficulty, number)).length }
export function countCompletedUnlockCases(difficulty: DifficultyRating, progress: NormalModeProgress) { return progress.completedCaseNumbersByDifficulty[difficulty].filter(number => isPublishedNormalCase(difficulty, number)).length }
export function isDifficultyUnlocked(difficulty: DifficultyRating, progress: NormalModeProgress): boolean { if (!isNormalDifficultyAvailable(difficulty)) return false; if (difficulty === 1) return true; const previous = (difficulty - 1) as DifficultyRating; return isDifficultyUnlocked(previous, progress) && countCompletedUnlockCases(previous, progress) === getPublishedNormalCount(previous) }
export function getUnlockedDifficulties(progress: NormalModeProgress) { return difficulties.filter(difficulty => isDifficultyUnlocked(difficulty, progress)) }
export function isNormalCaseCompleted(difficulty: DifficultyRating, caseNumber: number, progress: NormalModeProgress) { return isPublishedNormalCase(difficulty, caseNumber) && progress.completedCaseNumbersByDifficulty[difficulty].includes(caseNumber) }
export function markNormalCaseCompleted(difficulty: DifficultyRating, caseNumber: number, storage: Storage = localStorage) { const progress = loadNormalProgress(storage); if (!isPublishedNormalCase(difficulty, caseNumber) || !isDifficultyUnlocked(difficulty, progress)) return progress; const next: NormalModeProgress = { ...progress, completedCaseNumbersByDifficulty: { ...progress.completedCaseNumbersByDifficulty, [difficulty]: [...new Set([...progress.completedCaseNumbersByDifficulty[difficulty], caseNumber])].sort((a, b) => a - b) } }; return saveNormalProgress(next, storage) }
export function setSelectedDifficulty(difficulty: DifficultyRating, storage: Storage = localStorage) { const progress = loadNormalProgress(storage); const selectedDifficulty = isDifficultyUnlocked(difficulty, progress) ? difficulty : getUnlockedDifficulties(progress).at(-1) ?? 1; return saveNormalProgress({ ...progress, selectedDifficulty }, storage) }
