import type { Clue, GameCase } from '../types'

export interface DirectKillerRevealClue {
  sourceCharacterId: string
  targetCharacterId: string
  clue: Extract<Clue, { type: 'sameZoneAsCharacter' | 'besideCharacter' }>
}

export function isDirectKillerRevealRelation({ sourceCharacterId, clue, victimId }: { sourceCharacterId: string; clue: Clue; victimId: string | undefined }): boolean {
  if (!victimId || (clue.type !== 'sameZoneAsCharacter' && clue.type !== 'besideCharacter')) return false
  return sourceCharacterId !== clue.targetCharacterId && (sourceCharacterId === victimId || clue.targetCharacterId === victimId)
}

export function findDirectKillerRevealClues(caseData: GameCase): DirectKillerRevealClue[] {
  const victimId = caseData.characters.find(character => character.isVictim)?.id
  return caseData.characters.flatMap(character => character.clues.flatMap(clue => {
    if (clue.type !== 'sameZoneAsCharacter' && clue.type !== 'besideCharacter') return []
    if (!isDirectKillerRevealRelation({ sourceCharacterId: character.id, clue, victimId })) return []
    return [{ sourceCharacterId: character.id, targetCharacterId: clue.targetCharacterId, clue }]
  }))
}
