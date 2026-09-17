import { describe, expect, it } from 'vitest'
import { case010 } from '../../data/cases/case010'
import { case012 } from '../../data/cases/case012'
import { case013 } from '../../data/cases/case013'
import { case014 } from '../../data/cases/case014'
import { case015 } from '../../data/cases/case015'
import { resolveObjectVisualProfile } from '../objects/appearanceCatalog'
import { getObjectFootprint, isFootprintReservedCell } from '../objects/footprints'
import { expectManualD1Case } from './manualD1Case.testUtils'

describe('case015', () => {
  it('is valid, unique and identifies Mateo', () => {
    expectManualD1Case(case015, 15, 'mateo')
  })

  it('uses the theatre footprints and their explicit occupiable positions', () => {
    const pianoCells = case015.board.filter(cell => cell.object?.id === 'piano')
    expect(pianoCells.map(cell => `${cell.row}:${cell.column}`)).toEqual(['1:2', '1:3'])
    expect(getObjectFootprint(pianoCells[0].object!, pianoCells[0])).toEqual([{ row: 1, column: 2 }, { row: 1, column: 3 }])
    expect(pianoCells[0].object?.occupiablePositions).toEqual([{ row: 1, column: 2 }])
    expect(pianoCells[0].occupiable).toBe(true)
    expect(pianoCells[1].occupiable).toBe(false)
    expect(isFootprintReservedCell(pianoCells[1].object, pianoCells[1])).toBe(true)

    const dressingTable = case015.board.filter(cell => cell.object?.id === 'dressingTable')
    expect(dressingTable.map(cell => `${cell.row}:${cell.column}`)).toEqual(['5:5', '5:6'])
    expect(getObjectFootprint(dressingTable[0].object!, dressingTable[0])).toEqual([{ row: 5, column: 5 }, { row: 5, column: 6 }])
    expect(dressingTable.every(cell => !cell.occupiable)).toBe(true)
    expect(isFootprintReservedCell(dressingTable[1].object, dressingTable[1])).toBe(true)

    const seats = case015.board.filter(cell => cell.object?.id === 'cinemaSeats')
    expect(seats.map(cell => `${cell.row}:${cell.column}`)).toEqual(['3:5', '3:6'])
    expect(seats[0].object?.occupiablePositions).toEqual([{ row: 3, column: 6 }])
    expect(seats[0].occupiable).toBe(false)
    expect(seats[1].occupiable).toBe(true)
    expect(isFootprintReservedCell(seats[0].object, seats[0])).toBe(true)
  })

  it('keeps the coat rack, spotlight and curtains non-occupiable decorations', () => {
    const coatRack = case015.board.find(cell => cell.object?.id === 'coatRack')!
    expect(coatRack.object?.appearance).toBe('coatRack')
    expect(coatRack.occupiable).toBe(false)
    expect(resolveObjectVisualProfile(coatRack.object!)).toBe('tall')

    const spotlight = case015.board.find(cell => cell.object?.id === 'stageSpotlight')!
    expect(spotlight.object?.appearance).toBe('stageSpotlight')
    expect(spotlight.occupiable).toBe(false)
    expect(resolveObjectVisualProfile(spotlight.object!)).toBe('compact')

    const curtain = case015.edgeFeatures!.find(feature => feature.id === 'stage-curtain')!
    expect(curtain.label).toBe('Cortina de escenario')
    expect(curtain.segments).toEqual([
      { position: { row: 1, column: 4 }, side: 'N' },
      { position: { row: 1, column: 5 }, side: 'N' },
    ])
    expect(case015.board.some(cell => cell.object?.id.toLowerCase().includes('curtain'))).toBe(false)
  })

  it('keeps valid free zone labels and a theatre geometry distinct from prior cases', () => {
    for (const zone of case015.zones) {
      const anchor = zone.labelAnchor!.position
      const cell = case015.board.find(candidate => candidate.row === anchor.row && candidate.column === anchor.column)!
      expect(cell.zoneId).toBe(zone.id)
      expect(cell.object).toBeUndefined()
      expect(case015.solution.some(placement => placement.position.row === anchor.row && placement.position.column === anchor.column)).toBe(false)
    }

    const theatreSignature = JSON.stringify({
      zones: case015.board.map(cell => cell.zoneId),
      objects: case015.board.filter(cell => cell.object).map(cell => cell.object!.appearance ?? cell.object!.id),
      edges: case015.edgeFeatures,
    })
    for (const otherCase of [case010, case012, case013, case014]) {
      expect(theatreSignature).not.toBe(JSON.stringify({
        zones: otherCase.board.map(cell => cell.zoneId),
        objects: otherCase.board.filter(cell => cell.object).map(cell => cell.object!.appearance ?? cell.object!.id),
        edges: otherCase.edgeFeatures,
      }))
    }
  })
})
