import type { Clue, DifficultyRating, GlobalClue } from '../types'

export const spatialAdvancedTypes = new Set<Clue['type']>(['cornerOfBoard', 'cornerOfZone', 'besideWall', 'notBesideWall'])
export const logicAdvancedTypes = new Set<Clue['type']>(['rowOffsetFromCharacter', 'oneOfZones', 'oneOfObjects', 'aloneInZone', 'notAloneInZone', 'ownZoneOccupancyCount'])
export const isSpatialAdvanced = (clue: Clue) => spatialAdvancedTypes.has(clue.type)
export const isLogicAdvanced = (clue: Clue) => logicAdvancedTypes.has(clue.type)
export const isProceduralGlobal = (_clue: GlobalClue) => true
export const difficultyRequirements = (difficulty: DifficultyRating) => ({ spatial: difficulty >= 2 ? 1 : 0, logic: difficulty >= 3 ? 1 : 0, globals: difficulty === 4 ? 1 : difficulty === 5 ? 2 : 0, maxGlobals: difficulty >= 5 ? 2 : difficulty >= 4 ? 1 : 0 })
export const allowsClue = (difficulty: DifficultyRating, clue: Clue) => {
  if (isSpatialAdvanced(clue)) return difficulty >= 2
  if (isLogicAdvanced(clue)) return difficulty >= 3
  return true
}
