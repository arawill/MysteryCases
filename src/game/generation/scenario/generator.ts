import { createSeededRandom, shuffle } from '../random'
import { generateValidPlacement } from '../placement'
import type { GenerationTemplate } from '../types'
import { placeScenarioObjects } from './objects'
import { generateZoneLayout } from './zones'
import { validateGenerationTemplate, validateScenarioProfile } from './validation'
import type { GeneratedScenario, GenerateScenarioOptions, ScenarioProfile, ScenarioStats } from './types'

const UINT32_MAX = 4294967295
const DEFAULT_FEASIBILITY_PLACEMENT_ATTEMPTS = 10000
const positiveInteger = (value: number, name: string) => { if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer.`) }
const validateSeed = (seed: number) => { if (!Number.isInteger(seed) || seed < 0 || seed > UINT32_MAX) throw new Error('seed must be a uint32 integer.') }
const templateFrom = (profile: ScenarioProfile, board: GenerationTemplate['board'], seed: number): GenerationTemplate => ({ id: `${profile.id}-scenario-${seed}`, title: profile.title, intro: profile.intro, difficulty: profile.difficulty, rows: profile.rows, columns: profile.columns, zones: profile.zones.map(zone => ({ ...zone })), board: board.map(cell => ({ ...cell, ...(cell.object ? { object: { ...cell.object } } : {}) })), characters: profile.characters.map(character => ({ ...character })) })
export function generateScenarioTemplate(profile: ScenarioProfile, options: GenerateScenarioOptions): GeneratedScenario {
  validateSeed(options.seed); const maxScenarioAttempts = options.maxScenarioAttempts ?? 100; const minZoneCells = options.minZoneCells ?? 4; const minOccupiableCellsPerZone = options.minOccupiableCellsPerZone ?? 2; positiveInteger(maxScenarioAttempts, 'maxScenarioAttempts'); positiveInteger(minZoneCells, 'minZoneCells'); positiveInteger(minOccupiableCellsPerZone, 'minOccupiableCellsPerZone'); const objectCount = options.objectCount ?? profile.objects.length; if (!Number.isInteger(objectCount) || objectCount < 0 || objectCount > profile.objects.length) throw new Error('objectCount must be an integer between 0 and the catalog size.')
  const profileErrors = validateScenarioProfile(profile); if (profileErrors.length > 0) throw new Error(`Invalid scenario profile: ${profileErrors.join(' ')}`); if (minZoneCells * profile.zones.length > profile.rows * profile.columns) throw new Error('minZoneCells is impossible for this profile.')
  const scenarioRandom = createSeededRandom(options.seed); const stats: ScenarioStats = { scenarioAttempts: 0, zoneLayoutAttempts: 0, objectPlacementAttempts: 0, feasibilityChecks: 0, objectsPlaced: 0, occupiableCells: 0, blockedCells: 0 }
  for (let attempt = 1; attempt <= maxScenarioAttempts; attempt += 1) {
    stats.scenarioAttempts = attempt; stats.zoneLayoutAttempts += 1; const layout = generateZoneLayout(profile, scenarioRandom, minZoneCells); if (!layout) continue
    const selectedObjects = shuffle(profile.objects, scenarioRandom).slice(0, objectCount); const objectResult = placeScenarioObjects(layout, selectedObjects, scenarioRandom, minOccupiableCellsPerZone); stats.objectPlacementAttempts += objectResult.attempts; if (!objectResult.ok) continue
    const template = templateFrom(profile, objectResult.board, options.seed); const errors = validateGenerationTemplate(template); if (errors.length > 0) continue
    stats.feasibilityChecks += 1
    try { generateValidPlacement(template, createSeededRandom(options.seed), DEFAULT_FEASIBILITY_PLACEMENT_ATTEMPTS) } catch { continue }
    stats.objectsPlaced = objectResult.objectsPlaced; stats.occupiableCells = template.board.filter(cell => cell.occupiable).length; stats.blockedCells = template.board.length - stats.occupiableCells
    return { template, seed: options.seed, stats }
  }
  throw new Error('Unable to generate a valid scenario template.')
}
