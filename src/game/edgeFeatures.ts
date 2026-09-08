import { getCell } from './rules'
import { isWallSide } from './spatial'
import type { BoardCell, EdgeFeature, EdgeSegment, Position, WallSide } from './types'

interface GridVertex { row: number; column: number }

const sideOffset: Record<WallSide, Position> = {
  N: { row: -1, column: 0 }, E: { row: 0, column: 1 }, S: { row: 1, column: 0 }, W: { row: 0, column: -1 },
}

const compareVertices = (a: GridVertex, b: GridVertex) => a.row - b.row || a.column - b.column
const vertexKey = (vertex: GridVertex) => `${vertex.row}:${vertex.column}`

/** Returns the two grid vertices which delimit a physical wall segment. */
export function edgeSegmentVertices(segment: EdgeSegment): [GridVertex, GridVertex] {
  const { row, column } = segment.position
  switch (segment.side) {
    case 'N': return [{ row: row - 1, column: column - 1 }, { row: row - 1, column }]
    case 'E': return [{ row: row - 1, column }, { row, column }]
    case 'S': return [{ row, column: column - 1 }, { row, column }]
    case 'W': return [{ row: row - 1, column: column - 1 }, { row, column: column - 1 }]
  }
}

/** Canonical physical key: the two vertices are sorted, so E/W and N/S agree. */
export function edgeSegmentKey(segment: EdgeSegment): string {
  const [first, second] = edgeSegmentVertices(segment)
  return compareVertices(first, second) <= 0 ? `${vertexKey(first)}|${vertexKey(second)}` : `${vertexKey(second)}|${vertexKey(first)}`
}

export const isWallSideValue = (value: unknown): value is WallSide => value === 'N' || value === 'E' || value === 'S' || value === 'W'
export const isEdgeFeatureType = (value: unknown): value is EdgeFeature['type'] => value === 'window' || value === 'door'

/** The cells which physically touch the segment. Exterior segments have one cell. */
export function adjacentCellsForEdgeSegment(segment: EdgeSegment, board: BoardCell[]): BoardCell[] {
  const anchor = getCell(board, segment.position)
  if (!anchor) return []
  const delta = sideOffset[segment.side]
  const neighbour = getCell(board, { row: anchor.row + delta.row, column: anchor.column + delta.column })
  return neighbour ? [anchor, neighbour] : [anchor]
}

export const isCellBesideEdgeFeature = (cell: BoardCell, feature: EdgeFeature, board: BoardCell[]) => feature.segments.some(segment => adjacentCellsForEdgeSegment(segment, board).some(candidate => candidate.row === cell.row && candidate.column === cell.column))

export const isEdgeSegmentOnWall = (segment: EdgeSegment, board: BoardCell[]) => {
  const cell = getCell(board, segment.position)
  return !!cell && isWallSide(cell, segment.side, board)
}

/** Two wide-feature segments must share a vertex and run on the same grid line. */
export function areCollinearContiguousEdgeSegments(first: EdgeSegment, second: EdgeSegment): boolean {
  if (edgeSegmentKey(first) === edgeSegmentKey(second)) return false
  const [a1, a2] = edgeSegmentVertices(first)
  const [b1, b2] = edgeSegmentVertices(second)
  const horizontalA = a1.row === a2.row
  const horizontalB = b1.row === b2.row
  if (horizontalA !== horizontalB) return false
  if (horizontalA && a1.row !== b1.row) return false
  if (!horizontalA && a1.column !== b1.column) return false
  return [a1, a2].some(a => [b1, b2].some(b => a.row === b.row && a.column === b.column))
}
