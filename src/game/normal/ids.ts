import type { DifficultyRating } from '../types'
export const getNormalCaseId = (difficulty: DifficultyRating, caseNumber: number) => `normal-d${difficulty}-c${String(caseNumber).padStart(2, '0')}`
export const getNormalCaseSeed = (difficulty: DifficultyRating, caseNumber: number) => (Math.imul(difficulty, 0x9e3779b1) + Math.imul(caseNumber, 0x85ebca6b) + 0x13579bdf) >>> 0
