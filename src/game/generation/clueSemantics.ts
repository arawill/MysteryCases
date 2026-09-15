import type { Clue, DifficultyRating } from '../types'

export type ClueFamily = 'ENVIRONMENT' | 'PERSON_RELATION' | 'ZONE_GEOMETRY' | 'OCCUPANCY' | 'AMBIGUOUS' | 'EDGE' | 'TRAIT' | 'COORDINATE'
const families: Record<Clue['type'], ClueFamily> = {
  row: 'COORDINATE', column: 'COORDINATE', zone: 'ENVIRONMENT', onObject: 'ENVIRONMENT', besideObject: 'ENVIRONMENT',
  northOfCharacter: 'PERSON_RELATION', southOfCharacter: 'PERSON_RELATION', sameZoneAsCharacter: 'PERSON_RELATION', besideCharacter: 'PERSON_RELATION', rowOffsetFromCharacter: 'PERSON_RELATION',
  cornerOfBoard: 'ZONE_GEOMETRY', cornerOfZone: 'ZONE_GEOMETRY', besideWall: 'ZONE_GEOMETRY', notBesideWall: 'ZONE_GEOMETRY',
  aloneInZone: 'OCCUPANCY', notAloneInZone: 'OCCUPANCY', ownZoneOccupancyCount: 'OCCUPANCY',
  oneOfZones: 'AMBIGUOUS', oneOfObjects: 'AMBIGUOUS',
  besideEdgeFeature: 'EDGE', notBesideEdgeFeature: 'EDGE',
  withTraitInZone: 'TRAIT', withoutTraitInZone: 'TRAIT', companionTraitCount: 'TRAIT',
  notZone: 'ENVIRONMENT', notOnObject: 'ENVIRONMENT', notBesideObject: 'ENVIRONMENT',
}
const negative = new Set<Clue['type']>(['notZone', 'notOnObject', 'notBesideObject', 'notBesideWall', 'notBesideEdgeFeature', 'withoutTraitInZone'])
const anchors = new Set<Clue['type']>(['zone', 'onObject', 'besideObject', 'cornerOfZone', 'cornerOfBoard', 'besideWall', 'besideEdgeFeature', 'aloneInZone', 'ownZoneOccupancyCount'])
const base = new Set<Clue['type']>(['zone', 'onObject', 'besideObject', 'sameZoneAsCharacter', 'besideCharacter', 'northOfCharacter', 'southOfCharacter', 'cornerOfZone', 'besideWall', 'aloneInZone', 'notAloneInZone', 'ownZoneOccupancyCount'])
const d2 = new Set<Clue['type']>(['cornerOfBoard', 'notZone', 'notOnObject', 'notBesideObject', 'notBesideWall'])
const d3 = new Set<Clue['type']>(['rowOffsetFromCharacter', 'oneOfZones', 'oneOfObjects'])
const d4 = new Set<Clue['type']>(['besideEdgeFeature', 'notBesideEdgeFeature'])
const d5 = new Set<Clue['type']>(['withTraitInZone', 'withoutTraitInZone', 'companionTraitCount'])
export const clueFamily = (clue: Pick<Clue, 'type'>): ClueFamily => families[clue.type]
export const isNegativeClue = (clue: Pick<Clue, 'type'>) => negative.has(clue.type)
export const isPositiveAnchor = (clue: Pick<Clue, 'type'>) => anchors.has(clue.type)
export const isPersonRelation = (clue: Pick<Clue, 'type'>) => clueFamily(clue) === 'PERSON_RELATION'
export const allowedProceduralClueTypes = (difficulty: DifficultyRating) => new Set<Clue['type']>([...base, ...(difficulty >= 2 ? d2 : []), ...(difficulty >= 3 ? d3 : []), ...(difficulty >= 4 ? d4 : []), ...(difficulty >= 5 ? d5 : [])])
export const allowsProceduralClue = (difficulty: DifficultyRating, clue: Clue) => allowedProceduralClueTypes(difficulty).has(clue.type)
export const getMinimumCluesPerCharacter = (difficulty: DifficultyRating) => difficulty <= 3 ? 3 : 2
const initialTargets: Record<DifficultyRating, number> = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 }
export const getInitialTargetCluesPerCharacter = (difficulty: DifficultyRating) => initialTargets[difficulty]
export const getMaxNegativeRatio = (difficulty: DifficultyRating) => [0, 0, .2, .25, .3, .35][difficulty]
