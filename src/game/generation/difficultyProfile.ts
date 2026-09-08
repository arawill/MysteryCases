import { case001 } from '../../data/cases/case001'
import { getDifficultyPreset } from '../difficultyPresets'
import { createScenarioProfile } from './scenario/profile'
import type { ScenarioProfile } from './scenario/types'
import type { GenerationCharacter } from './types'
import type { DifficultyRating } from '../types'
export function createDifficultyScenarioProfile({ id, title, intro, difficulty, characters }: { id: string; title: string; intro: string; difficulty: DifficultyRating; characters: GenerationCharacter[] }): ScenarioProfile { const preset = getDifficultyPreset(difficulty), base = createScenarioProfile(case001); return { ...base, id, title, intro, difficulty, rows: preset.rows, columns: preset.columns, characters: characters.map(character => ({ ...character })) } }
