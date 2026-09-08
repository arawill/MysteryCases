import type { Clue, DifficultyRating, GlobalClue } from '../types'

export const spatialAdvancedTypes = new Set<Clue['type']>(['cornerOfBoard', 'cornerOfZone', 'besideWall', 'notBesideWall'])
export const logicAdvancedTypes = new Set<Clue['type']>(['rowOffsetFromCharacter', 'oneOfZones', 'oneOfObjects', 'aloneInZone', 'notAloneInZone', 'ownZoneOccupancyCount'])
export const edgeAdvancedTypes = new Set<Clue['type']>(['besideEdgeFeature', 'notBesideEdgeFeature'])
export const traitAdvancedTypes = new Set<Clue['type']>(['withTraitInZone', 'withoutTraitInZone', 'companionTraitCount'])
const traitGlobalTypes = new Set<GlobalClue['type']>(['zoneTraitCount'])
export const isSpatialAdvanced = (clue: Clue) => spatialAdvancedTypes.has(clue.type)
export const isLogicAdvanced = (clue: Clue) => logicAdvancedTypes.has(clue.type)
export const isEdgeAdvanced = (clue: Clue) => edgeAdvancedTypes.has(clue.type)
export const isTraitAdvanced = (clue: Clue) => traitAdvancedTypes.has(clue.type)
export const isTraitGlobal = (clue: GlobalClue) => traitGlobalTypes.has(clue.type)
export const isClassicProceduralGlobal = (clue: GlobalClue) => !isTraitGlobal(clue)

/** Final procedural vocabulary: legacy; spatial; logic; edge + classic global; trait + trait global. */
export const difficultyRequirements = (difficulty: DifficultyRating) => ({
  spatial: difficulty >= 2 ? 1 : 0,
  logic: difficulty >= 3 ? 1 : 0,
  edge: difficulty >= 4 ? 1 : 0,
  trait: difficulty >= 5 ? 1 : 0,
  classicGlobals: difficulty >= 4 ? 1 : 0,
  traitGlobals: difficulty >= 5 ? 1 : 0,
  maxGlobals: difficulty >= 5 ? 2 : difficulty >= 4 ? 1 : 0,
})
export const allowsClue = (difficulty: DifficultyRating, clue: Clue) => {
  if (isEdgeAdvanced(clue)) return difficulty >= 4
  if (isTraitAdvanced(clue)) return difficulty >= 5
  if (isSpatialAdvanced(clue)) return difficulty >= 2
  if (isLogicAdvanced(clue)) return difficulty >= 3
  return true
}
