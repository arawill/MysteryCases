import type { DifficultyRating } from '../types'

const publishedCounts: Record<DifficultyRating, number> = { 1: 15, 2: 6, 3: 0, 4: 0, 5: 0 }
export const getPublishedNormalCount = (difficulty: DifficultyRating) => publishedCounts[difficulty]
export const getPublishedNormalNumbers = (difficulty: DifficultyRating) => Array.from({ length: getPublishedNormalCount(difficulty) }, (_, index) => index + 1)
export const isNormalDifficultyAvailable = (difficulty: DifficultyRating) => getPublishedNormalCount(difficulty) > 0
export const isPublishedNormalCase = (difficulty: DifficultyRating, caseNumber: number) => Number.isInteger(caseNumber) && caseNumber >= 1 && caseNumber <= getPublishedNormalCount(difficulty)
export const publishedNormalCases = ([1, 2, 3, 4, 5] as const).flatMap(difficulty => getPublishedNormalNumbers(difficulty).map(caseNumber => ({ difficulty, caseNumber })))
export const PUBLISHED_NORMAL_TOTAL = publishedNormalCases.length
export const getLastPublishedNormalCase = (difficulty?: DifficultyRating) => (difficulty === undefined ? publishedNormalCases : publishedNormalCases.filter(item => item.difficulty === difficulty)).at(-1) ?? null
