import { analyzeCase } from '../analysis'
import { selectCharactersForDifficulty } from '../characters/selector'
import { getDifficultyPreset } from '../difficultyPresets'
import { findKiller } from '../rules'
import { solveCase } from '../solver'
import type { DifficultyRating, GameCase } from '../types'
import { validateCaseDefinition } from '../validation'
import { generatePuzzle } from './generator'
import { createDifficultyScenarioProfile } from './difficultyProfile'
import { generateScenarioTemplate } from './scenario/generator'
export interface GeneratedProceduralCase { caseData: GameCase; baseSeed: number; effectiveSeed: number; seedOffset: number; killerId: string; scenarioAttempts: number }
export function generateProceduralCase({ id, title, intro, difficulty, seed }: { id: string; title: string; intro: string; difficulty: DifficultyRating; seed: number }): GeneratedProceduralCase { const preset = getDifficultyPreset(difficulty), characters = selectCharactersForDifficulty(difficulty, seed); if (characters.length !== preset.characterCount) throw new Error('Character roster does not match difficulty preset.'); const profile = createDifficultyScenarioProfile({ id, title, intro, difficulty, characters }); for (let offset = 0; offset < 100; offset += 1) { const effectiveSeed = (seed + offset) >>> 0; try { const scenario = generateScenarioTemplate(profile, { seed: effectiveSeed }); const puzzle = generatePuzzle(scenario.template, { seed: effectiveSeed }); const caseData = { ...puzzle.caseData, id }; const analysis = analyzeCase(caseData), killer = findKiller(caseData, caseData.solution); if (validateCaseDefinition(caseData).length || analysis.status !== 'unique' || analysis.matchesCanonical !== true || solveCase(caseData).solutionsFound !== 1 || !killer) continue; return { caseData, baseSeed: seed, effectiveSeed, seedOffset: offset, killerId: killer.id, scenarioAttempts: scenario.stats.scenarioAttempts } } catch { continue } } throw new Error(`Unable to generate procedural case for difficulty ${difficulty}.`) }
