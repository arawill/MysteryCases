import { describe, expect, it } from 'vitest'
import { case010 } from '../../data/cases/case010'
import { areAllCluesSatisfied, evaluateCharacterClues } from '../clues'
import { isFootprintReservedCell } from '../objects/footprints'
import { findKiller, placementsEqual } from '../rules'
import { solveCaseWithStats } from '../solver'
import { expectManualD1Case } from './manualD1Case.testUtils'

describe('case010', () => {
  it('is valid, unique and identifies Tomás', () => expectManualD1Case(case010, 10, 'tomas'))

  it('keeps the screen mural and cinema seating non-ambiguous', () => {
    expect(case010.edgeFeatures?.some(feature => feature.label === 'Pantalla')).toBe(true)
    expect(case010.board.some(cell => cell.object?.id === 'screen')).toBe(false)
    const projector = case010.board.find(cell => cell.object?.id === 'projector')!
    expect(projector.object?.appearance).toBe('projector')
    expect(projector.occupiable).toBe(false)
    const seats = case010.board.filter(cell => cell.object?.id === 'cinemaSeats')
    expect(seats.map(cell => `${cell.row}:${cell.column}`)).toEqual(['3:1', '3:2'])
    expect(seats[0].occupiable).toBe(true)
    expect(seats[1].occupiable).toBe(false)
    expect(isFootprintReservedCell(seats[1].object, seats[1])).toBe(true)
  })

  it('uses distinct visible clues that prevent Alicia and Santi from exchanging their corridor seats', () => {
    const alicia = case010.characters.find(character => character.id === 'alicia')!
    const santi = case010.characters.find(character => character.id === 'santi')!
    expect(case010.solution.find(placement => placement.characterId === 'alicia')?.position).toEqual({ row: 4, column: 5 })
    expect(case010.solution.find(placement => placement.characterId === 'santi')?.position).toEqual({ row: 5, column: 4 })
    expect(alicia.clues.map(clue => clue.text)).toEqual(['Estaba sentada en el taburete del pasillo.'])
    expect(santi.clues.map(clue => clue.text)).toEqual(['Estaba sentado en una silla.', 'Estaba junto a la pared que separa la sala del pasillo.'])
    expect([...alicia.clues, ...santi.clues].some(clue => /ocupaba/i.test(clue.text))).toBe(false)
    expect(alicia.clues).not.toEqual(santi.clues)
    expect(areAllCluesSatisfied(case010, case010.solution)).toBe(true)

    const swapped = case010.solution.map(placement => placement.characterId === 'alicia'
      ? { ...placement, position: { row: 5, column: 4 } }
      : placement.characterId === 'santi'
        ? { ...placement, position: { row: 4, column: 5 } }
        : placement)
    expect(areAllCluesSatisfied(case010, swapped)).toBe(false)
    expect(evaluateCharacterClues('alicia', case010, swapped).some(result => result.evaluation === 'violated')).toBe(true)
    expect(evaluateCharacterClues('santi', case010, swapped).some(result => result.evaluation === 'violated')).toBe(true)
  })

  it('remains uniquely canonical and identifies Tomás after clarifying the corridor clues', () => {
    const solved = solveCaseWithStats(case010)
    expect(solved.truncated).toBeUndefined()
    expect(solved.solutionsFound).toBe(1)
    expect(placementsEqual(solved.solutions[0], case010.solution)).toBe(true)
    expect(findKiller(case010, case010.solution)?.id).toBe('tomas')
  })
})
