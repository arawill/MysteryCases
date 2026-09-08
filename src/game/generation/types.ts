import type { BoardCell, DifficultyRating, EdgeFeature, GameCase, TraitDefinition, Zone } from '../types'
export interface GenerationCharacter { id: string; name: string; avatar: string; isVictim: boolean; traitIds?: string[] }
export interface GenerationTemplate { id: string; title: string; intro: string; difficulty: DifficultyRating; rows: number; columns: number; zones: Zone[]; board: BoardCell[]; characters: GenerationCharacter[]; edgeFeatures?: EdgeFeature[]; traitDefinitions?: TraitDefinition[] }
export interface GeneratePuzzleOptions { seed: number; maxPlacementAttempts?: number; minCluesPerCharacter?: number; minimizeClues?: boolean }
export interface GenerationStats { placementAttempts: number; candidateClues: number; selectedClues: number; removedClues: number; solverCalls: number }
export interface GeneratedPuzzle { caseData: GameCase; seed: number; killerId: string; stats: GenerationStats }
