import { analyzeCase } from '../analysis'
import { findKiller, placementsEqual } from '../rules'
import { solveCase } from '../solver'
import { validateCaseDefinition } from '../validation'
import { applyCandidates, buildTrueCluePool, type CandidateClue } from './cluePool'
import { createSeededRandom, shuffle } from './random'
import { generateValidPlacement } from './placement'
import { canAddReadableClue, isNegativeClue } from './clueQuality'
import type { GeneratedPuzzle, GenerationStats, GenerationTemplate, GeneratePuzzleOptions } from './types'

const UINT32_MAX = 4294967295
const validateSeed = (seed: number) => { if (!Number.isInteger(seed) || seed < 0 || seed > UINT32_MAX) throw new Error('seed must be a uint32 integer.') }
const validatePositiveInteger = (value: number, name: string) => { if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer.`) }
const validateNonNegativeInteger = (value: number, name: string) => { if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer.`) }
const clueCount = (candidates: readonly CandidateClue[], characterId: string) => candidates.filter(candidate => candidate.characterId === characterId).length
const cluePriority = (candidate: CandidateClue) => { if (isNegativeClue(candidate.clue)) return 3; if (candidate.clue.type === 'row' || candidate.clue.type === 'column') return 0; if (candidate.clue.type === 'zone' || candidate.clue.type === 'onObject' || candidate.clue.type === 'besideObject') return 1; return 2 }


export function generatePuzzle(template: GenerationTemplate, options: GeneratePuzzleOptions): GeneratedPuzzle {
  validateSeed(options.seed); const maxPlacementAttempts = options.maxPlacementAttempts ?? 10000; const minCluesPerCharacter = options.minCluesPerCharacter ?? 1; const minimizeClues = options.minimizeClues ?? true; validatePositiveInteger(maxPlacementAttempts, 'maxPlacementAttempts'); validateNonNegativeInteger(minCluesPerCharacter, 'minCluesPerCharacter')
  const random = createSeededRandom(options.seed); const placement = generateValidPlacement(template, random, maxPlacementAttempts); const pool = shuffle(buildTrueCluePool(template, placement.solution), random); const stats: GenerationStats = { placementAttempts: placement.attempts, candidateClues: pool.length, selectedClues: 0, removedClues: 0, solverCalls: 0 }
  const selected: CandidateClue[] = []
  for (const character of template.characters) { const available = pool.filter(candidate => candidate.characterId === character.id).sort((a, b) => cluePriority(a) - cluePriority(b)); const chosen: CandidateClue[] = []; for (const candidate of available) { if (canAddReadableClue([...selected, ...chosen], candidate)) chosen.push(candidate); if (chosen.length === minCluesPerCharacter) break } if (chosen.length < minCluesPerCharacter) throw new Error(`Not enough readable candidate clues for ${character.id}.`); selected.push(...chosen) }
  const remaining = pool.filter(candidate => !selected.some(chosen => chosen.clue.id === candidate.clue.id)).sort((a, b) => cluePriority(a) - cluePriority(b))
  const solveSelected = (candidates: readonly CandidateClue[]) => { stats.solverCalls += 1; return solveCase(applyCandidates(template, placement.solution, candidates), { maxSolutions: 2 }) }
  let result = solveSelected(selected)
  let cursor = 0
  while (result.solutionsFound > 1 && cursor < remaining.length) { const candidate = remaining[cursor]; cursor += 1; if (!canAddReadableClue(selected, candidate)) continue; selected.push(candidate); result = solveSelected(selected) }
  if (result.solutionsFound === 0) throw new Error('Generated clues contradict the generated placement.')
  if (result.solutionsFound !== 1) throw new Error('Unable to produce a uniquely solvable puzzle from the candidate clues.')
  if (!placementsEqual(result.solutions[0], placement.solution)) throw new Error('Solver found a unique solution different from the generated placement.')
  if (minimizeClues) for (const candidate of shuffle(selected, random)) {
    if (clueCount(selected, candidate.characterId) <= minCluesPerCharacter) continue
    const trial = selected.filter(chosen => chosen.clue.id !== candidate.clue.id); const trialResult = solveSelected(trial)
    if (trialResult.solutionsFound === 1 && placementsEqual(trialResult.solutions[0], placement.solution)) { const index = selected.findIndex(chosen => chosen.clue.id === candidate.clue.id); selected.splice(index, 1); stats.removedClues += 1 }
  }
  const generated = { ...applyCandidates(template, placement.solution, selected), id: `${template.id}-seed-${options.seed}` }
  const validationErrors = validateCaseDefinition(generated); if (validationErrors.length > 0) throw new Error(`Generated case validation failed: ${validationErrors.join(' ')}`)
  const finalResult = solveSelected(selected); if (finalResult.solutionsFound !== 1 || !placementsEqual(finalResult.solutions[0], generated.solution)) throw new Error('Generated puzzle failed final uniqueness validation.')
  const analysis = analyzeCase(generated); if (analysis.status !== 'unique' || analysis.matchesCanonical !== true) throw new Error('Generated puzzle failed analysis validation.')
  const killer = findKiller(generated, generated.solution); if (!killer) throw new Error('Generated puzzle has no unique killer.')
  stats.selectedClues = selected.length
  return { caseData: generated, seed: options.seed, killerId: killer.id, stats }
}
