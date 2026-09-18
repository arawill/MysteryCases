import { describe, expect, it } from 'vitest'
import { case001 } from '../../../data/cases/case001'
import { caseD201 } from '../../../data/cases/caseD201'
import { createScenarioProfile } from '../../generation/scenario/profile'
import { resolveZoneLabelPlacements } from '../labelPlacement'
import type { BoardCell, EdgeFeature, Zone } from '../../types'

const board = (size: number, zones: Zone[]): BoardCell[] => Array.from({ length: size * size }, (_, index) => ({
  row: Math.floor(index / size) + 1,
  column: index % size + 1,
  zoneId: index % size < Math.ceil(size / 2) ? zones[0].id : zones[1].id,
  occupiable: true,
}))

describe('zone label placement', () => {
  it.each([6, 7, 10])('places one lower-wall plaque per zone on a %ix%i board', size => {
    const zones: Zone[] = [{ id: 'left', name: 'Archivo principal', tone: 'cafe' }, { id: 'right', name: 'Sala de observación', tone: 'kitchen' }]
    const placements = resolveZoneLabelPlacements(zones, board(size, zones))
    expect(placements).toHaveLength(2)
    expect(placements.map(placement => placement.zoneId)).toEqual(['left', 'right'])
    expect(placements.every(placement => placement.row === size && placement.source === 'auto')).toBe(true)
  })

  it('avoids wall segments occupied by doors or windows', () => {
    const zones: Zone[] = [{ id: 'room', name: 'Sala amplia', tone: 'cafe' }]
    const cells = Array.from({ length: 9 }, (_, index) => ({ row: Math.floor(index / 3) + 1, column: index % 3 + 1, zoneId: 'room', occupiable: true }))
    const features: EdgeFeature[] = [{ id: 'door', type: 'door', label: 'Puerta', segments: [{ position: { row: 3, column: 2 }, side: 'S' }] }]
    const [placement] = resolveZoneLabelPlacements(zones, cells, features)
    expect(placement).toEqual(expect.objectContaining({ row: 3, startColumn: 1, endColumn: 1 }))
  })

  it('uses a valid explicit edge anchor and supports current 6x6 and 7x7 cases', () => {
    const zones: Zone[] = [{ id: 'room', name: 'Sala', tone: 'cafe', labelEdgeAnchor: { segment: { position: { row: 4, column: 2 }, side: 'S' }, span: 2 } }]
    const cells = Array.from({ length: 16 }, (_, index) => ({ row: Math.floor(index / 4) + 1, column: index % 4 + 1, zoneId: 'room', occupiable: true }))
    expect(resolveZoneLabelPlacements(zones, cells)[0]).toEqual(expect.objectContaining({ zoneId: 'room', row: 4, startColumn: 2, endColumn: 3, availableColumns: 2, centerColumn: 2.5, source: 'explicit' }))
    expect(resolveZoneLabelPlacements(case001.zones, case001.board)).toHaveLength(case001.zones.length)
    expect(resolveZoneLabelPlacements(caseD201.zones, caseD201.board, caseD201.edgeFeatures)).toHaveLength(caseD201.zones.length)
    expect(createScenarioProfile({ ...case001, zones: [{ ...case001.zones[0], labelEdgeAnchor: { segment: { position: { row: 3, column: 1 }, side: 'S' }, span: 1 } }, ...case001.zones.slice(1)] }).zones[0].labelEdgeAnchor).toBeUndefined()
  })
})
