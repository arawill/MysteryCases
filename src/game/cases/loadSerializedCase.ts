import { validateCaseDefinition } from '../validation'
import type { BoardObject, Character, GameCase, Zone } from '../types'
import { resolveCaseAsset } from './caseAssetRegistry'
import { CURRENT_CASE_SCHEMA_VERSION } from './schemaVersion'
import { assertSerializedCaseSchema } from './validateSerializedCaseSchema'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const positionIsInBounds = (position: { row: number; column: number }, rows: number, columns: number) => position.row >= 1 && position.row <= rows && position.column >= 1 && position.column <= columns

function fail(message: string): never {
  throw new Error(`Caso serializado inválido: ${message}`)
}

/** Converts untrusted, schema-versioned JSON data into the GameCase consumed by the game. */
export function loadSerializedCase(value: unknown): GameCase {
  if (isRecord(value) && typeof value.schemaVersion === 'number' && value.schemaVersion !== CURRENT_CASE_SCHEMA_VERSION) {
    throw new Error(`Unsupported case schema version: ${value.schemaVersion}.`)
  }
  assertSerializedCaseSchema(value)

  const rows = value.rows
  const columns = value.columns
  const zoneIds = new Set<string>()
  const zones: Zone[] = value.zones.map(serializedZone => {
    if (zoneIds.has(serializedZone.id)) fail(`zona duplicada: ${serializedZone.id}.`)
    zoneIds.add(serializedZone.id)
    if (serializedZone.labelAnchor !== undefined && !positionIsInBounds(serializedZone.labelAnchor.position, rows, columns)) fail(`label anchor fuera del tablero en zona ${serializedZone.id}.`)
    const { iconAsset, ...zone } = serializedZone
    return { ...zone, ...(iconAsset === undefined ? {} : { icon: resolveCaseAsset(iconAsset) }) }
  })

  const objects = new Map<string, BoardObject>()
  value.objects.forEach(serializedObject => {
    if (objects.has(serializedObject.id)) fail(`object id duplicado: ${serializedObject.id}.`)
    const { iconAsset, ...object } = serializedObject
    objects.set(object.id, { ...object, icon: resolveCaseAsset(iconAsset) })
  })

  const coordinates = new Set<string>()
  const board = value.board.map((serializedCell, index) => {
    if (!positionIsInBounds(serializedCell, rows, columns)) fail(`posición fuera del tablero en board[${index}].`)
    if (!zoneIds.has(serializedCell.zoneId)) fail(`zona referenciada inexistente en board[${index}]: ${serializedCell.zoneId}.`)
    const coordinate = `${serializedCell.row}:${serializedCell.column}`
    if (coordinates.has(coordinate)) fail(`posición de board duplicada: ${coordinate}.`)
    coordinates.add(coordinate)
    const { objectId, ...cell } = serializedCell
    if (objectId === undefined) return cell
    const object = objects.get(objectId)
    if (!object) fail(`object id inexistente en board[${index}]: ${objectId}.`)
    return { ...cell, object }
  })

  const characterIds = new Set<string>()
  const characters: Character[] = value.characters.map(serializedCharacter => {
    if (characterIds.has(serializedCharacter.id)) fail(`personaje duplicado: ${serializedCharacter.id}.`)
    characterIds.add(serializedCharacter.id)
    const { avatarAsset, ...character } = serializedCharacter
    return { ...character, ...(avatarAsset === undefined ? {} : { avatarImage: resolveCaseAsset(avatarAsset) }) }
  })

  value.solution.forEach((placement, index) => {
    if (!characterIds.has(placement.characterId)) fail(`la solución referencia un personaje inexistente: ${placement.characterId}.`)
    if (!positionIsInBounds(placement.position, rows, columns)) fail(`posición fuera del tablero en solution[${index}].`)
  })

  const loadedCase: GameCase = {
    id: value.id,
    title: value.title,
    intro: value.intro,
    difficulty: value.difficulty,
    rows,
    columns,
    zones,
    board,
    characters,
    solution: value.solution,
    ...(value.globalClues === undefined ? {} : { globalClues: value.globalClues }),
    ...(value.edgeFeatures === undefined ? {} : { edgeFeatures: value.edgeFeatures }),
    ...(value.traitDefinitions === undefined ? {} : { traitDefinitions: value.traitDefinitions }),
  }
  const errors = validateCaseDefinition(loadedCase)
  if (errors.length > 0) fail(errors.join(' '))
  return loadedCase
}
