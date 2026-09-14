import { getDifficultyPreset } from '../difficultyPresets'
import { selectScenarioPack } from '../scenarios/catalog'
import type { ScenarioProfile } from './scenario/types'
import type { GenerationCharacter } from './types'
import type { DifficultyRating } from '../types'

export function createDifficultyScenarioProfile({ id, title, intro, difficulty, characters, seed }: { id: string; title: string; intro: string; difficulty: DifficultyRating; characters: GenerationCharacter[]; seed: number }): ScenarioProfile {
  const preset = getDifficultyPreset(difficulty)
  const pack = selectScenarioPack(seed)
  return { id, title, intro, difficulty, rows: preset.rows, columns: preset.columns, characters: characters.map(character => ({ ...character })), zones: pack.zones.map(zone => ({ ...zone })), objects: pack.objects.map(object => ({ ...object })) }
}
