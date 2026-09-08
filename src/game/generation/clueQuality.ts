import type { CandidateClue } from './cluePool'
import type { Clue, GameCase } from '../types'

export const isNegativeClue = (clue: Pick<Clue, 'type'>) => clue.type === 'notZone' || clue.type === 'notOnObject' || clue.type === 'notBesideObject'
export const hasRowAndColumn = (clues: readonly Clue[]) => clues.some(clue => clue.type === 'row') && clues.some(clue => clue.type === 'column')
export const canAddReadableClue = (selected: readonly CandidateClue[], candidate: CandidateClue) => !hasRowAndColumn([...selected.filter(item => item.characterId === candidate.characterId).map(item => item.clue), candidate.clue])
export function hasReadableClues(caseData: GameCase) { const clues = caseData.characters.flatMap(character => character.clues); if (clues.length === 0) return false; return caseData.characters.every(character => character.clues.length >= 2 && character.clues.some(clue => !isNegativeClue(clue)) && !hasRowAndColumn(character.clues)) && clues.filter(isNegativeClue).length / clues.length <= .4 }
