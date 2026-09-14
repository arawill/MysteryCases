import { buildCharacterRoster } from '../characters/roster'
import { nameCatalog } from '../characters/nameCatalog'
import { selectScenarioPack } from '../scenarios/catalog'
import type { DifficultyRating } from '../types'
import { getDailyDifficultySeed } from './date'

/** Compatibility surface for Daily; it now delegates to the shared roster. */
export const dailyCharacterCatalog = nameCatalog
export function selectDailyCharactersForDate(date: Date, difficulty: DifficultyRating = 1) {
  const seed = getDailyDifficultySeed(date, difficulty)
  return buildCharacterRoster({ difficulty, seed, scenarioPack: selectScenarioPack(seed) })
}
