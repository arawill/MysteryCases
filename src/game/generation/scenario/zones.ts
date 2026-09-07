import type { BoardCell, Position } from '../../types'
import { shuffle, type SeededRandom } from '../random'
import type { ScenarioProfile } from './types'
const key = (position: Position) => `${position.row}:${position.column}`
const neighbors = (position: Position, rows: number, columns: number): Position[] => [[position.row - 1, position.column], [position.row + 1, position.column], [position.row, position.column - 1], [position.row, position.column + 1]].filter(([row, column]) => row >= 1 && row <= rows && column >= 1 && column <= columns).map(([row, column]) => ({ row, column }))
export function generateZoneLayout(profile: ScenarioProfile, random: SeededRandom, minZoneCells: number): BoardCell[] | null {
  const positions = Array.from({ length: profile.rows * profile.columns }, (_, index) => ({ row: Math.floor(index / profile.columns) + 1, column: index % profile.columns + 1 })); const seeds = shuffle(positions, random).slice(0, profile.zones.length); const assigned = new Map<string, string>(); const counts = new Map<string, number>();
  profile.zones.forEach((zone, index) => { assigned.set(key(seeds[index]), zone.id); counts.set(zone.id, 1) })
  const frontier = (zoneId: string) => { const result: Position[] = []; for (const [coordinate, assignedZone] of assigned) if (assignedZone === zoneId) { const [row, column] = coordinate.split(':').map(Number); for (const neighbor of neighbors({ row, column }, profile.rows, profile.columns)) if (!assigned.has(key(neighbor))) result.push(neighbor) } return [...new Map(result.map(position => [key(position), position])).values()] }
  while (assigned.size < positions.length) {
    const underMin = profile.zones.filter(zone => (counts.get(zone.id) ?? 0) < minZoneCells && frontier(zone.id).length > 0); const eligible = underMin.length > 0 ? underMin : profile.zones.filter(zone => frontier(zone.id).length > 0); if (eligible.length === 0) return null
    const zone = shuffle(eligible, random)[0]; const next = shuffle(frontier(zone.id), random)[0]; assigned.set(key(next), zone.id); counts.set(zone.id, (counts.get(zone.id) ?? 0) + 1)
  }
  if (profile.zones.some(zone => (counts.get(zone.id) ?? 0) < minZoneCells)) return null
  return positions.map(position => ({ row: position.row, column: position.column, zoneId: assigned.get(key(position))!, occupiable: true }))
}
