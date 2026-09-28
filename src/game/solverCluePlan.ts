import type { Clue, GameCase } from './types'

export type SolverRelationalClue = Extract<Clue, { targetCharacterId: string }>
export type SolverOccupancyClue = Extract<Clue, { type: 'aloneInZone' | 'notAloneInZone' | 'ownZoneOccupancyCount' | 'withTraitInZone' | 'withoutTraitInZone' | 'companionTraitCount' }>

interface PlannedRelation { readonly owner: string; readonly clue: SolverRelationalClue }
interface PlannedOccupancy { readonly characterId: string; readonly clues: readonly SolverOccupancyClue[] }

export interface SolverCluePlan {
  hasViolatedRelation(
    characterId: string,
    isOwnerPlaced: (owner: string) => boolean,
    isViolated: (owner: string, clue: SolverRelationalClue) => boolean,
  ): boolean
  hasViolatedOccupancy(
    isCharacterPlaced: (characterId: string) => boolean,
    isViolated: (characterId: string, clue: SolverOccupancyClue) => boolean,
  ): boolean
}

const isRelational = (clue: Clue): clue is SolverRelationalClue => clue.type === 'northOfCharacter' || clue.type === 'southOfCharacter' || clue.type === 'sameZoneAsCharacter' || clue.type === 'besideCharacter' || clue.type === 'rowOffsetFromCharacter'
const isOccupancy = (clue: Clue): clue is SolverOccupancyClue => clue.type === 'aloneInZone' || clue.type === 'notAloneInZone' || clue.type === 'ownZoneOccupancyCount' || clue.type === 'withTraitInZone' || clue.type === 'withoutTraitInZone' || clue.type === 'companionTraitCount'
const emptyRelations: readonly PlannedRelation[] = Object.freeze([])
const emptyOwnRelations: readonly SolverRelationalClue[] = Object.freeze([])

/** Immutable classifications local to one solver invocation. */
export function createSolverCluePlan(caseData: GameCase): SolverCluePlan {
  // Map.set deliberately preserves the first key position while the last duplicate supplies its clues.
  const cluesByCharacter = new Map<string, Clue[]>()
  for (const character of caseData.characters) cluesByCharacter.set(character.id, character.clues)

  const ownRelations = new Map<string, readonly SolverRelationalClue[]>()
  const incomingRelations = new Map<string, PlannedRelation[]>()
  for (const [owner, clues] of cluesByCharacter) {
    const own = clues.filter(isRelational)
    ownRelations.set(owner, Object.freeze(own))
    for (const clue of own) {
      const incoming = incomingRelations.get(clue.targetCharacterId) ?? []
      incoming.push(Object.freeze({ owner, clue }))
      incomingRelations.set(clue.targetCharacterId, incoming)
    }
  }
  for (const incoming of incomingRelations.values()) Object.freeze(incoming)

  // Occupancy deliberately retains every original character entry, including duplicate IDs.
  const occupancyEntries: readonly PlannedOccupancy[] = Object.freeze(caseData.characters.map(character => Object.freeze({
    characterId: character.id,
    clues: Object.freeze(character.clues.filter(isOccupancy)),
  })))

  const plan: SolverCluePlan = {
    hasViolatedRelation: (characterId, isOwnerPlaced, isViolated) => {
      for (const clue of ownRelations.get(characterId) ?? emptyOwnRelations) if (isViolated(characterId, clue)) return true
      for (const { owner, clue } of incomingRelations.get(characterId) ?? emptyRelations) if (isOwnerPlaced(owner) && isViolated(owner, clue)) return true
      return false
    },
    hasViolatedOccupancy: (isCharacterPlaced, isViolated) => {
      for (const { characterId, clues } of occupancyEntries) {
        if (!isCharacterPlaced(characterId)) continue
        for (const clue of clues) if (isViolated(characterId, clue)) return true
      }
      return false
    },
  }
  return Object.freeze(plan)
}
