import type { CandidateClue } from './cluePool'
import { allowsProceduralClue, clueFamily, getMaxNegativeRatio, getMinimumCluesPerCharacter, isNegativeClue, isPersonRelation, isPositiveAnchor } from './clueSemantics'
import type { Clue, GameCase } from '../types'
import { evaluateClue } from '../clues'
import { evaluateGlobalClue } from '../globalClues'
import { buildTrueCluePool } from './cluePool'
import { createGenerationTemplate } from './template'
import { findDirectKillerRevealClues } from './directKillerReveal'

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
  || ('traitId' in first && 'traitId' in second && first.traitId === second.traitId && ((first.type === 'withTraitInZone' && second.type === 'companionTraitCount') || (second.type === 'withTraitInZone' && first.type === 'companionTraitCount')))
export const canAddReadableClue = (selected: readonly CandidateClue[], candidate: CandidateClue) => !selected.filter(item => item.characterId === candidate.characterId).some(item => areRedundantClues(item.clue, candidate.clue))
export const canAddProceduralClue = (difficulty: GameCase['difficulty'], selected: readonly CandidateClue[], candidate: CandidateClue) => {
  const current = selected.filter(item => item.characterId === candidate.characterId).map(item => item.clue)
  if (!allowsProceduralClue(difficulty, candidate.clue) || !canAddReadableClue(selected, candidate)) return false
  if ((candidate.clue.type === 'oneOfZones' || candidate.clue.type === 'oneOfObjects') && current.some(clue => clue.type === 'oneOfZones' || clue.type === 'oneOfObjects')) return false
  if (candidate.clue.type === 'rowOffsetFromCharacter' && current.some(clue => clue.type === 'rowOffsetFromCharacter')) return false
  if (difficulty === 2 && isNegativeClue(candidate.clue) && current.filter(isNegativeClue).length >= 1) return false
  return true
}
const relationTarget = (clue: Clue) => 'targetCharacterId' in clue ? clue.targetCharacterId : undefined
export function validateHumanClueQuality(caseData: GameCase): string[] {
  const errors: string[] = [], difficulty = caseData.difficulty, all = caseData.characters.flatMap(character => character.clues)
  if (caseData.characters.filter(character => character.isVictim).length !== 1) errors.push('Debe existir exactamente una víctima.')
  if (caseData.characters.some(character => character.isVictim && character.clues.length > 0)) errors.push('La víctima no puede tener pistas lógicas.')
  for (const reveal of findDirectKillerRevealClues(caseData)) errors.push(`${reveal.sourceCharacterId}: pista revela directamente al culpable (${reveal.clue.id}).`)
  for (const character of caseData.characters) {
    const clues = character.clues, negatives = clues.filter(isNegativeClue)
    if (character.isVictim) continue
    if (clues.some(clue => !allowsProceduralClue(difficulty, clue))) errors.push(`${character.id}: pista no permitida.`)
    if (clues.some(clue => clue.type === 'row' || clue.type === 'column')) errors.push(`${character.id}: coordenada procedural no permitida.`)
    if (clues.length < getMinimumCluesPerCharacter(difficulty)) errors.push(`${character.id}: mínimo de pistas.`)
    if (new Set(clues.map(clueFamily)).size < 2) errors.push(`${character.id}: diversidad de familias.`)
    if (negatives.length === clues.length || difficulty === 2 && negatives.length > 1) errors.push(`${character.id}: negativas inválidas.`)
    if (clues.filter(clue => clue.type === 'oneOfZones' || clue.type === 'oneOfObjects').length > 1) errors.push(`${character.id}: oneOf inválido.`)
    if (clues.filter(clue => clue.type === 'rowOffsetFromCharacter').length > 1 || clues.some(clue => clue.type === 'rowOffsetFromCharacter' && clue.rowOffset === 0)) errors.push(`${character.id}: rowOffset inválido.`)
    for (let index = 0; index < clues.length; index += 1) for (let other = 0; other < index; other += 1) if (areRedundantClues(clues[index], clues[other])) errors.push(`${character.id}: redundancia.`)
    for (const clue of clues) if (evaluateClue(clue, character.id, caseData, caseData.solution) !== 'satisfied') errors.push(`${character.id}: pista no verdadera.`)
  }
  if (all.length === 0 || all.filter(isNegativeClue).length / all.length > getMaxNegativeRatio(difficulty)) errors.push('Proporción negativa inválida.')
  if (new Set(all.map(clueFamily)).size < (difficulty <= 2 ? 3 : 4)) errors.push('Diversidad global insuficiente.')
  if (!all.some(isPersonRelation)) errors.push('Falta relación entre personas.')
  for (const clue of caseData.globalClues ?? []) if (evaluateGlobalClue(clue, caseData, caseData.solution) !== 'satisfied') errors.push('Pista global no verdadera.')
  const template = createGenerationTemplate(caseData), objectCandidateExists = buildTrueCluePool(template, caseData.solution).some(candidate => candidate.clue.type === 'onObject' || candidate.clue.type === 'besideObject')
  if (objectCandidateExists && !all.some(clue => clue.type === 'onObject' || clue.type === 'besideObject')) errors.push('Falta una pista positiva de objeto.')
  const activeCharacters = caseData.characters.filter(character => !character.isVictim), links = new Map(activeCharacters.map(character => [character.id, new Set<string>()])), anchors = new Set(activeCharacters.filter(character => character.clues.some(isPositiveAnchor)).map(character => character.id))
  for (const character of activeCharacters) for (const clue of character.clues) { const target = relationTarget(clue); if (target && links.has(target)) { links.get(character.id)?.add(target); links.get(target)?.add(character.id) } }
  for (const character of activeCharacters) { const todo = [character.id], seen = new Set<string>(); let anchored = false; while (todo.length) { const id = todo.pop()!; if (seen.has(id)) continue; seen.add(id); if (anchors.has(id)) { anchored = true; break }; for (const target of links.get(id) ?? []) todo.push(target) }; if (!anchored) { errors.push(`${character.id}: componente sin anchor.`); break } }
  return errors
}
export const hasReadableClues = (caseData: GameCase) => validateHumanClueQuality(caseData).length === 0
