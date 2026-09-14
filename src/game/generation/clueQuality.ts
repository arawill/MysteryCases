import type { CandidateClue } from './cluePool'
import { allowsProceduralClue, clueFamily, getMaxNegativeRatio, getMinimumCluesPerCharacter, isNegativeClue, isPersonRelation, isPositiveAnchor } from './clueSemantics'
import type { Clue, GameCase } from '../types'

export { isNegativeClue }
export const hasRowAndColumn = (clues: readonly Clue[]) => clues.some(clue => clue.type === 'row') && clues.some(clue => clue.type === 'column')
const sameTarget = (first: Clue, second: Clue) => 'targetCharacterId' in first && 'targetCharacterId' in second && first.targetCharacterId === second.targetCharacterId
export const areRedundantClues = (first: Clue, second: Clue) =>
  (first.type === 'zone' && second.type === 'oneOfZones' && second.zoneIds.includes(first.zoneId)) || (second.type === 'zone' && first.type === 'oneOfZones' && first.zoneIds.includes(second.zoneId)) ||
  (first.type === 'onObject' && second.type === 'oneOfObjects' && second.objectIds.includes(first.objectId)) || (second.type === 'onObject' && first.type === 'oneOfObjects' && first.objectIds.includes(second.objectId)) ||
  ((first.type === 'aloneInZone' && second.type === 'ownZoneOccupancyCount' && second.count === 1) || (second.type === 'aloneInZone' && first.type === 'ownZoneOccupancyCount' && first.count === 1)) ||
  ((first.type === 'notAloneInZone' && second.type === 'ownZoneOccupancyCount' && second.count > 1) || (second.type === 'notAloneInZone' && first.type === 'ownZoneOccupancyCount' && first.count > 1)) ||
  (sameTarget(first, second) && ((first.type === 'northOfCharacter' || first.type === 'southOfCharacter') && second.type === 'rowOffsetFromCharacter' || (second.type === 'northOfCharacter' || second.type === 'southOfCharacter') && first.type === 'rowOffsetFromCharacter' || (first.type === 'besideCharacter' && second.type === 'sameZoneAsCharacter') || (second.type === 'besideCharacter' && first.type === 'sameZoneAsCharacter'))) ||
  (first.type === 'zone' && second.type === 'notZone') || (second.type === 'zone' && first.type === 'notZone') ||
  ((first.type === 'oneOfZones' || first.type === 'oneOfObjects') && (second.type === 'oneOfZones' || second.type === 'oneOfObjects')) || (first.type === 'rowOffsetFromCharacter' && second.type === 'rowOffsetFromCharacter')
export const canAddReadableClue = (selected: readonly CandidateClue[], candidate: CandidateClue) => !selected.filter(item => item.characterId === candidate.characterId).some(item => areRedundantClues(item.clue, candidate.clue))
const relationTarget = (clue: Clue) => 'targetCharacterId' in clue ? clue.targetCharacterId : undefined
export function validateHumanClueQuality(caseData: GameCase): string[] {
  const errors: string[] = [], difficulty = caseData.difficulty, all = caseData.characters.flatMap(character => character.clues)
  for (const character of caseData.characters) {
    const clues = character.clues, negatives = clues.filter(isNegativeClue)
    if (clues.some(clue => !allowsProceduralClue(difficulty, clue))) errors.push(`${character.id}: pista no permitida.`)
    if (clues.length < getMinimumCluesPerCharacter(difficulty)) errors.push(`${character.id}: mínimo de pistas.`)
    if (new Set(clues.map(clueFamily)).size < 2) errors.push(`${character.id}: diversidad de familias.`)
    if (negatives.length === clues.length || difficulty === 2 && negatives.length > 1) errors.push(`${character.id}: negativas inválidas.`)
    if (clues.filter(clue => clue.type === 'oneOfZones' || clue.type === 'oneOfObjects').length > 1) errors.push(`${character.id}: oneOf inválido.`)
    if (clues.filter(clue => clue.type === 'rowOffsetFromCharacter').length > 1 || clues.some(clue => clue.type === 'rowOffsetFromCharacter' && clue.rowOffset === 0)) errors.push(`${character.id}: rowOffset inválido.`)
    for (let index = 0; index < clues.length; index += 1) for (let other = 0; other < index; other += 1) if (areRedundantClues(clues[index], clues[other])) errors.push(`${character.id}: redundancia.`)
  }
  if (all.length === 0 || all.filter(isNegativeClue).length / all.length > getMaxNegativeRatio(difficulty)) errors.push('Proporción negativa inválida.')
  if (new Set(all.map(clueFamily)).size < (difficulty <= 2 ? 3 : 4)) errors.push('Diversidad global insuficiente.')
  if (!all.some(isPersonRelation)) errors.push('Falta relación entre personas.')
  const links = new Map(caseData.characters.map(character => [character.id, new Set<string>()])), anchors = new Set(caseData.characters.filter(character => character.clues.some(isPositiveAnchor)).map(character => character.id))
  for (const character of caseData.characters) for (const clue of character.clues) { const target = relationTarget(clue); if (target) { links.get(character.id)?.add(target); links.get(target)?.add(character.id) } }
  for (const character of caseData.characters) { const todo = [character.id], seen = new Set<string>(); let anchored = false; while (todo.length) { const id = todo.pop()!; if (seen.has(id)) continue; seen.add(id); if (anchors.has(id)) { anchored = true; break }; for (const target of links.get(id) ?? []) todo.push(target) }; if (!anchored) { errors.push(`${character.id}: componente sin anchor.`); break } }
  return errors
}
export const hasReadableClues = (caseData: GameCase) => validateHumanClueQuality(caseData).length === 0
