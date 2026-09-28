import { getCell } from './rules'
import type { GlobalClue, GameCase, Placement } from './types'
import type { ClueEvaluation } from './clues'
import { characterHasTrait } from './traits'
import { resolveZoneSurface } from './zones/surfaces'
import type { SolverEvaluationContext } from './solverEvaluationContext'

export type GlobalClueEvaluation = ClueEvaluation
export interface EvaluatedGlobalClue { clue: GlobalClue; evaluation: GlobalClueEvaluation }
const exhaustive = (clue: never): never => { throw new Error(`Unsupported global clue type: ${(clue as { type: string }).type}`) }
const complete = (caseData: GameCase, placements: Placement[]) => placements.length === caseData.characters.length
const cellFor = (caseData: GameCase, placement: Placement, context?: SolverEvaluationContext) => context ? context.cellAt(placement.position) : getCell(caseData.board, placement.position)
const countZone = (caseData: GameCase, placements: Placement[], zoneId: string, context?: SolverEvaluationContext) => placements.filter(item => cellFor(caseData, item, context)?.zoneId === zoneId).length
const countZoneTrait = (caseData: GameCase, placements: Placement[], zoneId: string, traitId: string, context?: SolverEvaluationContext) => placements.filter(item => cellFor(caseData, item, context)?.zoneId === zoneId && (context ? context.characterHasTrait(item.characterId, traitId) : characterHasTrait(caseData.characters.find(character => character.id === item.characterId) ?? { id: '', name: '', avatar: '', clues: [], isVictim: false }, traitId))).length

function evaluateGlobalClueCore(clue: GlobalClue, caseData: GameCase, placements: Placement[], context?: SolverEvaluationContext): GlobalClueEvaluation {
  const isComplete = complete(caseData, placements)
  switch (clue.type) {
    case 'emptyZoneCount': { const current = caseData.zones.filter(zone => countZone(caseData, placements, zone.id, context) === 0).length; if (current < clue.count) return 'violated'; return isComplete ? current === clue.count ? 'satisfied' : 'violated' : 'undetermined' }
    case 'zoneOccupancyCount': { const current = countZone(caseData, placements, clue.zoneId, context); if (current > clue.count) return 'violated'; return isComplete ? current === clue.count ? 'satisfied' : 'violated' : 'undetermined' }
    case 'objectOccupancyCount': { const current = placements.filter(item => cellFor(caseData, item, context)?.object?.id === clue.objectId).length; if (current > clue.count) return 'violated'; return isComplete ? current === clue.count ? 'satisfied' : 'violated' : 'undetermined' }
    case 'zoneTraitCount': { const current = countZoneTrait(caseData, placements, clue.zoneId, clue.traitId, context); if (current > clue.count) return 'violated'; return isComplete ? current === clue.count ? 'satisfied' : 'violated' : 'undetermined' }
    case 'surfaceOccupancyCount': { const current = placements.filter(item => { const zoneId = cellFor(caseData, item, context)?.zoneId; return (context ? context.surfaceByZoneId(zoneId) : resolveZoneSurface(caseData.zones.find(zone => zone.id === zoneId))) === clue.surface }).length; if (current > clue.count) return 'violated'; return isComplete ? current === clue.count ? 'satisfied' : 'violated' : 'undetermined' }
    default: return exhaustive(clue)
  }
}
export const evaluateGlobalClue = (clue: GlobalClue, caseData: GameCase, placements: Placement[]): GlobalClueEvaluation => evaluateGlobalClueCore(clue, caseData, placements)
export const evaluateGlobalClueWithContext = (clue: GlobalClue, caseData: GameCase, placements: Placement[], context: SolverEvaluationContext): GlobalClueEvaluation => evaluateGlobalClueCore(clue, caseData, placements, context)
export const evaluateAllGlobalClues = (caseData: GameCase, placements: Placement[]) => (caseData.globalClues ?? []).map(clue => ({ clue, evaluation: evaluateGlobalClueCore(clue, caseData, placements) }))
export const evaluateAllGlobalCluesWithContext = (caseData: GameCase, placements: Placement[], context: SolverEvaluationContext) => (caseData.globalClues ?? []).map(clue => ({ clue, evaluation: evaluateGlobalClueCore(clue, caseData, placements, context) }))
export function hasViolatedGlobalClue(caseData: GameCase, placements: Placement[]): boolean {
  let violated = false
  // Deliberately eager: unsupported later clues must still be evaluated and throw.
  for (const clue of caseData.globalClues ?? []) if (evaluateGlobalClue(clue, caseData, placements) === 'violated') violated = true
  return violated
}
export function hasViolatedGlobalClueWithContext(caseData: GameCase, placements: Placement[], context: SolverEvaluationContext): boolean {
  let violated = false
  for (const clue of caseData.globalClues ?? []) if (evaluateGlobalClueCore(clue, caseData, placements, context) === 'violated') violated = true
  return violated
}
export function areAllGlobalCluesSatisfied(caseData: GameCase, placements: Placement[]): boolean {
  let satisfied = true
  // Deliberately eager for parity with evaluateAllGlobalClues(...).every(...).
  for (const clue of caseData.globalClues ?? []) if (evaluateGlobalClue(clue, caseData, placements) !== 'satisfied') satisfied = false
  return satisfied
}
export function areAllGlobalCluesSatisfiedWithContext(caseData: GameCase, placements: Placement[], context: SolverEvaluationContext): boolean {
  let satisfied = true
  for (const clue of caseData.globalClues ?? []) if (evaluateGlobalClueCore(clue, caseData, placements, context) !== 'satisfied') satisfied = false
  return satisfied
}
