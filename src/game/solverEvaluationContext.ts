import { getCharacterTraitIds } from './traits'
import type { BoardCell, Character, GameCase, Position, Zone, ZoneSurface } from './types'
import { resolveZoneSurface } from './zones/surfaces'

const emptyCells: readonly BoardCell[] = Object.freeze([])
// Keeps malformed or unexpectedly large fixtures on the exact Map fallback and bounds per-solve allocation.
const MAX_ROW_MAJOR_CELLS = 65_536

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
  const rows = caseData.rows, columns = caseData.columns
  const validDimensions = Number.isInteger(rows) && rows > 0 && Number.isInteger(columns) && columns > 0
  const denseSize = validDimensions ? rows * columns : 0
  const useRowMajor = validDimensions
    && Number.isSafeInteger(denseSize) && denseSize <= MAX_ROW_MAJOR_CELLS
  const rowMajorCells: Array<BoardCell | undefined> | undefined = useRowMajor ? new Array(denseSize) : undefined
  const rowMajorPresent: Uint8Array | undefined = useRowMajor ? new Uint8Array(denseSize) : undefined
  const objectCells = new Map<unknown, BoardCell[]>()
  for (const cell of caseData.board) {
    let fallbackColumns = cellsByRow.get(cell.row)
    if (!fallbackColumns) { fallbackColumns = new Map(); cellsByRow.set(cell.row, fallbackColumns) }
    if (!fallbackColumns.has(cell.column)) fallbackColumns.set(cell.column, cell)
    if (rowMajorCells && rowMajorPresent && Number.isInteger(cell.row) && cell.row >= 1 && cell.row <= rows && Number.isInteger(cell.column) && cell.column >= 1 && cell.column <= columns) {
      const index = (cell.row - 1) * columns + cell.column - 1
      if (rowMajorPresent[index] === 0) { rowMajorCells[index] = cell; rowMajorPresent[index] = 1 }
    }
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
    cellAt: (position: Position) => {
      if (rowMajorCells && rowMajorPresent && Number.isInteger(position.row) && position.row >= 1 && position.row <= rows && Number.isInteger(position.column) && position.column >= 1 && position.column <= columns) {
        const index = (position.row - 1) * columns + position.column - 1
        return rowMajorPresent[index] === 1 ? rowMajorCells[index] : undefined
      }
      return cellsByRow.get(position.row)?.get(position.column)
    },
    characterById: (id: string) => characters.get(id),
    cellsByObjectId: (id: string) => objectCells.get(id) ?? emptyCells,
    surfaceByZoneId: (id: string | undefined) => surfacesByZone.get(id) ?? resolveZoneSurface(zones.get(id)),
    characterHasTrait: (characterId: string, traitId: string) => traitsByCharacter.get(characterId)?.has(traitId) ?? false,
  })
}
