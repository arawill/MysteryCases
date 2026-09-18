import { edgeSegmentKey } from '../edgeFeatures'
import { getCell } from '../rules'
import type { BoardCell, EdgeFeature, EdgeSegment, Zone, ZoneEdgeLabelAnchor } from '../types'

export interface ZoneLabelPlacement {
  zoneId: string
  row: number
  startColumn: number
  endColumn: number
  availableColumns: number
  centerColumn: number
  source: 'auto' | 'explicit'
}

interface Candidate extends Omit<ZoneLabelPlacement, 'source'> {
  score: readonly [number, number, number]
}

const key = (row: number, column: number) => `${row}:${column}`
const segmentFor = (row: number, column: number): EdgeSegment => ({ position: { row, column }, side: 'S' })

function occupiedFeatureSegments(features: EdgeFeature[]): Set<string> {
  return new Set(features.flatMap(feature => feature.segments.map(edgeSegmentKey)))
}

function isLowerBoundary(cell: BoardCell, board: BoardCell[]): boolean {
  return getCell(board, { row: cell.row + 1, column: cell.column })?.zoneId !== cell.zoneId
}

function candidatesFor(zone: Zone, board: BoardCell[], features: Set<string>): Candidate[] {
  const cells = board.filter(cell => cell.zoneId === zone.id)
  if (cells.length === 0) return []
  const byRow = new Map<number, number[]>()
  for (const cell of cells) {
    if (!isLowerBoundary(cell, board) || features.has(edgeSegmentKey(segmentFor(cell.row, cell.column)))) continue
    const columns = byRow.get(cell.row) ?? []
    columns.push(cell.column)
    byRow.set(cell.row, columns)
  }
  const zoneCenter = cells.reduce((sum, cell) => sum + cell.column, 0) / cells.length
  const candidates: Candidate[] = []
  for (const [row, columns] of byRow) {
    columns.sort((first, second) => first - second)
    let start = columns[0], previous = columns[0]
    const addRun = (end: number) => {
      const width = end - start + 1
      const centerDistance = Math.abs((start + end) / 2 - zoneCenter)
      candidates.push({ zoneId: zone.id, row, startColumn: start, endColumn: end, availableColumns: width, centerColumn: (start + end) / 2, score: [width, -centerDistance, row] })
    }
    for (const column of columns.slice(1)) {
      if (column !== previous + 1) { addRun(previous); start = column }
      previous = column
    }
    addRun(previous)
  }
  return candidates
}

function explicitPlacement(zone: Zone, anchor: ZoneEdgeLabelAnchor | undefined, board: BoardCell[], features: Set<string>): ZoneLabelPlacement | null {
  if (!anchor || anchor.segment.side !== 'S') return null
  const span = anchor.span
  if (!Number.isInteger(span) || span < 1) return null
  const { row, column } = anchor.segment.position
  const endColumn = column + span - 1
  for (let current = column; current <= endColumn; current += 1) {
    const cell = getCell(board, { row, column: current })
    if (!cell || cell.zoneId !== zone.id || !isLowerBoundary(cell, board) || features.has(edgeSegmentKey(segmentFor(row, current)))) return null
  }
  return { zoneId: zone.id, row, startColumn: column, endColumn, availableColumns: span, centerColumn: (column + endColumn) / 2, source: 'explicit' }
}

function overlaps(first: ZoneLabelPlacement, second: Pick<ZoneLabelPlacement, 'row' | 'startColumn' | 'endColumn'>): boolean {
  return first.row === second.row && first.startColumn <= second.endColumn && second.startColumn <= first.endColumn
}

/**
 * Places one plaque per zone on an unobstructed lower wall. The placement is
 * purely visual; it neither changes cells nor participates in the solver.
 */
export function resolveZoneLabelPlacements(zones: Zone[], board: BoardCell[], edgeFeatures: EdgeFeature[] = []): ZoneLabelPlacement[] {
  const features = occupiedFeatureSegments(edgeFeatures)
  const placements: ZoneLabelPlacement[] = []
  for (const zone of zones) {
    const explicit = explicitPlacement(zone, zone.labelEdgeAnchor, board, features)
    if (explicit && !placements.some(placement => overlaps(placement, explicit))) { placements.push(explicit); continue }
    const selected = candidatesFor(zone, board, features)
      .sort((first, second) => second.score[0] - first.score[0] || second.score[1] - first.score[1] || second.score[2] - first.score[2] || first.startColumn - second.startColumn)
      .find(candidate => !placements.some(placement => overlaps(placement, candidate)))
    if (selected) placements.push({ zoneId: selected.zoneId, row: selected.row, startColumn: selected.startColumn, endColumn: selected.endColumn, availableColumns: selected.availableColumns, centerColumn: selected.centerColumn, source: 'auto' })
  }
  return placements
}

export const zoneLabelPlacementKey = (placement: ZoneLabelPlacement) => key(placement.row, placement.startColumn)
