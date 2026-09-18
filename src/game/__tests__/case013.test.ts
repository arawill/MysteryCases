import { describe, expect, it } from 'vitest'
import { case008 } from '../../data/cases/case008'
import { case009 } from '../../data/cases/case009'
import { case010 } from '../../data/cases/case010'
import { case011 } from '../../data/cases/case011'
import { case012 } from '../../data/cases/case012'
import { case013 } from '../../data/cases/case013'
import { areAllCluesSatisfied } from '../clues'
import { getObjectFootprint, isFootprintReservedCell } from '../objects/footprints'
import { resolveObjectVisualProfile } from '../objects/appearanceCatalog'
import { findKiller, placementsEqual } from '../rules'
import { solveCaseWithStats } from '../solver'
import { expectManualD1Case } from './manualD1Case.testUtils'

describe('case013', () => {
  it('is valid, unique and identifies Darío', () => {
    expectManualD1Case(case013, 13, 'dario')
  })

  it('uses a one-seat gym bench and the required gym equipment', () => {
    const benchCells = case013.board.filter(cell => cell.object?.id === 'gymBench')
    expect(benchCells.map(cell => `${cell.row}:${cell.column}`)).toEqual(['1:3', '1:4'])
    expect(getObjectFootprint(benchCells[0].object!, benchCells[0])).toEqual([
      { row: 1, column: 3 },
      { row: 1, column: 4 },
    ])
    expect(benchCells[0].object?.occupiablePositions).toEqual([{ row: 1, column: 3 }])
    expect(benchCells[0].occupiable).toBe(true)
    expect(benchCells[1].occupiable).toBe(false)
    expect(isFootprintReservedCell(benchCells[1].object, benchCells[1])).toBe(true)

    const treadmill = case013.board.find(cell => cell.object?.id === 'treadmill')!
    expect(treadmill.object?.appearance).toBe('treadmill')
    expect(treadmill.occupiable).toBe(false)
    expect(resolveObjectVisualProfile(treadmill.object!)).toBe('tall')

    const dumbbellCell = case013.board.find(cell => cell.object?.id === 'dumbbells')!
    expect(dumbbellCell.object?.appearance).toBe('dumbbells')
    expect(dumbbellCell.occupiable).toBe(false)
    expect(resolveObjectVisualProfile(dumbbellCell.object!)).toBe('compact')

    const lockers = case013.board.find(cell => cell.object?.id === 'lockerBank')!
    expect(lockers.object?.appearance).toBe('lockerBank')
    expect(lockers.occupiable).toBe(false)
    expect(resolveObjectVisualProfile(lockers.object!)).toBe('tall')
  })

  it('keeps only the non-redundant bench, storage stool and dumbbell clues', () => {
    const violeta = case013.characters.find(character => character.id === 'violeta')!
    const dario = case013.characters.find(character => character.id === 'dario')!
    const lara = case013.characters.find(character => character.id === 'lara')!
    expect(violeta.clues).toEqual([{ id: 'c13-violeta-bench', type: 'onObject', objectId: 'gymBench', text: 'Estaba sentada en el banco de gimnasio.' }])
    expect(dario.clues).toEqual([{ id: 'c13-dario-stool', type: 'onObject', objectId: 'storageStool', text: 'Estaba sentado en el taburete del almacén.' }])
    expect(lara.clues).toEqual([{ id: 'c13-lara-dumbbells', type: 'besideObject', objectId: 'dumbbells', text: 'Estaba junto a las mancuernas.' }])
    expect([...violeta.clues, ...dario.clues, ...lara.clues].some(clue => clue.type === 'zone' || /ocupaba/i.test(clue.text))).toBe(false)
    expect(areAllCluesSatisfied(case013, case013.solution)).toBe(true)
  })

  it('remains uniquely canonical with Darío alone with Inés in the storage room', () => {
    const solved = solveCaseWithStats(case013)
    expect(solved.truncated).toBeUndefined()
    expect(solved.solutionsFound).toBe(1)
    expect(placementsEqual(solved.solutions[0], case013.solution)).toBe(true)
    expect(findKiller(case013, case013.solution)?.id).toBe('dario')
    const storagePeople = case013.solution.filter(placement => case013.board.find(cell => cell.row === placement.position.row && cell.column === placement.position.column)?.zoneId === 'storage')
    expect(storagePeople.map(placement => placement.characterId).sort()).toEqual(['dario', 'ines'])
  })

  it('keeps valid free zone labels and a distinct gym structure', () => {
    for (const zone of case013.zones) {
      const anchor = zone.labelAnchor!.position
      const cell = case013.board.find(candidate => candidate.row === anchor.row && candidate.column === anchor.column)!
      expect(cell.zoneId).toBe(zone.id)
      expect(cell.object).toBeUndefined()
      expect(case013.solution.some(placement => placement.position.row === anchor.row && placement.position.column === anchor.column)).toBe(false)
    }

    const gymSignature = JSON.stringify({
      zones: case013.board.map(cell => cell.zoneId),
      objects: case013.board.filter(cell => cell.object).map(cell => cell.object!.appearance),
    })
    for (const otherCase of [case008, case009, case010, case011, case012]) {
      expect(gymSignature).not.toBe(JSON.stringify({
        zones: otherCase.board.map(cell => cell.zoneId),
        objects: otherCase.board.filter(cell => cell.object).map(cell => cell.object!.appearance),
      }))
    }
    expect(case013.zones.map(zone => zone.id)).toEqual(['reception', 'machines', 'lockers', 'weights', 'storage'])
  })
})
