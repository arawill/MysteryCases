import { case001 } from '../../data/cases/case001'
import { generatePuzzle } from '../generation/generator'
import type { GenerationStats } from '../generation/types'
import { hasReadableClues } from '../generation/clueQuality'
import { createScenarioProfile } from '../generation/scenario/profile'
import { createDifficultyScenarioProfile } from '../generation/difficultyProfile'
import { generateScenarioTemplate } from '../generation/scenario/generator'
import type { GameCase } from '../types'
import { selectDailyCharactersForDate } from './characters'
import { getDailyDateKey } from './date'
import { getDailyDifficultySeed, getDailyPuzzleId } from './date'
import type { DifficultyRating } from '../types'
import { getVersionedProceduralCaseId } from '../generation/version'

export interface GeneratedDailyCase { caseData: GameCase; dateKey: string; baseSeed: number; effectiveSeed: number; seedOffset: number; killerId: string; scenarioAttempts: number; stats: GenerationStats }
export function generateDailyCase(date: Date, difficulty: DifficultyRating = 1): GeneratedDailyCase {
  const dateKey = getDailyDateKey(date), baseSeed = getDailyDifficultySeed(date, difficulty), characters = selectDailyCharactersForDate(date, difficulty)
  const base = createScenarioProfile(case001)
  const profile = createDifficultyScenarioProfile({ ...base, id: getDailyPuzzleId(date, difficulty), title: 'Caso diario', intro: 'Un nuevo expediente espera hoy. Reconstruye dónde estaba cada persona y descubre quién se quedó a solas con la víctima.', difficulty, characters })
  for (let offset = 0; offset < 100; offset += 1) {
    const effectiveSeed = (baseSeed + offset) >>> 0
    try {
      const scenario = generateScenarioTemplate(profile, { seed: effectiveSeed })
      const puzzle = generatePuzzle(scenario.template, { seed: effectiveSeed, minCluesPerCharacter: 2, minimizeClues: false })
      const caseData = { ...puzzle.caseData, id: getVersionedProceduralCaseId(getDailyPuzzleId(date, difficulty)) }
      if (!hasReadableClues(caseData)) continue
      return { caseData, dateKey, baseSeed, effectiveSeed, seedOffset: offset, killerId: puzzle.killerId, scenarioAttempts: scenario.stats.scenarioAttempts, stats: puzzle.stats }
    } catch { continue }
  }
  throw new Error('No se pudo generar el caso diario para esta fecha.')
}
const dailyCaseCache = new Map<string, GeneratedDailyCase>()
export function getCachedDailyCase(date: Date, difficulty: DifficultyRating = 1): GeneratedDailyCase { const key = `${getDailyDateKey(date)}:${difficulty}`, cached = dailyCaseCache.get(key); if (cached) return cached; const generated = generateDailyCase(date, difficulty); dailyCaseCache.set(key, generated); return generated }
export function clearDailyCaseCache() { dailyCaseCache.clear() }
