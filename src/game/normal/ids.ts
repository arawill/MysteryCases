import type { DifficultyRating } from '../types'
import { NORMAL_CASE_SET_VERSION } from './frozen'

const NORMAL_CASE_GENERATION_VERSION = 7
export const getNormalCaseId = (difficulty: DifficultyRating, caseNumber: number) => `normal-d${difficulty}-c${String(caseNumber).padStart(2, '0')}`
export const getNormalCaseSeed = (difficulty: DifficultyRating, caseNumber: number) => (Math.imul(difficulty, 0x9e3779b1) + Math.imul(caseNumber, 0x85ebca6b) + 0x13579bdf) >>> 0

export const getFrozenNormalCaseId = (difficulty: DifficultyRating, caseNumber: number) => {
  if (NORMAL_CASE_SET_VERSION !== 2) throw new Error('Unknown frozen Normal case set version.')
  return `normal-d${difficulty}-c${String(caseNumber).padStart(2, '0')}-g${NORMAL_CASE_GENERATION_VERSION}`
}
