import { describe, expect, it } from 'vitest'
import { case010 } from '../../data/cases/case010'
import { case012 } from '../../data/cases/case012'
import { case013 } from '../../data/cases/case013'
import { case014 } from '../../data/cases/case014'
import { case015 } from '../../data/cases/case015'
import { areAllCluesSatisfied } from '../clues'
import { resolveObjectVisualProfile } from '../objects/appearanceCatalog'
import { getObjectFootprint, isFootprintReservedCell } from '../objects/footprints'
import { findKiller, placementsEqual } from '../rules'
import { solveCaseWithStats } from '../solver'
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

  it('keeps only the requested non-redundant clue for each theatre witness', () => {
    const irene = case015.characters.find(character => character.id === 'irene')!
    const mateo = case015.characters.find(character => character.id === 'mateo')!
    const nadia = case015.characters.find(character => character.id === 'nadia')!
    const oliver = case015.characters.find(character => character.id === 'oliver')!
    const rocio = case015.characters.find(character => character.id === 'rocio')!

    expect(irene.clues).toEqual([{ id: 'c15-irene-piano', type: 'onObject', objectId: 'piano', text: 'Estaba sentada al piano.' }])
    expect(mateo.clues).toEqual([{ id: 'c15-mateo-stool', type: 'onObject', objectId: 'storageStool', text: 'Estaba sentado en el taburete del almacén.' }])
    expect(nadia.clues).toEqual([{ id: 'c15-nadia-seat', type: 'onObject', objectId: 'cinemaSeats', text: 'Estaba sentada en el patio de butacas.' }])
    expect(oliver.clues).toEqual([{ id: 'c15-oliver-seat', type: 'onObject', objectId: 'dressingSeat', text: 'Estaba sentado en el camerino.' }])
    expect(rocio.clues).toEqual([{ id: 'c15-rocio-rack', type: 'besideObject', objectId: 'coatRack', text: 'Estaba junto al perchero.' }])
    expect([irene, mateo, nadia, oliver, rocio].flatMap(character => character.clues).some(clue => /ocupaba/i.test(clue.text))).toBe(false)
    expect(case015.characters.find(character => character.id === 'clara')?.clues).toEqual([])
    expect(areAllCluesSatisfied(case015, case015.solution)).toBe(true)

    const witnessIds = ['irene', 'mateo', 'nadia', 'oliver', 'rocio']
    for (let firstIndex = 0; firstIndex < witnessIds.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < witnessIds.length; secondIndex += 1) {
        const firstId = witnessIds[firstIndex]
        const secondId = witnessIds[secondIndex]
        const firstPosition = case015.solution.find(({ characterId }) => characterId === firstId)!
        const secondPosition = case015.solution.find(({ characterId }) => characterId === secondId)!
        const swapped = case015.solution.map((placement) => {
          if (placement.characterId === firstId) return { ...placement, position: { ...secondPosition.position } }
          if (placement.characterId === secondId) return { ...placement, position: { ...firstPosition.position } }
          return { ...placement, position: { ...placement.position } }
        })
        expect(areAllCluesSatisfied(case015, swapped)).toBe(false)
      }
    }
  })

  it('remains uniquely canonical with Mateo alone with Clara in storage', () => {
    const solved = solveCaseWithStats(case015)
    expect(solved.truncated).toBeUndefined()
    expect(solved.solutionsFound).toBe(1)
    expect(placementsEqual(solved.solutions[0], case015.solution)).toBe(true)
    expect(findKiller(case015, case015.solution)?.id).toBe('mateo')
    const storagePeople = case015.solution.filter(placement => case015.board.find(cell => cell.row === placement.position.row && cell.column === placement.position.column)?.zoneId === 'storage')
    expect(storagePeople.map(placement => placement.characterId).sort()).toEqual(['clara', 'mateo'])
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
