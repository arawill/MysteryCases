import type { CharacterGender, Clue, DifficultyRating, EdgeFeature, GlobalClue, Placement, TraitDefinition } from '../../game/types'
import type { GenerationStats } from '../../game/generation/types'

/** Serializable logical content for a Normal case. Visual assets are resolved at hydration time. */
export interface FrozenBoardCell { row: number; column: number; zoneId: string; occupiable: boolean; objectId?: string }
export interface FrozenCharacter { id: string; name: string; gender?: CharacterGender; avatarId?: string; roleId?: string; isVictim: boolean; traitIds?: string[]; clues: Clue[] }
export interface FrozenNormalCase {
  difficulty: DifficultyRating
  caseNumber: number
  id: string
  title: string
  intro: string
  scenarioPackId: string
  rows: number
  columns: number
  zoneIds: string[]
  board: FrozenBoardCell[]
  characters: FrozenCharacter[]
  solution: Placement[]
  globalClues?: GlobalClue[]
  edgeFeatures?: EdgeFeature[]
  traitDefinitions?: TraitDefinition[]
  killerId: string
  generation: { originalSeed: number; acceptedSeed: number; effectiveSeed: number; seedOffset: number; candidateAttempt: number; scenarioAttempts: number; stats: GenerationStats }
}

export interface FrozenNormalCaseSet { formatVersion: number; proceduralGenerationVersion: number; cases: FrozenNormalCase[] }
