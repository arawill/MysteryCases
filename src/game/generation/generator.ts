import { analyzeCase } from '../analysis'
import { findKiller, getCell, placementsEqual } from '../rules'
import { solveCase } from '../solver'
import { validateCaseDefinition } from '../validation'
import type { Placement } from '../types'
import { applyCandidates, buildTrueCluePool, type CandidateClue } from './cluePool'
import { createSeededRandom, shuffle } from './random'
import type { GeneratedPuzzle, GenerationStats, GenerationTemplate, GeneratePuzzleOptions } from './types'

const UINT32_MAX = 4294967295
const validateSeed = (seed: number) => { if (!Number.isInteger(seed) || seed < 0 || seed > UINT32_MAX) throw new Error('seed must be a uint32 integer.') }
const validatePositiveInteger = (value: number, name: string) => { if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer.`) }
const validateNonNegativeInteger = (value: number, name: string) => { if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer.`) }
const clueCount = (candidates: readonly CandidateClue[], characterId: string) => candidates.filter(candidate => candidate.characterId === characterId).length

function generatePlacement(template: GenerationTemplate, random: ReturnType<typeof createSeededRandom>, maxNodes: number): { solution: Placement[]; attempts: number } {
  if (template.characters.length !== template.rows || template.characters.length !== template.columns) throw new Error('Template characters must match rows and columns.')
  if (template.characters.filter(character => character.isVictim).length !== 1) throw new Error('Template must contain exactly one victim.')
  const cells = template.board.filter(cell => cell.occupiable); let attempts = 0; const searchOrder = shuffle(template.characters, random); const placements: Placement[] = []
  const search = (index: number): boolean => {
    if (index === searchOrder.length) { const provisional = toOrderedPlacements(template, placements); const provisionalCase = applyCandidates(template, provisional, []); return findKiller(provisionalCase, provisional) !== null }
    const character = searchOrder[index]; const usedRows = new Set(placements.map(placement => placement.position.row)); const usedColumns = new Set(placements.map(placement => placement.position.column))
    for (const cell of shuffle(cells, random)) {
      if (attempts >= maxNodes) return false
      if (usedRows.has(cell.row) || usedColumns.has(cell.column)) continue
      attempts += 1; placements.push({ characterId: character.id, position: { row: cell.row, column: cell.column } })
      const victim = template.characters.find(candidate => candidate.isVictim); const victimPlacement = placements.find(candidate => candidate.characterId === victim?.id)
      const victimCell = victimPlacement ? getCell(template.board, victimPlacement.position) : undefined
      const inVictimZone = victimCell ? placements.filter(candidate => getCell(template.board, candidate.position)?.zoneId === victimCell.zoneId).length : 0
      if (inVictimZone <= 2 && search(index + 1)) return true
      placements.pop()
    }
    return false
  }
  if (!search(0)) throw new Error('Unable to generate a valid placement with a unique killer.')
  return { solution: toOrderedPlacements(template, placements), attempts }
}
function toOrderedPlacements(template: GenerationTemplate, placements: Placement[]): Placement[] { return template.characters.map(character => { const placement = placements.find(candidate => candidate.characterId === character.id); if (!placement) throw new Error(`Missing placement for ${character.id}.`); return { characterId: placement.characterId, position: { ...placement.position } } }) }

export function generatePuzzle(template: GenerationTemplate, options: GeneratePuzzleOptions): GeneratedPuzzle {
  validateSeed(options.seed); const maxPlacementAttempts = options.maxPlacementAttempts ?? 10000; const minCluesPerCharacter = options.minCluesPerCharacter ?? 1; validatePositiveInteger(maxPlacementAttempts, 'maxPlacementAttempts'); validateNonNegativeInteger(minCluesPerCharacter, 'minCluesPerCharacter')
  const random = createSeededRandom(options.seed); const placement = generatePlacement(template, random, maxPlacementAttempts); const pool = shuffle(buildTrueCluePool(template, placement.solution), random); const stats: GenerationStats = { placementAttempts: placement.attempts, candidateClues: pool.length, selectedClues: 0, removedClues: 0, solverCalls: 0 }
  const selected: CandidateClue[] = []
  for (const character of template.characters) { const available = pool.filter(candidate => candidate.characterId === character.id); if (available.length < minCluesPerCharacter) throw new Error(`Not enough candidate clues for ${character.id}.`); selected.push(...available.slice(0, minCluesPerCharacter)) }
  const remaining = pool.filter(candidate => !selected.some(chosen => chosen.clue.id === candidate.clue.id))
  const solveSelected = (candidates: readonly CandidateClue[]) => { stats.solverCalls += 1; return solveCase(applyCandidates(template, placement.solution, candidates), { maxSolutions: 2 }) }
  let result = solveSelected(selected)
  let cursor = 0
  while (result.solutionsFound > 1 && cursor < remaining.length) { selected.push(remaining[cursor]); cursor += 1; result = solveSelected(selected) }
  if (result.solutionsFound === 0) throw new Error('Generated clues contradict the generated placement.')
  if (result.solutionsFound !== 1) throw new Error('Unable to produce a uniquely solvable puzzle from the candidate clues.')
  if (!placementsEqual(result.solutions[0], placement.solution)) throw new Error('Solver found a unique solution different from the generated placement.')
  for (const candidate of shuffle(selected, random)) {
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
