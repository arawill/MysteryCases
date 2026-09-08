import type { DifficultyRating } from './types'
export interface DifficultyPreset { rating: DifficultyRating; rows: number; columns: number; characterCount: number }
export const allDifficultyPresets: readonly DifficultyPreset[] = [{ rating: 1, rows: 6, columns: 6, characterCount: 6 }, { rating: 2, rows: 7, columns: 7, characterCount: 7 }, { rating: 3, rows: 8, columns: 8, characterCount: 8 }, { rating: 4, rows: 9, columns: 9, characterCount: 9 }, { rating: 5, rows: 10, columns: 10, characterCount: 10 }]
export function getDifficultyPreset(rating: DifficultyRating): DifficultyPreset { const preset = allDifficultyPresets.find(item => item.rating === rating); if (!preset) throw new Error(`Unknown difficulty rating: ${rating}`); return preset }
