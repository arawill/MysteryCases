import type { BoardObject, Position } from '../types'

export const positionKey = (position: Position) => `${position.row}:${position.column}`

export function getObjectFootprint(object: BoardObject, fallback: Position): Position[] {
  return object.footprint?.positions ?? [fallback]
}

export function isObjectFootprintAnchor(object: BoardObject, cell: Position): boolean {
  const footprint = getObjectFootprint(object, cell)
  const anchor = footprint.reduce((first, position) => position.row < first.row || position.row === first.row && position.column < first.column ? position : first)
  return anchor.row === cell.row && anchor.column === cell.column
}

export function getObjectFootprintBounds(object: BoardObject, fallback: Position) {
  const footprint = getObjectFootprint(object, fallback)
  const rows = footprint.map(position => position.row), columns = footprint.map(position => position.column)
  const minRow = Math.min(...rows), maxRow = Math.max(...rows), minColumn = Math.min(...columns), maxColumn = Math.max(...columns)
  return { minRow, maxRow, minColumn, maxColumn, rows: maxRow - minRow + 1, columns: maxColumn - minColumn + 1 }
}

export function isObjectPositionOccupiable(object: BoardObject, position: Position): boolean {
  if (object.occupiablePositions) return object.occupiablePositions.some(candidate => candidate.row === position.row && candidate.column === position.column)
  return object.occupiable
}

export function isFootprintReservedCell(object: BoardObject | undefined, cell: Position): boolean {
  return Boolean(object?.footprint && !isObjectPositionOccupiable(object, cell))
}

export function isRectangularFootprint(positions: Position[]): boolean {
  if (positions.length === 0) return false
  const keys = new Set(positions.map(positionKey))
  if (keys.size !== positions.length) return false
  const rows = positions.map(position => position.row), columns = positions.map(position => position.column)
  const minRow = Math.min(...rows), maxRow = Math.max(...rows), minColumn = Math.min(...columns), maxColumn = Math.max(...columns)
  if ((maxRow - minRow + 1) * (maxColumn - minColumn + 1) !== positions.length) return false
  for (let row = minRow; row <= maxRow; row += 1) for (let column = minColumn; column <= maxColumn; column += 1) if (!keys.has(positionKey({ row, column }))) return false
  return true
}
