import { frozenNormalCaseSet } from '../../data/normal/frozen'
import type { FrozenNormalCase } from '../../data/normal/types'
import { avatarCatalog } from '../characters/avatarCatalog'
import type { GeneratedProceduralCase } from '../generation/proceduralCase'
import { scenarioPacks } from '../scenarios/catalog'
import type { DifficultyRating, GameCase } from '../types'

export const NORMAL_CASE_SET_VERSION = 1
const packById = (id: string) => { const pack = scenarioPacks.find(candidate => candidate.id === id); if (!pack) throw new Error(`Frozen Normal case references unknown scenario pack: ${id}.`); return pack }
const clone = <T,>(value: T): T => structuredClone(value)

export function hydrateFrozenNormalCase(frozen: FrozenNormalCase): GameCase {
  const pack = packById(frozen.scenarioPackId)
  const zones = frozen.zoneIds.map(id => { const zone = pack.zones.find(candidate => candidate.id === id); if (!zone) throw new Error(`Frozen Normal case ${frozen.id} references unknown zone: ${id}.`); return clone(zone) })
  const board = frozen.board.map(cell => {
    const object = cell.objectId === undefined ? undefined : pack.objects.find(candidate => candidate.id === cell.objectId)
    if (cell.objectId !== undefined && !object) throw new Error(`Frozen Normal case ${frozen.id} references unknown object: ${cell.objectId}.`)
    return { row: cell.row, column: cell.column, zoneId: cell.zoneId, occupiable: cell.occupiable, ...(object ? { object: clone(object) } : {}) }
  })
  const characters = frozen.characters.map(character => {
    const avatar = character.avatarId === undefined ? undefined : avatarCatalog.find(candidate => candidate.id === character.avatarId)
    if (character.avatarId !== undefined && !avatar) throw new Error(`Frozen Normal case ${frozen.id} references unknown avatar: ${character.avatarId}.`)
    const role = character.roleId === undefined ? undefined : pack.roles.find(candidate => candidate.id === character.roleId)
    if (character.roleId !== undefined && !role) throw new Error(`Frozen Normal case ${frozen.id} references unknown role: ${character.roleId}.`)
    if (role && !character.gender) throw new Error(`Frozen Normal case ${frozen.id} has a role without a character gender.`)
    return { id: character.id, name: character.name, avatar: '👤', ...(avatar ? { avatarImage: avatar.image } : {}), ...(character.gender ? { gender: character.gender } : {}), ...(character.roleId ? { roleId: character.roleId, roleLabel: character.gender === 'female' ? role?.femaleLabel : role?.maleLabel } : {}), isVictim: character.isVictim, ...(character.traitIds ? { traitIds: clone(character.traitIds) } : {}), clues: clone(character.clues) }
  })
  return { id: frozen.id, title: frozen.title, intro: frozen.intro, difficulty: frozen.difficulty, rows: frozen.rows, columns: frozen.columns, zones, board, characters, solution: clone(frozen.solution), ...(frozen.globalClues ? { globalClues: clone(frozen.globalClues) } : {}), ...(frozen.edgeFeatures ? { edgeFeatures: clone(frozen.edgeFeatures) } : {}), ...(frozen.traitDefinitions ? { traitDefinitions: clone(frozen.traitDefinitions) } : {}) }
}

export const getFrozenNormalCase = (difficulty: DifficultyRating, caseNumber: number) => frozenNormalCaseSet.cases.find(item => item.difficulty === difficulty && item.caseNumber === caseNumber)
export const getFrozenNormalGeneratedCase = (difficulty: DifficultyRating, caseNumber: number): GeneratedProceduralCase | undefined => {
  const frozen = getFrozenNormalCase(difficulty, caseNumber)
  return frozen ? { caseData: hydrateFrozenNormalCase(frozen), baseSeed: frozen.generation.originalSeed, effectiveSeed: frozen.generation.effectiveSeed, seedOffset: frozen.generation.seedOffset, killerId: frozen.killerId, scenarioAttempts: frozen.generation.scenarioAttempts, stats: clone(frozen.generation.stats) } : undefined
}
