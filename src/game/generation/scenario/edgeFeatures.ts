import { adjacentCellsForEdgeSegment, areCollinearContiguousEdgeSegments, edgeSegmentKey } from '../../edgeFeatures'
import { isWallSide } from '../../spatial'
import { createSeededRandom, shuffle } from '../random'
import type { BoardCell, EdgeFeature, EdgeSegment, WallSide } from '../../types'

const sides: WallSide[] = ['N', 'E', 'S', 'W']

interface TypedEdgeCandidate {
  featureType: EdgeFeature['type']
  segment: EdgeSegment
}

const isExteriorSegment = (segment: EdgeSegment, rows: number, columns: number) =>
  (segment.side === 'N' && segment.position.row === 1) ||
  (segment.side === 'S' && segment.position.row === rows) ||
  (segment.side === 'W' && segment.position.column === 1) ||
  (segment.side === 'E' && segment.position.column === columns)

/** Collects each physical edge once, with windows only outside and doors only between zones. */
function collectTypedCandidates(board: BoardCell[], rows: number, columns: number): TypedEdgeCandidate[] {
  const candidates = new Map<string, TypedEdgeCandidate>()
  for (const cell of board) for (const side of sides) {
    if (!isWallSide(cell, side, board)) continue
    const segment: EdgeSegment = { position: { row: cell.row, column: cell.column }, side }
    const key = edgeSegmentKey(segment)
    if (candidates.has(key)) continue
    if (isExteriorSegment(segment, rows, columns)) {
      candidates.set(key, { featureType: 'window', segment })
      continue
    }
    const adjacent = adjacentCellsForEdgeSegment(segment, board)
    if (adjacent.length === 2 && adjacent[0].zoneId !== adjacent[1].zoneId) candidates.set(key, { featureType: 'door', segment })
  }
  return [...candidates.values()]
}

const available = (candidates: readonly TypedEdgeCandidate[], featureType: EdgeFeature['type'], used: ReadonlySet<string>) => candidates.filter(candidate => candidate.featureType === featureType && !used.has(edgeSegmentKey(candidate.segment)))

/** Finds a physical two-segment exterior window without reusing an already consumed segment. */
export function findWideWindowSegments(candidates: readonly EdgeSegment[], used: ReadonlySet<string>): [EdgeSegment, EdgeSegment] | undefined {
  for (let firstIndex = 0; firstIndex < candidates.length; firstIndex += 1) for (let secondIndex = firstIndex + 1; secondIndex < candidates.length; secondIndex += 1) {
    const first = candidates[firstIndex], second = candidates[secondIndex]
    if (!used.has(edgeSegmentKey(first)) && !used.has(edgeSegmentKey(second)) && areCollinearContiguousEdgeSegments(first, second)) return [first, second]
  }
  return undefined
}

const consume = (used: Set<string>, segments: readonly EdgeSegment[]) => segments.forEach(segment => used.add(edgeSegmentKey(segment)))

export function generateScenarioEdgeFeatures(board: BoardCell[], rows: number, columns: number, difficulty: number, seed: number): EdgeFeature[] | undefined {
  if (difficulty < 4) return undefined
  const random = createSeededRandom((seed ^ 0x51ed270b) >>> 0)
  const candidates = collectTypedCandidates(board, rows, columns)
  const windows = shuffle(candidates.filter(candidate => candidate.featureType === 'window'), random)
  const doors = shuffle(candidates.filter(candidate => candidate.featureType === 'door'), random)
  const used = new Set<string>()
  const wideWindow = difficulty >= 5 ? findWideWindowSegments(windows.map(candidate => candidate.segment), used) : undefined
  const windowSegments = wideWindow ?? (windows[0] ? [windows[0].segment] : undefined)
  if (!windowSegments) return undefined
  consume(used, windowSegments)
  const door = available(doors, 'door', used)[0]
  if (!door) return undefined
  consume(used, [door.segment])
  const features: EdgeFeature[] = [
    { id: 'gen-window-1', type: 'window', label: wideWindow ? 'Ventanal' : 'Ventana', segments: windowSegments },
    { id: 'gen-door-1', type: 'door', label: 'Puerta', segments: [door.segment] },
  ]
  if (difficulty < 5) return features
  const sources = shuffle<EdgeFeature['type']>(['window', 'door'], random)
  const extra = sources.map(featureType => available(featureType === 'window' ? windows : doors, featureType, used)[0]).find((candidate): candidate is TypedEdgeCandidate => !!candidate)
  if (!extra) return undefined
  consume(used, [extra.segment])
  features.push({ id: `gen-${extra.featureType}-2`, type: extra.featureType, label: extra.featureType === 'window' ? 'Ventana' : 'Acceso', segments: [extra.segment] })
  return features
}
