import { selectScenarioPack } from '../scenarios/catalog'
import type { DifficultyRating } from '../types'
import type { GenerationCharacter } from '../generation/types'
import { buildCharacterRoster } from './roster'

/** Compatibility entry point for callers that do not already have a pack. */
export function selectCharactersForDifficulty(difficulty: DifficultyRating, seed: number): GenerationCharacter[] {
  return buildCharacterRoster({ difficulty, seed, scenarioPack: selectScenarioPack(seed) })
}
