import { getCell, isBeside } from './rules'
import type { Clue, GameCase, Placement } from './types'

export type ClueEvaluation = 'satisfied' | 'violated' | 'undetermined'
export interface EvaluatedClue { characterId: string; clue: Clue; evaluation: ClueEvaluation }
const placementFor = (placements: Placement[], id: string) => placements.find(p => p.characterId === id)
const cellFor = (caseData: GameCase, placements: Placement[], id: string) => { const placement = placementFor(placements, id); return placement ? getCell(caseData.board, placement.position) : undefined }
const objectCells = (caseData: GameCase, objectId: string) => caseData.board.filter(cell => cell.object?.id === objectId)
const besideAnyObject = (caseData: GameCase, subjectCell: NonNullable<ReturnType<typeof cellFor>>, objectId: string) => objectCells(caseData, objectId).some(objectCell => isBeside(subjectCell, objectCell, caseData.board))
const exhaustive = (clue: never): never => { throw new Error(`Unsupported clue type: ${(clue as { type: string }).type}`) }

export function evaluateClue(clue: Clue, subjectCharacterId: string, caseData: GameCase, placements: Placement[]): ClueEvaluation {
  const subjectCell = cellFor(caseData, placements, subjectCharacterId)
  switch (clue.type) {
    case 'row': return !subjectCell ? 'undetermined' : subjectCell.row === clue.row ? 'satisfied' : 'violated'
    case 'column': return !subjectCell ? 'undetermined' : subjectCell.column === clue.column ? 'satisfied' : 'violated'
    case 'zone': return !subjectCell ? 'undetermined' : subjectCell.zoneId === clue.zoneId ? 'satisfied' : 'violated'
    case 'notZone': return !subjectCell ? 'undetermined' : subjectCell.zoneId !== clue.zoneId ? 'satisfied' : 'violated'
    case 'onObject': return !subjectCell ? 'undetermined' : subjectCell.object?.id === clue.objectId ? 'satisfied' : 'violated'
    case 'notOnObject': return !subjectCell ? 'undetermined' : subjectCell.object?.id !== clue.objectId ? 'satisfied' : 'violated'
    case 'besideObject': return !subjectCell ? 'undetermined' : besideAnyObject(caseData, subjectCell, clue.objectId) ? 'satisfied' : 'violated'
    case 'notBesideObject': return !subjectCell ? 'undetermined' : besideAnyObject(caseData, subjectCell, clue.objectId) ? 'violated' : 'satisfied'
    case 'northOfCharacter': { const target = cellFor(caseData, placements, clue.targetCharacterId); return !subjectCell || !target ? 'undetermined' : subjectCell.row < target.row ? 'satisfied' : 'violated' }
    case 'southOfCharacter': { const target = cellFor(caseData, placements, clue.targetCharacterId); return !subjectCell || !target ? 'undetermined' : subjectCell.row > target.row ? 'satisfied' : 'violated' }
    case 'sameZoneAsCharacter': { const target = cellFor(caseData, placements, clue.targetCharacterId); return !subjectCell || !target ? 'undetermined' : subjectCell.zoneId === target.zoneId ? 'satisfied' : 'violated' }
    case 'besideCharacter': { const target = cellFor(caseData, placements, clue.targetCharacterId); return !subjectCell || !target ? 'undetermined' : isBeside(subjectCell, target, caseData.board) ? 'satisfied' : 'violated' }
    default: return exhaustive(clue)
  }
}
export function evaluateCharacterClues(characterId: string, caseData: GameCase, placements: Placement[]): EvaluatedClue[] { const character = caseData.characters.find(candidate => candidate.id === characterId); return character ? character.clues.map(clue => ({ characterId, clue, evaluation: evaluateClue(clue, characterId, caseData, placements) })) : [] }
export function evaluateAllClues(caseData: GameCase, placements: Placement[]): EvaluatedClue[] { return caseData.characters.flatMap(character => evaluateCharacterClues(character.id, caseData, placements)) }
export const hasViolatedClue = (caseData: GameCase, placements: Placement[]) => evaluateAllClues(caseData, placements).some(result => result.evaluation === 'violated')
export const areAllCluesSatisfied = (caseData: GameCase, placements: Placement[]) => evaluateAllClues(caseData, placements).every(result => result.evaluation === 'satisfied')
