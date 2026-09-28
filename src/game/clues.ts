import { getCell, isBeside } from './rules'
import { isBesideWall, isBoardCorner, isZoneCorner } from './spatial'
import { isCellBesideEdgeFeature } from './edgeFeatures'
import { characterHasTrait } from './traits'
import { resolveZoneSurface } from './zones/surfaces'
import type { Clue, GameCase, Placement } from './types'
import type { SolverEvaluationContext } from './solverEvaluationContext'

export type ClueEvaluation = 'satisfied' | 'violated' | 'undetermined'
export interface EvaluatedClue { characterId: string; clue: Clue; evaluation: ClueEvaluation }
const placementFor = (placements: Placement[], id: string) => placements.find(p => p.characterId === id)
const cellAt = (caseData: GameCase, placement: Placement, context?: SolverEvaluationContext) => context ? context.cellAt(placement.position) : getCell(caseData.board, placement.position)
const cellFor = (caseData: GameCase, placements: Placement[], id: string, context?: SolverEvaluationContext) => { const placement = placementFor(placements, id); return placement ? cellAt(caseData, placement, context) : undefined }
const objectCells = (caseData: GameCase, objectId: string, context?: SolverEvaluationContext) => context ? context.cellsByObjectId(objectId) : caseData.board.filter(cell => cell.object?.id === objectId)
const besideAnyObject = (caseData: GameCase, subjectCell: NonNullable<ReturnType<typeof cellFor>>, objectId: string, context?: SolverEvaluationContext) => objectCells(caseData, objectId, context).some(objectCell => isBeside(subjectCell, objectCell, caseData.board, context?.cellAt))
const relatedObject = (caseData: GameCase, subjectCell: NonNullable<ReturnType<typeof cellFor>>, objectId: string, relation: 'same' | 'different' | 'any', predicate: (cell: typeof subjectCell) => boolean, context?: SolverEvaluationContext) => objectCells(caseData, objectId, context).some(objectCell => predicate(objectCell) && (relation === 'any' || (relation === 'same') === (subjectCell.zoneId === objectCell.zoneId)))
const zoneOccupancy = (caseData: GameCase, placements: Placement[], zoneId: string, context?: SolverEvaluationContext) => placements.filter(placement => cellAt(caseData, placement, context)?.zoneId === zoneId).length
const complete = (caseData: GameCase, placements: Placement[]) => placements.length === caseData.characters.length
const companionsWithTrait = (caseData: GameCase, placements: Placement[], subjectId: string, zoneId: string, traitId: string, context?: SolverEvaluationContext) => placements.filter(placement => placement.characterId !== subjectId && cellAt(caseData, placement, context)?.zoneId === zoneId && (context ? context.characterHasTrait(placement.characterId, traitId) : characterHasTrait(caseData.characters.find(character => character.id === placement.characterId) ?? { id: '', name: '', avatar: '', clues: [], isVictim: false }, traitId))).length
const exhaustive = (clue: never): never => { throw new Error(`Unsupported clue type: ${(clue as { type: string }).type}`) }

function evaluateClueCore(clue: Clue, subjectCharacterId: string, caseData: GameCase, placements: Placement[], context?: SolverEvaluationContext): ClueEvaluation {
  const subjectCell = cellFor(caseData, placements, subjectCharacterId, context)
  switch (clue.type) {
    case 'row': return !subjectCell ? 'undetermined' : subjectCell.row === clue.row ? 'satisfied' : 'violated'
    case 'column': return !subjectCell ? 'undetermined' : subjectCell.column === clue.column ? 'satisfied' : 'violated'
    case 'zone': return !subjectCell ? 'undetermined' : subjectCell.zoneId === clue.zoneId ? 'satisfied' : 'violated'
    case 'notZone': return !subjectCell ? 'undetermined' : subjectCell.zoneId !== clue.zoneId ? 'satisfied' : 'violated'
    case 'onObject': return !subjectCell ? 'undetermined' : subjectCell.object?.id === clue.objectId ? 'satisfied' : 'violated'
    case 'notOnObject': return !subjectCell ? 'undetermined' : subjectCell.object?.id !== clue.objectId ? 'satisfied' : 'violated'
    case 'besideObject': return !subjectCell ? 'undetermined' : besideAnyObject(caseData, subjectCell, clue.objectId, context) ? 'satisfied' : 'violated'
    case 'notBesideObject': return !subjectCell ? 'undetermined' : besideAnyObject(caseData, subjectCell, clue.objectId, context) ? 'violated' : 'satisfied'
    case 'sameColumnAsObject': return !subjectCell ? 'undetermined' : relatedObject(caseData, subjectCell, clue.objectId, clue.zoneRelation, cell => cell.column === subjectCell.column, context) ? 'satisfied' : 'violated'
    case 'relativeToObject': return !subjectCell ? 'undetermined' : relatedObject(caseData, subjectCell, clue.objectId, clue.zoneRelation, cell => clue.direction === 'northEast' ? subjectCell.row < cell.row && subjectCell.column > cell.column : clue.direction === 'northWest' ? subjectCell.row < cell.row && subjectCell.column < cell.column : clue.direction === 'southEast' ? subjectCell.row > cell.row && subjectCell.column > cell.column : subjectCell.row > cell.row && subjectCell.column < cell.column, context) ? 'satisfied' : 'violated'
    case 'onSurface': return !subjectCell ? 'undetermined' : (context ? context.surfaceByZoneId(subjectCell.zoneId) : resolveZoneSurface(caseData.zones.find(zone => zone.id === subjectCell.zoneId))) === clue.surface ? 'satisfied' : 'violated'
    case 'cornerOfBoard': return !subjectCell ? 'undetermined' : isBoardCorner(subjectCell, caseData.rows, caseData.columns) ? 'satisfied' : 'violated'
    case 'cornerOfZone': return !subjectCell ? 'undetermined' : isZoneCorner(subjectCell, caseData.board, context?.cellAt) ? 'satisfied' : 'violated'
    case 'besideWall': return !subjectCell ? 'undetermined' : isBesideWall(subjectCell, caseData.board, context?.cellAt) ? 'satisfied' : 'violated'
    case 'notBesideWall': return !subjectCell ? 'undetermined' : isBesideWall(subjectCell, caseData.board, context?.cellAt) ? 'violated' : 'satisfied'
    case 'besideEdgeFeature': return !subjectCell ? 'undetermined' : (caseData.edgeFeatures ?? []).some(feature => feature.type === clue.featureType && isCellBesideEdgeFeature(subjectCell, feature, caseData.board, context?.cellAt)) ? 'satisfied' : 'violated'
    case 'notBesideEdgeFeature': return !subjectCell ? 'undetermined' : (caseData.edgeFeatures ?? []).some(feature => feature.type === clue.featureType && isCellBesideEdgeFeature(subjectCell, feature, caseData.board, context?.cellAt)) ? 'violated' : 'satisfied'
    case 'withTraitInZone': { if (!subjectCell) return 'undetermined'; return companionsWithTrait(caseData, placements, subjectCharacterId, subjectCell.zoneId, clue.traitId, context) > 0 ? 'satisfied' : complete(caseData, placements) ? 'violated' : 'undetermined' }
    case 'withoutTraitInZone': { if (!subjectCell) return 'undetermined'; return companionsWithTrait(caseData, placements, subjectCharacterId, subjectCell.zoneId, clue.traitId, context) > 0 ? 'violated' : complete(caseData, placements) ? 'satisfied' : 'undetermined' }
    case 'companionTraitCount': { if (!subjectCell) return 'undetermined'; const current = companionsWithTrait(caseData, placements, subjectCharacterId, subjectCell.zoneId, clue.traitId, context); if (current > clue.count) return 'violated'; return complete(caseData, placements) ? current === clue.count ? 'satisfied' : 'violated' : 'undetermined' }
    case 'oneOfZones': return !subjectCell ? 'undetermined' : clue.zoneIds.includes(subjectCell.zoneId) ? 'satisfied' : 'violated'
    case 'oneOfObjects': return !subjectCell ? 'undetermined' : subjectCell.object && clue.objectIds.includes(subjectCell.object.id) ? 'satisfied' : 'violated'
    case 'aloneInZone': { if (!subjectCell) return 'undetermined'; const current = zoneOccupancy(caseData, placements, subjectCell.zoneId, context); if (current > 1) return 'violated'; return complete(caseData, placements) ? 'satisfied' : 'undetermined' }
    case 'notAloneInZone': { if (!subjectCell) return 'undetermined'; const current = zoneOccupancy(caseData, placements, subjectCell.zoneId, context); if (current > 1) return 'satisfied'; return complete(caseData, placements) ? 'violated' : 'undetermined' }
    case 'ownZoneOccupancyCount': { if (!subjectCell) return 'undetermined'; const current = zoneOccupancy(caseData, placements, subjectCell.zoneId, context); if (current > clue.count) return 'violated'; return complete(caseData, placements) ? current === clue.count ? 'satisfied' : 'violated' : 'undetermined' }
    case 'northOfCharacter': { const target = cellFor(caseData, placements, clue.targetCharacterId, context); return !subjectCell || !target ? 'undetermined' : subjectCell.row < target.row ? 'satisfied' : 'violated' }
    case 'southOfCharacter': { const target = cellFor(caseData, placements, clue.targetCharacterId, context); return !subjectCell || !target ? 'undetermined' : subjectCell.row > target.row ? 'satisfied' : 'violated' }
    case 'sameZoneAsCharacter': { const target = cellFor(caseData, placements, clue.targetCharacterId, context); return !subjectCell || !target ? 'undetermined' : subjectCell.zoneId === target.zoneId ? 'satisfied' : 'violated' }
    case 'besideCharacter': { const target = cellFor(caseData, placements, clue.targetCharacterId, context); return !subjectCell || !target ? 'undetermined' : isBeside(subjectCell, target, caseData.board, context?.cellAt) ? 'satisfied' : 'violated' }
    case 'rowOffsetFromCharacter': { const target = cellFor(caseData, placements, clue.targetCharacterId, context); return !subjectCell || !target ? 'undetermined' : subjectCell.row === target.row + clue.rowOffset ? 'satisfied' : 'violated' }
    default: return exhaustive(clue)
  }
}
export const evaluateClue = (clue: Clue, subjectCharacterId: string, caseData: GameCase, placements: Placement[]): ClueEvaluation => evaluateClueCore(clue, subjectCharacterId, caseData, placements)
export const evaluateClueWithContext = (clue: Clue, subjectCharacterId: string, caseData: GameCase, placements: Placement[], context: SolverEvaluationContext): ClueEvaluation => evaluateClueCore(clue, subjectCharacterId, caseData, placements, context)
const evaluateCharacterCluesCore = (characterId: string, caseData: GameCase, placements: Placement[], context?: SolverEvaluationContext): EvaluatedClue[] => { const character = context ? context.characterById(characterId) : caseData.characters.find(candidate => candidate.id === characterId); return character ? character.clues.map(clue => ({ characterId, clue, evaluation: evaluateClueCore(clue, characterId, caseData, placements, context) })) : [] }
export function evaluateCharacterClues(characterId: string, caseData: GameCase, placements: Placement[]): EvaluatedClue[] { return evaluateCharacterCluesCore(characterId, caseData, placements) }
export function evaluateAllClues(caseData: GameCase, placements: Placement[]): EvaluatedClue[] { return caseData.characters.flatMap(character => evaluateCharacterCluesCore(character.id, caseData, placements)) }
export function evaluateAllCluesWithContext(caseData: GameCase, placements: Placement[], context: SolverEvaluationContext): EvaluatedClue[] { return caseData.characters.flatMap(character => evaluateCharacterCluesCore(character.id, caseData, placements, context)) }
export const areAllCluesSatisfied = (caseData: GameCase, placements: Placement[]) => evaluateAllClues(caseData, placements).every(result => result.evaluation === 'satisfied')
export const areAllCluesSatisfiedWithContext = (caseData: GameCase, placements: Placement[], context: SolverEvaluationContext) => evaluateAllCluesWithContext(caseData, placements, context).every(result => result.evaluation === 'satisfied')
