import { describe, expect, it } from 'vitest'
import { case008 } from '../../data/cases/case008'
import { case009 } from '../../data/cases/case009'
import { case010 } from '../../data/cases/case010'
import { case011 } from '../../data/cases/case011'
import { case012 } from '../../data/cases/case012'
import { case013 } from '../../data/cases/case013'
import { case014 } from '../../data/cases/case014'
import { areAllCluesSatisfied } from '../clues'
import { getObjectFootprint, isFootprintReservedCell } from '../objects/footprints'
import { findKiller, placementsEqual } from '../rules'
import { solveCaseWithStats } from '../solver'
import { expectManualD1Case } from './manualD1Case.testUtils'

describe('case014', () => {
  it('is valid, unique and identifies Héctor', () => {
    expectManualD1Case(case014, 14, 'hector')
  })

  it('uses blocking display and restoration footprints', () => {
    const displayCells = case014.board.filter(cell => cell.object?.id === 'displayCase')
    expect(displayCells.map(cell => `${cell.row}:${cell.column}`)).toEqual(['3:4', '3:5'])
    expect(getObjectFootprint(displayCells[0].object!, displayCells[0])).toEqual([
      { row: 3, column: 4 },
      { row: 3, column: 5 },
    ])
    expect(displayCells.every(cell => !cell.occupiable)).toBe(true)
    expect(isFootprintReservedCell(displayCells[1].object, displayCells[1])).toBe(true)

    const tableCells = case014.board.filter(cell => cell.object?.id === 'restorationTable')
    expect(tableCells.map(cell => `${cell.row}:${cell.column}`)).toEqual(['5:5', '5:6'])
    expect(getObjectFootprint(tableCells[0].object!, tableCells[0])).toEqual([
      { row: 5, column: 5 },
      { row: 5, column: 6 },
    ])
    expect(tableCells.every(cell => !cell.occupiable)).toBe(true)
    expect(isFootprintReservedCell(tableCells[1].object, tableCells[1])).toBe(true)
  })

  it('keeps paintings as exterior decorations, outside logical occupancy', () => {
    const paintings = case014.edgeFeatures!.filter(feature => feature.label === 'Cuadro de la galería')
    expect(paintings).toHaveLength(2)
    expect(paintings.flatMap(feature => feature.segments).every(segment =>
      (segment.position.row === 1 && segment.side === 'N') || (segment.position.column === 6 && segment.side === 'E'),
    )).toBe(true)
    expect(case014.board.some(cell => cell.object?.id.toLowerCase().includes('paint'))).toBe(false)
    expect(case014.board.some(cell => cell.object?.label.toLowerCase().includes('cuadro'))).toBe(false)
  })

  it('keeps only the requested non-redundant clue for each museum witness', () => {
    const hector = case014.characters.find(character => character.id === 'hector')!
    const simon = case014.characters.find(character => character.id === 'simon')!
    const iria = case014.characters.find(character => character.id === 'iria')!
    const gael = case014.characters.find(character => character.id === 'gael')!
    expect(hector.clues).toEqual([{ id: 'c14-hector-stool', type: 'onObject', objectId: 'storageStool', text: 'Estaba sentado en el taburete del almacén.' }])
    expect(simon.clues).toEqual([{ id: 'c14-simon-display', type: 'besideObject', objectId: 'displayCase', text: 'Estaba junto a la vitrina.' }])
    expect(iria.clues).toEqual([{ id: 'c14-iria-table', type: 'besideObject', objectId: 'restorationTable', text: 'Estaba junto a la mesa de restauración.' }])
    expect(gael.clues).toEqual([{ id: 'c14-gael-statue', type: 'besideObject', objectId: 'statue', text: 'Estaba junto a la estatua.' }])
    expect([hector, simon, iria, gael].flatMap(character => character.clues).some(clue => /ocupaba/i.test(clue.text))).toBe(false)
    expect(case014.characters.find(character => character.isVictim)?.clues).toEqual([])
    expect(areAllCluesSatisfied(case014, case014.solution)).toBe(true)

    const witnessIds = ['hector', 'simon', 'iria', 'gael']
    for (let firstIndex = 0; firstIndex < witnessIds.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < witnessIds.length; secondIndex += 1) {
        const firstId = witnessIds[firstIndex]
        const secondId = witnessIds[secondIndex]
        const firstPosition = case014.solution.find(({ characterId }) => characterId === firstId)!
        const secondPosition = case014.solution.find(({ characterId }) => characterId === secondId)!
        const swapped = case014.solution.map((placement) => {
          if (placement.characterId === firstId) {
            return { ...placement, position: { ...secondPosition.position } }
          }
          if (placement.characterId === secondId) {
            return { ...placement, position: { ...firstPosition.position } }
          }
          return { ...placement, position: { ...placement.position } }
        })

        expect(areAllCluesSatisfied(case014, swapped)).toBe(false)
      }
    }
  })

  it('remains uniquely canonical with Héctor alone with Noa in storage', () => {
    const solved = solveCaseWithStats(case014)
    expect(solved.truncated).toBeUndefined()
    expect(solved.solutionsFound).toBe(1)
    expect(placementsEqual(solved.solutions[0], case014.solution)).toBe(true)
    expect(findKiller(case014, case014.solution)?.id).toBe('hector')
    const storagePeople = case014.solution.filter(placement => case014.board.find(cell => cell.row === placement.position.row && cell.column === placement.position.column)?.zoneId === 'storage')
    expect(storagePeople.map(placement => placement.characterId).sort()).toEqual(['hector', 'noa'])
  })

  it('keeps valid free zone labels and a distinct museum structure', () => {
    for (const zone of case014.zones) {
      const anchor = zone.labelAnchor!.position
      const cell = case014.board.find(candidate => candidate.row === anchor.row && candidate.column === anchor.column)!
      expect(cell.zoneId).toBe(zone.id)
      expect(cell.object).toBeUndefined()
      expect(case014.solution.some(placement => placement.position.row === anchor.row && placement.position.column === anchor.column)).toBe(false)
    }

    const museumSignature = JSON.stringify({
      zones: case014.board.map(cell => cell.zoneId),
      objects: case014.board.filter(cell => cell.object).map(cell => cell.object!.appearance ?? cell.object!.id),
      edges: case014.edgeFeatures,
    })
    for (const otherCase of [case008, case009, case010, case011, case012, case013]) {
      expect(museumSignature).not.toBe(JSON.stringify({
        zones: otherCase.board.map(cell => cell.zoneId),
        objects: otherCase.board.filter(cell => cell.object).map(cell => cell.object!.appearance ?? cell.object!.id),
        edges: otherCase.edgeFeatures,
      }))
    }
  })
})
