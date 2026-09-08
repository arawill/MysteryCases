import { analyzeCase } from '../analysis'
import { case001 } from '../../data/cases/case001'
import { generatePuzzle } from '../generation/generator'
import { createScenarioProfile } from '../generation/scenario/profile'
import { generateScenarioTemplate } from '../generation/scenario/generator'
import { findKiller } from '../rules'
import { solveCase } from '../solver'
import { validateCaseDefinition } from '../validation'
import type { GameCase } from '../types'
import { getDailyCaseId, getDailyDateKey, getDailySeed } from './date'
import { selectDailyCharactersForDate } from './characters'
export interface GeneratedDailyCase { caseData: GameCase; dateKey: string; baseSeed: number; effectiveSeed: number; seedOffset: number; killerId: string; scenarioAttempts: number }
export function generateDailyCase(date: Date): GeneratedDailyCase { const dateKey = getDailyDateKey(date), baseSeed = getDailySeed(date), characters = selectDailyCharactersForDate(date); const base = createScenarioProfile(case001); const profile = { ...base, id: getDailyCaseId(date), title: 'Caso diario', intro: 'Un nuevo expediente espera hoy. Reconstruye dónde estaba cada persona y descubre quién se quedó a solas con la víctima.', difficulty: 1 as const, characters }
  for (let offset = 0; offset < 100; offset += 1) { const effectiveSeed = (baseSeed + offset) >>> 0; try { const scenario = generateScenarioTemplate(profile, { seed: effectiveSeed }); const puzzle = generatePuzzle(scenario.template, { seed: effectiveSeed }); const caseData = { ...puzzle.caseData, id: getDailyCaseId(date) }; const errors = validateCaseDefinition(caseData); const analysis = analyzeCase(caseData); const killer = findKiller(caseData, caseData.solution); if (errors.length || analysis.status !== 'unique' || analysis.matchesCanonical !== true || solveCase(caseData).solutionsFound !== 1 || !killer) continue; return { caseData, dateKey, baseSeed, effectiveSeed, seedOffset: offset, killerId: killer.id, scenarioAttempts: scenario.stats.scenarioAttempts } } catch { continue } }
  throw new Error('No se pudo generar el caso diario para esta fecha.') }
const dailyCaseCache = new Map<string, GeneratedDailyCase>()
export function getCachedDailyCase(date: Date): GeneratedDailyCase { const key = getDailyDateKey(date); const cached = dailyCaseCache.get(key); if (cached) return cached; const generated = generateDailyCase(date); dailyCaseCache.set(key, generated); return generated }
export function clearDailyCaseCache() { dailyCaseCache.clear() }
