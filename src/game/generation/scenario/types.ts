import type { BoardObject, Zone } from '../../types'
import type { GenerationCharacter, GenerationTemplate } from '../types'
export interface ScenarioProfile { id: string; title: string; intro: string; difficulty: string; rows: number; columns: number; characters: GenerationCharacter[]; zones: Zone[]; objects: BoardObject[] }
export interface GenerateScenarioOptions { seed: number; maxScenarioAttempts?: number; minZoneCells?: number; minOccupiableCellsPerZone?: number; objectCount?: number }
export interface ScenarioStats { scenarioAttempts: number; zoneLayoutAttempts: number; objectPlacementAttempts: number; feasibilityChecks: number; objectsPlaced: number; occupiableCells: number; blockedCells: number }
export interface GeneratedScenario { template: GenerationTemplate; seed: number; stats: ScenarioStats }
