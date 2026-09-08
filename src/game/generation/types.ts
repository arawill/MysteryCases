import type { BoardCell, DifficultyRating, GameCase, Zone } from '../types'
export interface GenerationCharacter { id: string; name: string; avatar: string; isVictim: boolean }
export interface GenerationTemplate { id: string; title: string; intro: string; difficulty: DifficultyRating; rows: number; columns: number; zones: Zone[]; board: BoardCell[]; characters: GenerationCharacter[] }
export interface GeneratePuzzleOptions { seed: number; maxPlacementAttempts?: number; minCluesPerCharacter?: number }
export interface GenerationStats { placementAttempts: number; candidateClues: number; selectedClues: number; removedClues: number; solverCalls: number }
export interface GeneratedPuzzle { caseData: GameCase; seed: number; killerId: string; stats: GenerationStats }
