import { analyzeCase } from '../analysis'
import { findKiller, placementsEqual } from '../rules'
import { solveCase } from '../solver'
import { validateCaseDefinition } from '../validation'
import { applyConstraints, buildTrueCluePool, buildTrueGlobalCluePool, evaluateCandidateConstraint, type CandidateCharacterClue, type CandidateConstraint } from './cluePool'
import { createSeededRandom, shuffle } from './random'
import { generateValidPlacement } from './placement'
import { canAddProceduralClue, canAddReadableClue, isNegativeClue } from './clueQuality'
import { isDirectKillerRevealRelation } from './directKillerReveal'
import { clueFamily, getInitialTargetCluesPerCharacter, getMinimumCluesPerCharacter, isPersonRelation, isPositiveAnchor } from './clueSemantics'
import { allowsClue, difficultyRequirements, isClassicProceduralGlobal, isEdgeAdvanced, isLogicAdvanced, isSpatialAdvanced, isTraitAdvanced, isTraitGlobal } from './clueDifficulty'
import type { GeneratedPuzzle, GenerationStats, GenerationTemplate, GeneratePuzzleOptions } from './types'

const UINT32_MAX = 4294967295
const validateSeed = (seed: number) => { if (!Number.isInteger(seed) || seed < 0 || seed > UINT32_MAX) throw new Error('seed must be a uint32 integer.') }
const validatePositiveInteger = (value: number, name: string) => { if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer.`) }
const validateNonNegativeInteger = (value: number, name: string) => { if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer.`) }
const clueCount = (candidates: readonly CandidateConstraint[], characterId: string) => candidates.filter((candidate): candidate is CandidateCharacterClue => candidate.kind === 'character').filter(candidate => candidate.characterId === characterId).length
export const cluePriority = (candidate: CandidateCharacterClue) => { if (isNegativeClue(candidate.clue)) return 4; if (candidate.clue.type === 'oneOfZones' || candidate.clue.type === 'oneOfObjects' || candidate.clue.type === 'rowOffsetFromCharacter') return 3; if (isPositiveAnchor(candidate.clue)) return 0; if (isPersonRelation(candidate.clue)) return 1; return 2 }


export function generatePuzzle(template: GenerationTemplate, options: GeneratePuzzleOptions): GeneratedPuzzle {
  validateSeed(options.seed); const maxPlacementAttempts = options.maxPlacementAttempts ?? 10000; const minCluesPerCharacter = options.minCluesPerCharacter ?? (options.procedural ? getMinimumCluesPerCharacter(template.difficulty) : 1); const minimizeClues = options.minimizeClues ?? true; validatePositiveInteger(maxPlacementAttempts, 'maxPlacementAttempts'); validateNonNegativeInteger(minCluesPerCharacter, 'minCluesPerCharacter')
  const random = createSeededRandom(options.seed); const placement = generateValidPlacement(template, random, maxPlacementAttempts); const shuffledPool = shuffle(buildTrueCluePool(template, placement.solution).filter(candidate => !options.procedural || allowsClue(template.difficulty, candidate.clue)), random); const victimId = template.characters.find(character => character.isVictim)?.id; const pool = shuffledPool.filter(candidate => !isDirectKillerRevealRelation({ sourceCharacterId: candidate.characterId, clue: candidate.clue, victimId })); const globalPool = shuffle(buildTrueGlobalCluePool(template, placement.solution), random); const stats: GenerationStats = { placementAttempts: placement.attempts, candidateClues: pool.length + globalPool.length, selectedClues: 0, removedClues: 0, solverCalls: 0 }
  const selected: CandidateConstraint[] = [], requirements = difficultyRequirements(template.difficulty)
  const initialTarget = Math.max(minCluesPerCharacter, options.procedural ? getInitialTargetCluesPerCharacter(template.difficulty) + 1 : minCluesPerCharacter)
  for (const character of template.characters) { if (character.isVictim) continue; const available = pool.filter(candidate => candidate.characterId === character.id).sort((a, b) => cluePriority(a) - cluePriority(b)); const chosen: CandidateCharacterClue[] = []; const take = (predicate: (candidate: CandidateCharacterClue) => boolean) => { const candidate = available.find(item => !chosen.some(selected => selected.clue.id === item.clue.id) && predicate(item) && (!options.procedural ? canAddReadableClue([...selected.filter((item): item is CandidateCharacterClue => item.kind === 'character'), ...chosen], item) : canAddProceduralClue(template.difficulty, [...selected.filter((item): item is CandidateCharacterClue => item.kind === 'character'), ...chosen], item))); if (candidate) chosen.push(candidate) }; take(candidate => isPositiveAnchor(candidate.clue)); take(candidate => isPersonRelation(candidate.clue) && !('targetCharacterId' in candidate.clue && candidate.clue.targetCharacterId === victimId)); take(candidate => chosen.length > 0 && clueFamily(candidate.clue) !== clueFamily(chosen[0].clue) && !isPersonRelation(candidate.clue)); while (chosen.length < initialTarget) take(() => true); if (chosen.length < minCluesPerCharacter) throw new Error(`Not enough readable candidate clues for ${character.id}.`); selected.push(...chosen) }
  const selectRequired = (predicate: (candidate: CandidateCharacterClue) => boolean, count: number) => { for (const candidate of pool.filter(predicate).sort((a, b) => cluePriority(a) - cluePriority(b))) { if (selected.some(item => item.kind === 'character' && item.clue.id === candidate.clue.id) || !canAddReadableClue(selected.filter((item): item is CandidateCharacterClue => item.kind === 'character'), candidate)) continue; selected.push(candidate); if (selected.filter(item => item.kind === 'character' && predicate(item)).length >= count) return } if (count > 0) throw new Error('Not enough advanced candidate clues.') }
  selectRequired(candidate => isSpatialAdvanced(candidate.clue), requirements.spatial)
  selectRequired(candidate => isLogicAdvanced(candidate.clue), requirements.logic)
  selectRequired(candidate => isEdgeAdvanced(candidate.clue), requirements.edge)
  selectRequired(candidate => isTraitAdvanced(candidate.clue), requirements.trait)
  selectRequired(candidate => isPersonRelation(candidate.clue) && candidate.characterId !== victimId && !('targetCharacterId' in candidate.clue && candidate.clue.targetCharacterId === victimId), 1)
  const selectRequiredGlobals = (predicate: (candidate: CandidateConstraint) => boolean, count: number) => {
    if (count === 0) return
    const available = globalPool.filter(predicate).sort((a, b) => (a.clue.type === 'zoneTraitCount' && a.clue.count === 0 ? 1 : 0) - (b.clue.type === 'zoneTraitCount' && b.clue.count === 0 ? 1 : 0))
    for (const candidate of available) {
      if (selected.some(item => item.clue.id === candidate.clue.id)) continue
      selected.push(candidate)
      if (selected.filter(predicate).length >= count) return
    }
    if (count > 0) throw new Error('Not enough required global candidate clues.')
  }
  selectRequiredGlobals(candidate => candidate.kind === 'global' && isClassicProceduralGlobal(candidate.clue), requirements.classicGlobals)
  selectRequiredGlobals(candidate => candidate.kind === 'global' && isTraitGlobal(candidate.clue), requirements.traitGlobals)
  const remaining: CandidateConstraint[] = [...pool, ...globalPool].filter(candidate => !selected.some(chosen => chosen.clue.id === candidate.clue.id)).sort((a, b) => a.kind === 'global' ? 2 : b.kind === 'global' ? -2 : cluePriority(a) - cluePriority(b))
  const solveSelected = (candidates: readonly CandidateConstraint[]) => { stats.solverCalls += 1; return solveCase(applyConstraints(template, placement.solution, candidates), { maxSolutions: 2 }) }
  let result = solveSelected(selected)
  while (result.solutionsFound > 1) {
    const current = applyConstraints(template, placement.solution, selected)
    const ranked = remaining.filter(candidate => !selected.some(chosen => chosen.clue.id === candidate.clue.id) && (candidate.kind === 'global' ? selected.filter(item => item.kind === 'global').length < requirements.maxGlobals : !options.procedural || canAddProceduralClue(template.difficulty, selected.filter((item): item is CandidateCharacterClue => item.kind === 'character'), candidate))).map((candidate, index) => ({ candidate, index, eliminated: result.solutions.filter(solution => evaluateCandidateConstraint(candidate, current, solution) === 'violated').length, familyBonus: candidate.kind === 'character' && !selected.some(item => item.kind === 'character' && item.characterId === candidate.characterId && clueFamily(item.clue) === clueFamily(candidate.clue)) ? 1 : 0 })).filter(item => item.eliminated > 0).sort((a, b) => b.eliminated - a.eliminated || b.familyBonus - a.familyBonus || a.index - b.index)
    const next = ranked[0]?.candidate
    if (!next) throw new Error('No readable clue eliminates the current counterexamples.')
    selected.push(next); result = solveSelected(selected)
  }
  if (result.solutionsFound === 0) throw new Error('Generated clues contradict the generated placement.')
  if (result.solutionsFound !== 1) throw new Error('Unable to produce a uniquely solvable puzzle from the candidate clues.')
  if (!placementsEqual(result.solutions[0], placement.solution)) throw new Error('Solver found a unique solution different from the generated placement.')
  if (minimizeClues) {
    let removedInPass = true
    while (removedInPass) {
      removedInPass = false
      for (const candidate of shuffle([...selected], random)) {
        if (candidate.kind === 'global' || clueCount(selected, candidate.characterId) <= minCluesPerCharacter) continue
        const trial = selected.filter(chosen => chosen.clue.id !== candidate.clue.id); const trialResult = solveSelected(trial)
        if (trialResult.solutionsFound === 1 && placementsEqual(trialResult.solutions[0], placement.solution)) { const index = selected.findIndex(chosen => chosen.clue.id === candidate.clue.id); selected.splice(index, 1); stats.removedClues += 1; removedInPass = true }
      }
    }
  }
  const generated = { ...applyConstraints(template, placement.solution, selected), id: `${template.id}-seed-${options.seed}` }
  const validationErrors = validateCaseDefinition(generated); if (validationErrors.length > 0) throw new Error(`Generated case validation failed: ${validationErrors.join(' ')}`)
  // With no minimisation, `result` was obtained from exactly this selected set.
  // Reuse it rather than asking the solver the same question a second time.
  const finalResult = !minimizeClues && result.solutionsFound === 1 ? result : solveSelected(selected); if (finalResult.solutionsFound !== 1 || !placementsEqual(finalResult.solutions[0], generated.solution)) throw new Error('Generated puzzle failed final uniqueness validation.')
  const analysis = analyzeCase(generated); if (analysis.status !== 'unique' || analysis.matchesCanonical !== true) throw new Error('Generated puzzle failed analysis validation.')
  const killer = findKiller(generated, generated.solution); if (!killer) throw new Error('Generated puzzle has no unique killer.')
  stats.selectedClues = selected.length
  return { caseData: generated, seed: options.seed, killerId: killer.id, stats }
}
