import { getCell } from './rules'
import type { BoardCell, Position } from './types'

export type WallSide = 'N' | 'E' | 'S' | 'W'
const offset: Record<WallSide, Position> = { N: { row: -1, column: 0 }, E: { row: 0, column: 1 }, S: { row: 1, column: 0 }, W: { row: 0, column: -1 } }

/** A wall is either the edge of the board or a change of room. */
export function isWallSide(cell: BoardCell, side: WallSide, board: BoardCell[]): boolean {
  const delta = offset[side]
  const neighbour = getCell(board, { row: cell.row + delta.row, column: cell.column + delta.column })
  return !neighbour || neighbour.zoneId !== cell.zoneId
}
export const isBesideWall = (cell: BoardCell, board: BoardCell[]) => (['N', 'E', 'S', 'W'] as WallSide[]).some(side => isWallSide(cell, side, board))
export const isBoardCorner = (cell: BoardCell, rows: number, columns: number) => (cell.row === 1 || cell.row === rows) && (cell.column === 1 || cell.column === columns)
/** A zone corner requires two perpendicular wall sides, including irregular rooms. */
export function isZoneCorner(cell: BoardCell, board: BoardCell[]): boolean {
  const walls = new Set((['N', 'E', 'S', 'W'] as WallSide[]).filter(side => isWallSide(cell, side, board)))
  return (walls.has('N') && walls.has('E')) || (walls.has('E') && walls.has('S')) || (walls.has('S') && walls.has('W')) || (walls.has('W') && walls.has('N'))
}
