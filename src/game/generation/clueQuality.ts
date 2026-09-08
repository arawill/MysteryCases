import type { CandidateClue } from './cluePool'
import type { Clue, GameCase } from '../types'

export const isNegativeClue = (clue: Pick<Clue, 'type'>) => clue.type === 'notZone' || clue.type === 'notOnObject' || clue.type === 'notBesideObject' || clue.type === 'notBesideWall' || clue.type === 'notBesideEdgeFeature' || clue.type === 'withoutTraitInZone'
export const hasRowAndColumn = (clues: readonly Clue[]) => clues.some(clue => clue.type === 'row') && clues.some(clue => clue.type === 'column')
const isTraitPrecisionPair = (first: Clue, second: Clue) =>
  ((first.type === 'withTraitInZone' && second.type === 'companionTraitCount') || (first.type === 'companionTraitCount' && second.type === 'withTraitInZone')) && first.traitId === second.traitId
export const canAddReadableClue = (selected: readonly CandidateClue[], candidate: CandidateClue) => {
  const characterClues = selected.filter(item => item.characterId === candidate.characterId).map(item => item.clue)
  return !hasRowAndColumn([...characterClues, candidate.clue]) && !characterClues.some(clue => isTraitPrecisionPair(clue, candidate.clue))
}
export function hasReadableClues(caseData: GameCase) { const clues = caseData.characters.flatMap(character => character.clues); if (clues.length === 0) return false; return caseData.characters.every(character => character.clues.length >= 2 && character.clues.some(clue => !isNegativeClue(clue)) && !hasRowAndColumn(character.clues)) && clues.filter(isNegativeClue).length / clues.length <= .4 }
