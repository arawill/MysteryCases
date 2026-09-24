import { avatarCatalog } from '../characters/avatarCatalog'
import { getDailyDifficultySeedFromKey, getDailyPuzzleIdFromKey, parseDailyDateKey } from '../daily/date'
import { isDifficultyRating } from '../difficulty'
import { PROCEDURAL_GENERATION_VERSION } from '../generation/version'
import type { GeneratedProceduralCase } from '../generation/proceduralCase'
import type { GenerationStats } from '../generation/types'
import { validateProceduralGameCase } from '../generation/validateProceduralCase'
import { getInfiniteCaseId } from '../infinite/generator'
import { scenarioPacks, selectScenarioPack } from '../scenarios/catalog'
import type { BoardCell, BoardObject, Character, DifficultyRating, GameCase, Zone } from '../types'

export const PROCEDURAL_SNAPSHOT_FORMAT_VERSION = 1 as const
export type ProceduralMode = 'daily' | 'infinite'

type PersistedZone = Omit<Zone, 'icon'> & { assetId: string }
type PersistedBoardObject = Omit<BoardObject, 'icon'> & { assetId: string }
type PersistedBoardCell = Omit<BoardCell, 'object'> & { object?: PersistedBoardObject }
type PersistedCharacter = Omit<Character, 'avatarImage'> & { avatarAssetId: string }
export type PersistedProceduralGameCase = Omit<GameCase, 'zones' | 'board' | 'characters'> & {
  zones: PersistedZone[]
  board: PersistedBoardCell[]
  characters: PersistedCharacter[]
}

export interface ProceduralCaseSnapshot {
  formatVersion: typeof PROCEDURAL_SNAPSHOT_FORMAT_VERSION
  generatorVersion: number
  mode: ProceduralMode
  originalSeed: number
  difficulty: DifficultyRating
  dailyDateKey?: string
  scenarioPackId: string
  effectiveSeed: number
  seedOffset: number
  killerId: string
  scenarioAttempts: number
  stats: GenerationStats
  caseData: PersistedProceduralGameCase
}

export interface RestoredProceduralCase {
  snapshot: ProceduralCaseSnapshot
  caseData: GameCase
}

export type GeneratedCaseForSnapshot = Pick<GeneratedProceduralCase, 'caseData' | 'baseSeed' | 'effectiveSeed' | 'seedOffset' | 'killerId' | 'scenarioAttempts' | 'stats'>

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isUint32 = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 0xFFFFFFFF
const isNonNegativeInteger = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0
const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const canonicalJson = (value: unknown): string => JSON.stringify(value, (_key, item: unknown) => {
  if (!isRecord(item)) return item
  return Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right)))
})

function persistCaseAssets(caseData: GameCase, scenarioPackId: string): PersistedProceduralGameCase {
  const pack = scenarioPacks.find(candidate => candidate.id === scenarioPackId)
  if (!pack) throw new Error('Unknown procedural scenario pack.')
  const zones = caseData.zones.map(zone => {
    const catalogZone = pack.zones.find(candidate => candidate.id === zone.id)
    if (!zone.icon || !catalogZone?.icon || zone.icon !== catalogZone.icon) throw new Error(`Unknown zone asset: ${zone.id}`)
    const { icon: _icon, ...data } = cloneJson(zone)
    return { ...data, assetId: zone.id }
  })
  const board = caseData.board.map(cell => {
    const data = cloneJson(cell)
    if (!data.object) return data as PersistedBoardCell
    const catalogObject = pack.objects.find(candidate => candidate.id === data.object?.id)
    if (!catalogObject || data.object.icon !== catalogObject.icon) throw new Error(`Unknown object asset: ${data.object.id}`)
    const { icon: _icon, ...object } = data.object
    return { ...data, object: { ...object, assetId: data.object.id } }
  })
  const characters = caseData.characters.map(character => {
    const avatar = character.avatarImage === undefined ? undefined : avatarCatalog.find(candidate => candidate.image === character.avatarImage)
    if (!avatar) throw new Error(`Unknown avatar asset: ${character.id}`)
    const { avatarImage: _avatarImage, ...data } = cloneJson(character)
    return { ...data, avatarAssetId: avatar.id }
  })
  const { zones: _zones, board: _board, characters: _characters, ...data } = cloneJson(caseData)
  return { ...data, zones, board, characters }
}

function hydrateCaseAssets(value: unknown, scenarioPackId: string): GameCase | null {
  if (!isRecord(value) || !Array.isArray(value.zones) || !Array.isArray(value.board) || !Array.isArray(value.characters)) return null
  const pack = scenarioPacks.find(candidate => candidate.id === scenarioPackId)
  if (!pack) return null
  try {
    const persisted = cloneJson(value) as PersistedProceduralGameCase
    const zones = persisted.zones.map(zone => {
      const { assetId, ...data } = zone
      if (typeof assetId !== 'string') throw new Error('Invalid zone asset reference.')
      const catalogZone = pack.zones.find(candidate => candidate.id === assetId)
      if (!catalogZone?.icon || data.id !== assetId) throw new Error('Missing zone asset reference.')
      return { ...data, icon: catalogZone.icon }
    })
    const board = persisted.board.map(cell => {
      if (!cell.object) return cell as BoardCell
      const { assetId, ...object } = cell.object
      if (typeof assetId !== 'string' || object.id !== assetId) throw new Error('Invalid object asset reference.')
      const catalogObject = pack.objects.find(candidate => candidate.id === assetId)
      if (!catalogObject) throw new Error('Missing object asset reference.')
      return { ...cell, object: { ...object, icon: catalogObject.icon } }
    })
    const characters = persisted.characters.map(character => {
      const { avatarAssetId, ...data } = character
      if (typeof avatarAssetId !== 'string') throw new Error('Invalid avatar asset reference.')
      const avatar = avatarCatalog.find(candidate => candidate.id === avatarAssetId)
      if (!avatar) throw new Error('Missing avatar asset reference.')
      return { ...data, avatarImage: avatar.image }
    })
    return { ...persisted, zones, board, characters }
  } catch {
    return null
  }
}

function validStats(value: unknown): value is GenerationStats {
  if (!isRecord(value)) return false
  return ['placementAttempts', 'candidateClues', 'selectedClues', 'removedClues', 'solverCalls'].every(key => isNonNegativeInteger(value[key]))
}

function expectedLogicalId(mode: ProceduralMode, difficulty: DifficultyRating, seed: number, dateKey?: string): string | null {
  if (mode === 'daily') return dateKey ? getDailyPuzzleIdFromKey(dateKey, difficulty) : null
  return getInfiniteCaseId(difficulty, seed)
}

export function createProceduralCaseSnapshot(
  mode: ProceduralMode,
  generated: GeneratedCaseForSnapshot,
  options: { dailyDateKey?: string } = {},
): ProceduralCaseSnapshot {
  const dateKey = options.dailyDateKey
  if (mode === 'daily' && (!dateKey || !parseDailyDateKey(dateKey))) throw new Error('A valid date key is required for Daily snapshots.')
  if (mode === 'infinite' && dateKey !== undefined) throw new Error('Infinite snapshots cannot include a Daily date key.')
  if (!isUint32(generated.baseSeed)) throw new Error('The original procedural seed must be uint32.')
  if (mode === 'daily' && generated.baseSeed !== getDailyDifficultySeedFromKey(dateKey!, generated.caseData.difficulty)) throw new Error('The Daily seed does not match its date and difficulty.')
  const validationErrors = validateProceduralGameCase(generated.caseData, generated.killerId)
  if (validationErrors.length > 0) throw new Error(`Invalid procedural case: ${validationErrors.join(' ')}`)
  const pack = selectScenarioPack(generated.baseSeed)
  const snapshot: ProceduralCaseSnapshot = {
    formatVersion: PROCEDURAL_SNAPSHOT_FORMAT_VERSION,
    generatorVersion: PROCEDURAL_GENERATION_VERSION,
    mode,
    originalSeed: generated.baseSeed,
    difficulty: generated.caseData.difficulty,
    ...(dateKey === undefined ? {} : { dailyDateKey: dateKey }),
    scenarioPackId: pack.id,
    effectiveSeed: generated.effectiveSeed,
    seedOffset: generated.seedOffset,
    killerId: generated.killerId,
    scenarioAttempts: generated.scenarioAttempts,
    stats: cloneJson(generated.stats),
    caseData: persistCaseAssets(generated.caseData, pack.id),
  }
  const logicalId = expectedLogicalId(mode, snapshot.difficulty, snapshot.originalSeed, dateKey)
  const hydrated = hydrateCaseAssets(snapshot.caseData, snapshot.scenarioPackId)
  if (!logicalId || snapshot.caseData.id !== `${logicalId}-g${snapshot.generatorVersion}` || !hydrated || canonicalJson(hydrated) !== canonicalJson(generated.caseData)) throw new Error('The procedural snapshot does not preserve the generated case exactly.')
  return cloneJson(snapshot)
}

export function restoreProceduralCaseSnapshot(
  value: unknown,
  expected: { mode?: ProceduralMode; dailyDateKey?: string; difficulty?: DifficultyRating; originalSeed?: number } = {},
): RestoredProceduralCase | null {
  try {
    if (!isRecord(value) || value.formatVersion !== PROCEDURAL_SNAPSHOT_FORMAT_VERSION || !isNonNegativeInteger(value.generatorVersion) || value.generatorVersion < 1) return null
    if (value.mode !== 'daily' && value.mode !== 'infinite') return null
    const mode = value.mode
    if (expected.mode !== undefined && mode !== expected.mode) return null
    if (!isUint32(value.originalSeed) || !isDifficultyRating(value.difficulty) || !isUint32(value.effectiveSeed)) return null
    if (!isNonNegativeInteger(value.seedOffset) || value.seedOffset >= 100 || value.effectiveSeed !== ((value.originalSeed + value.seedOffset) >>> 0)) return null
    if (typeof value.killerId !== 'string' || !value.killerId || !isNonNegativeInteger(value.scenarioAttempts) || value.scenarioAttempts < 1 || !validStats(value.stats)) return null
    if (typeof value.scenarioPackId !== 'string' || !scenarioPacks.some(pack => pack.id === value.scenarioPackId)) return null
    const dailyDateKey = value.dailyDateKey
    if (mode === 'daily') {
      if (typeof dailyDateKey !== 'string' || !parseDailyDateKey(dailyDateKey)) return null
      if (expected.dailyDateKey !== undefined && dailyDateKey !== expected.dailyDateKey) return null
      if (value.originalSeed !== getDailyDifficultySeedFromKey(dailyDateKey, value.difficulty)) return null
    } else if (dailyDateKey !== undefined) return null
    if (expected.difficulty !== undefined && value.difficulty !== expected.difficulty) return null
    if (expected.originalSeed !== undefined && value.originalSeed !== expected.originalSeed) return null
    const caseData = hydrateCaseAssets(value.caseData, value.scenarioPackId)
    if (!caseData || caseData.difficulty !== value.difficulty) return null
    const logicalId = expectedLogicalId(mode, value.difficulty, value.originalSeed, dailyDateKey as string | undefined)
    if (!logicalId || caseData.id !== `${logicalId}-g${value.generatorVersion}`) return null
    if (validateProceduralGameCase(caseData, value.killerId).length > 0) return null
    const snapshot = cloneJson(value) as unknown as ProceduralCaseSnapshot
    return { snapshot, caseData }
  } catch {
    return null
  }
}
