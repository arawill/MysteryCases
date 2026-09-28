import { getCharacterTraitIds } from './traits'
import type { BoardCell, Character, GameCase, Position, Zone, ZoneSurface } from './types'
import { resolveZoneSurface } from './zones/surfaces'

const emptyCells: readonly BoardCell[] = Object.freeze([])

/** Static, solve-local lookups. Maps are enclosed so callers cannot mutate them. */
export interface SolverEvaluationContext {
  cellAt(position: Position): BoardCell | undefined
  characterById(id: string): Character | undefined
  cellsByObjectId(id: string): readonly BoardCell[]
  surfaceByZoneId(id: string | undefined): ZoneSurface
  characterHasTrait(characterId: string, traitId: string): boolean
}

export function createSolverEvaluationContext(caseData: GameCase): SolverEvaluationContext {
  const cellsByRow = new Map<unknown, Map<unknown, BoardCell>>()
  const objectCells = new Map<unknown, BoardCell[]>()
  for (const cell of caseData.board) {
    let columns = cellsByRow.get(cell.row)
    if (!columns) { columns = new Map(); cellsByRow.set(cell.row, columns) }
    if (!columns.has(cell.column)) columns.set(cell.column, cell)
    if (cell.object) {
      const grouped = objectCells.get(cell.object.id) ?? []
      grouped.push(cell)
      objectCells.set(cell.object.id, grouped)
    }
  }
  for (const cells of objectCells.values()) Object.freeze(cells)

  const characters = new Map<unknown, Character>()
  const traitsByCharacter = new Map<unknown, ReadonlySet<string>>()
  for (const character of caseData.characters) if (!characters.has(character.id)) {
    characters.set(character.id, character)
    traitsByCharacter.set(character.id, new Set(getCharacterTraitIds(character)))
  }

  const zones = new Map<unknown, Zone>()
  const surfacesByZone = new Map<unknown, ZoneSurface>()
  for (const zone of caseData.zones) if (!zones.has(zone.id)) {
    zones.set(zone.id, zone)
    surfacesByZone.set(zone.id, resolveZoneSurface(zone))
  }

  return Object.freeze({
    cellAt: (position: Position) => cellsByRow.get(position.row)?.get(position.column),
    characterById: (id: string) => characters.get(id),
    cellsByObjectId: (id: string) => objectCells.get(id) ?? emptyCells,
    surfaceByZoneId: (id: string | undefined) => surfacesByZone.get(id) ?? resolveZoneSurface(zones.get(id)),
    characterHasTrait: (characterId: string, traitId: string) => traitsByCharacter.get(characterId)?.has(traitId) ?? false,
  })
}
