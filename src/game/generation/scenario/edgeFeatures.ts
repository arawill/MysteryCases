import { edgeSegmentKey } from '../../edgeFeatures'
import { isWallSide } from '../../spatial'
import { createSeededRandom, shuffle } from '../random'
import type { BoardCell, EdgeFeature, EdgeSegment, WallSide } from '../../types'

const sides: WallSide[] = ['N', 'E', 'S', 'W']
const exterior = (cell: BoardCell, side: WallSide, rows: number, columns: number) => (side === 'N' && cell.row === 1) || (side === 'S' && cell.row === rows) || (side === 'W' && cell.column === 1) || (side === 'E' && cell.column === columns)
export function generateScenarioEdgeFeatures(board: BoardCell[], rows: number, columns: number, difficulty: number, seed: number): EdgeFeature[] | undefined {
  if (difficulty < 4) return undefined
  const random = createSeededRandom((seed ^ 0x51ed270b) >>> 0), used = new Set<string>()
  const candidates = board.flatMap(cell => sides.filter(side => isWallSide(cell, side, board)).map(side => ({ position: { row: cell.row, column: cell.column }, side })))
  const windows = shuffle(candidates.filter(segment => exterior(board.find(cell => cell.row === segment.position.row && cell.column === segment.position.column)!, segment.side, rows, columns)), random)
  const doors = shuffle(candidates.filter(segment => !exterior(board.find(cell => cell.row === segment.position.row && cell.column === segment.position.column)!, segment.side, rows, columns)), random)
  const take = (items: EdgeSegment[]) => items.find(segment => !used.has(edgeSegmentKey(segment)))
  const window = take(windows), door = take(doors)
  if (!window || !door) return undefined
  const features: EdgeFeature[] = [{ id: 'gen-window-1', type: 'window', label: 'Ventana', segments: [window] }, { id: 'gen-door-1', type: 'door', label: 'Puerta', segments: [door] }]
  used.add(edgeSegmentKey(window)); used.add(edgeSegmentKey(door))
  if (difficulty >= 5) { const extra = take(windows) ?? take(doors); if (!extra) return undefined; features.push({ id: extra.side === window.side ? 'gen-window-2' : 'gen-door-2', type: extra.side === window.side ? 'window' : 'door', label: extra.side === window.side ? 'Ventanal' : 'Acceso', segments: [extra] }) }
  return features
}
