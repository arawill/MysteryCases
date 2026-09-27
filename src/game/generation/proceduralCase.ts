import { buildCharacterRoster } from '../characters/roster'
import { getDifficultyPreset } from '../difficultyPresets'
import type { DifficultyRating, GameCase } from '../types'
import { generatePuzzle } from './generator'
import type { GenerationStats } from './types'
import { validateHumanClueQuality } from './clueQuality'
import { getMinimumCluesPerCharacter } from './clueSemantics'
import { createDifficultyScenarioProfile } from './difficultyProfile'
import { generateScenarioTemplate } from './scenario/generator'
import { getVersionedProceduralCaseId } from './version'
import { selectScenarioPack } from '../scenarios/catalog'
import { classifyGenerationError, createProceduralDiagnosticTracker, type ProceduralGenerationMode, type ProceduralObservabilityOptions } from './observability'

export interface GeneratedProceduralCase { caseData: GameCase; baseSeed: number; effectiveSeed: number; seedOffset: number; killerId: string; scenarioAttempts: number; stats: GenerationStats }

export function generateProceduralCase({ id, title, intro, difficulty, seed }: { id: string; title: string; intro: string; difficulty: DifficultyRating; seed: number }, observability?: ProceduralObservabilityOptions, mode: ProceduralGenerationMode = 'procedural'): GeneratedProceduralCase {
  const tracker = createProceduralDiagnosticTracker(mode, difficulty, seed, observability)
  const preset = getDifficultyPreset(difficulty), scenarioPack = selectScenarioPack(seed), characters = buildCharacterRoster({ difficulty, seed, scenarioPack })
  if (characters.length !== preset.characterCount) { tracker?.recordRejection('roster-invariant'); tracker?.emit('failure'); throw new Error('Character roster does not match difficulty preset.') }
  const profile = createDifficultyScenarioProfile({ id, title, intro, difficulty, characters, scenarioPack })
  for (let offset = 0; offset < 100; offset += 1) {
    tracker?.recordCandidate()
    const effectiveSeed = (seed + offset) >>> 0
    try {
      const scenario = generateScenarioTemplate(profile, { seed: effectiveSeed, ...(tracker ? { instrumentation: tracker } : {}) })
      const puzzle = generatePuzzle(scenario.template, { seed: effectiveSeed, minCluesPerCharacter: getMinimumCluesPerCharacter(difficulty), minimizeClues: false, procedural: true, ...(tracker ? { instrumentation: tracker } : {}) })
      const caseData = { ...puzzle.caseData, id: getVersionedProceduralCaseId(id) }
      if (validateHumanClueQuality(caseData).length > 0) { tracker?.recordRejection('post-generation-quality'); continue }
      tracker?.emit(offset === 0 ? 'success' : 'fallback', offset, effectiveSeed)
      return { caseData, baseSeed: seed, effectiveSeed, seedOffset: offset, killerId: puzzle.killerId, scenarioAttempts: scenario.stats.scenarioAttempts, stats: puzzle.stats }
    } catch (error) { tracker?.recordRejection(classifyGenerationError(error)); continue }
  }
  tracker?.recordRejection('candidate-limit'); tracker?.emit('failure')
  throw new Error(`Unable to generate procedural case for difficulty ${difficulty}.`)
}
