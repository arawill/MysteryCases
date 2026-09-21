import { PUBLISHED_NORMAL_TOTAL } from './availability'
export const NORMAL_CASE_COUNT = 15
export const NORMAL_DIFFICULTY_COUNT = 5
export const NORMAL_TOTAL_CASE_COUNT = PUBLISHED_NORMAL_TOTAL
export const NORMAL_UNLOCK_CASE_COUNT = NORMAL_CASE_COUNT

export const isActiveNormalCaseNumber = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= NORMAL_CASE_COUNT
