import { getCell } from './rules'
import type { GlobalClue, GameCase, Placement } from './types'
import type { ClueEvaluation } from './clues'
import { characterHasTrait } from './traits'

export type GlobalClueEvaluation = ClueEvaluation
export interface EvaluatedGlobalClue { clue: GlobalClue; evaluation: GlobalClueEvaluation }
const exhaustive = (clue: never): never => { throw new Error(`Unsupported global clue type: ${(clue as { type: string }).type}`) }
const complete = (caseData: GameCase, placements: Placement[]) => placements.length === caseData.characters.length
const countZone = (caseData: GameCase, placements: Placement[], zoneId: string) => placements.filter(item => getCell(caseData.board, item.position)?.zoneId === zoneId).length
const countZoneTrait = (caseData: GameCase, placements: Placement[], zoneId: string, traitId: string) => placements.filter(item => getCell(caseData.board, item.position)?.zoneId === zoneId && characterHasTrait(caseData.characters.find(character => character.id === item.characterId) ?? { id: '', name: '', avatar: '', clues: [], isVictim: false }, traitId)).length

export function evaluateGlobalClue(clue: GlobalClue, caseData: GameCase, placements: Placement[]): GlobalClueEvaluation {
  const isComplete = complete(caseData, placements)
  switch (clue.type) {
    case 'emptyZoneCount': { const current = caseData.zones.filter(zone => countZone(caseData, placements, zone.id) === 0).length; if (current < clue.count) return 'violated'; return isComplete ? current === clue.count ? 'satisfied' : 'violated' : 'undetermined' }
    case 'zoneOccupancyCount': { const current = countZone(caseData, placements, clue.zoneId); if (current > clue.count) return 'violated'; return isComplete ? current === clue.count ? 'satisfied' : 'violated' : 'undetermined' }
    case 'objectOccupancyCount': { const current = placements.filter(item => getCell(caseData.board, item.position)?.object?.id === clue.objectId).length; if (current > clue.count) return 'violated'; return isComplete ? current === clue.count ? 'satisfied' : 'violated' : 'undetermined' }
    case 'zoneTraitCount': { const current = countZoneTrait(caseData, placements, clue.zoneId, clue.traitId); if (current > clue.count) return 'violated'; return isComplete ? current === clue.count ? 'satisfied' : 'violated' : 'undetermined' }
    default: return exhaustive(clue)
  }
}
export const evaluateAllGlobalClues = (caseData: GameCase, placements: Placement[]) => (caseData.globalClues ?? []).map(clue => ({ clue, evaluation: evaluateGlobalClue(clue, caseData, placements) }))
export const hasViolatedGlobalClue = (caseData: GameCase, placements: Placement[]) => evaluateAllGlobalClues(caseData, placements).some(item => item.evaluation === 'violated')
export const areAllGlobalCluesSatisfied = (caseData: GameCase, placements: Placement[]) => evaluateAllGlobalClues(caseData, placements).every(item => item.evaluation === 'satisfied')
