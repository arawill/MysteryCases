import { objectAppearanceCatalog } from '../../game/objects/appearanceCatalog'
import { isObjectPositionOccupiable } from '../../game/objects/footprints'
import type { BoardCell, BoardObject, ObjectAppearance, Position } from '../../game/types'

export function contextualObject(id: string, appearance: ObjectAppearance, occupiable: boolean, footprint?: Position[], occupiablePositions?: Position[]): BoardObject {
  const entry = objectAppearanceCatalog[appearance]
  return { id, label: entry.label.toLocaleLowerCase('es'), icon: entry.src, occupiable, appearance, footprint: footprint ? { id: `${id}-footprint`, positions: footprint } : undefined, occupiablePositions }
}

export function legacyObject(id: string, label: string, icon: string, occupiable: boolean, visualProfile: BoardObject['visualProfile'], footprint?: Position[], occupiablePositions?: Position[]): BoardObject {
  return { id, label, icon, occupiable, visualProfile, footprint: footprint ? { id: `${id}-footprint`, positions: footprint } : undefined, occupiablePositions }
}

export function createManualBoard(zoneAt: (row: number, column: number) => string, objectAt: Record<string, BoardObject>): BoardCell[] {
  return Array.from({ length: 6 }, (_, rowIndex) => Array.from({ length: 6 }, (_, columnIndex) => {
    const row = rowIndex + 1, column = columnIndex + 1, object = objectAt[`${row}:${column}`]
    return { row, column, zoneId: zoneAt(row, column), occupiable: object ? isObjectPositionOccupiable(object, { row, column }) : true, ...(object ? { object } : {}) }
  })).flat()
}
