import type { DifficultyRating } from './types'

export function isDifficultyRating(value: unknown): value is DifficultyRating { return value === 1 || value === 2 || value === 3 || value === 4 || value === 5 }
export function formatDifficultyStars(difficulty: DifficultyRating): string { return '★'.repeat(difficulty) }
