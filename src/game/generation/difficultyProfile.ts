import { getDifficultyPreset } from '../difficultyPresets'
import type { ScenarioPack } from '../scenarios/types'
import type { ScenarioProfile } from './scenario/types'
import type { GenerationCharacter } from './types'
import type { DifficultyRating } from '../types'

export function createDifficultyScenarioProfile({ id, title, intro, difficulty, characters, scenarioPack }: { id: string; title: string; intro: string; difficulty: DifficultyRating; characters: GenerationCharacter[]; scenarioPack: ScenarioPack }): ScenarioProfile {
  const preset = getDifficultyPreset(difficulty)
  return { id, title, intro, difficulty, rows: preset.rows, columns: preset.columns, characters: characters.map(character => ({ ...character })), zones: scenarioPack.zones.map(zone => ({ ...zone })), objects: scenarioPack.objects.map(object => ({ ...object })) }
}
