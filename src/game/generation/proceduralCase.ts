import { selectCharactersForDifficulty } from '../characters/selector'
import { getDifficultyPreset } from '../difficultyPresets'
import type { DifficultyRating, GameCase } from '../types'
import { generatePuzzle } from './generator'
import type { GenerationStats } from './types'
import { hasReadableClues } from './clueQuality'
import { createDifficultyScenarioProfile } from './difficultyProfile'
import { generateScenarioTemplate } from './scenario/generator'

export interface GeneratedProceduralCase { caseData: GameCase; baseSeed: number; effectiveSeed: number; seedOffset: number; killerId: string; scenarioAttempts: number; stats: GenerationStats }

export function generateProceduralCase({ id, title, intro, difficulty, seed }: { id: string; title: string; intro: string; difficulty: DifficultyRating; seed: number }): GeneratedProceduralCase {
  const preset = getDifficultyPreset(difficulty), characters = selectCharactersForDifficulty(difficulty, seed)
  if (characters.length !== preset.characterCount) throw new Error('Character roster does not match difficulty preset.')
  const profile = createDifficultyScenarioProfile({ id, title, intro, difficulty, characters })
  for (let offset = 0; offset < 100; offset += 1) {
    const effectiveSeed = (seed + offset) >>> 0
    try {
      const scenario = generateScenarioTemplate(profile, { seed: effectiveSeed })
      const puzzle = generatePuzzle(scenario.template, { seed: effectiveSeed, minCluesPerCharacter: 2, minimizeClues: false })
      const caseData = { ...puzzle.caseData, id }
      if (!hasReadableClues(caseData)) continue
      return { caseData, baseSeed: seed, effectiveSeed, seedOffset: offset, killerId: puzzle.killerId, scenarioAttempts: scenario.stats.scenarioAttempts, stats: puzzle.stats }
    } catch { continue }
  }
  throw new Error(`Unable to generate procedural case for difficulty ${difficulty}.`)
}
