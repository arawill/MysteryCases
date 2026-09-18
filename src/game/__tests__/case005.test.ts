import { describe, expect, it } from 'vitest'
import { case005 } from '../../data/cases/case005'
import { areAllCluesSatisfied, evaluateCharacterClues } from '../clues'
import { findKiller, placementsEqual } from '../rules'
import { solveCaseWithStats } from '../solver'
import { expectManualD1Case } from './manualD1Case.testUtils'

describe('case005', () => {
  it('is valid and unique', () => expectManualD1Case(case005, 5, 'alvaro'))

  it('keeps the café counter as a blocking horizontal footprint', () => {
    const counter = case005.board.filter(cell => cell.object?.id === 'cafeCounter')
    expect(counter.map(cell => `${cell.row}:${cell.column}`)).toEqual(['1:1', '1:2'])
    expect(counter.every(cell => !cell.occupiable)).toBe(true)
    expect(case005.board.some(cell => cell.object?.appearance === 'coffeeMachine')).toBe(true)
  })

  it('places the round table in the lounge and a blocking storage crate in its former storage position', () => {
    const table = case005.board.filter(cell => cell.object?.id === 'roundTable')
    expect(table.map(cell => `${cell.row}:${cell.column}`)).toEqual(['2:5'])
    expect(table.every(cell => cell.zoneId === 'lounge' && !cell.occupiable)).toBe(true)
    expect(case005.board.some(cell => cell.object?.id === 'roundTable' && cell.zoneId === 'storage')).toBe(false)

    const crate = case005.board.find(cell => cell.object?.id === 'storageCrate')
    expect(crate).toMatchObject({ row: 5, column: 4, zoneId: 'storage', occupiable: false })
    expect(crate?.object).toMatchObject({ label: 'una caja', visualProfile: 'standard', occupiable: false })
  })

  it('keeps both stools legal while their visible clues distinguish Celia and Pablo', () => {
    const celia = case005.characters.find(character => character.id === 'celia')!
    const pablo = case005.characters.find(character => character.id === 'pablo')!
    const stools = case005.board.filter(cell => cell.object?.appearance === 'stool')
    expect(stools.map(cell => `${cell.row}:${cell.column}`)).toEqual(['1:4', '2:6'])
    expect(stools.every(cell => cell.occupiable)).toBe(true)
    expect(celia.clues.map(clue => clue.text)).toEqual(['Estaba sentada en un taburete.', 'Estaba al noroeste de la mesa redonda.'])
    expect(pablo.clues.map(clue => clue.text)).toEqual(['Estaba sentado en un taburete.', 'Estaba en una esquina de la sala.'])
    expect(celia.clues).not.toEqual(pablo.clues)
    expect([...celia.clues, ...pablo.clues].some(clue => /ocupaba/i.test(clue.text))).toBe(false)

    const swapped = case005.solution.map(placement => placement.characterId === 'celia'
      ? { ...placement, position: { row: 2, column: 6 } }
      : placement.characterId === 'pablo'
        ? { ...placement, position: { row: 1, column: 4 } }
        : placement)
    expect(areAllCluesSatisfied(case005, case005.solution)).toBe(true)
    expect(areAllCluesSatisfied(case005, swapped)).toBe(false)
    expect(evaluateCharacterClues('celia', case005, swapped).some(result => result.evaluation === 'violated')).toBe(true)
    expect(evaluateCharacterClues('pablo', case005, swapped).some(result => result.evaluation === 'violated')).toBe(true)
  })

  it('remains uniquely canonical and identifies Álvaro after the thematic redistribution', () => {
    const solved = solveCaseWithStats(case005)
    expect(solved.truncated).toBeUndefined()
    expect(solved.solutionsFound).toBe(1)
    expect(placementsEqual(solved.solutions[0], case005.solution)).toBe(true)
    expect(findKiller(case005, case005.solution)?.id).toBe('alvaro')
  })
})
