import { describe, expect, it } from 'vitest'
import { case011 } from '../../data/cases/case011'
import { areAllCluesSatisfied, evaluateCharacterClues } from '../clues'
import { expectManualD1Case } from './manualD1Case.testUtils'
import { findKiller, getCell, placementsEqual } from '../rules'
import { solveCaseWithStats } from '../solver'
import { isBoardCorner } from '../spatial'

describe('case011', () => {
  it('is valid, unique and identifies Raúl', () => expectManualD1Case(case011, 11, 'raul'))

  it('uses a blocking reading table and library shelves', () => {
    const table = case011.board.filter(cell => cell.object?.id === 'readingTable')
    expect(table.map(cell => `${cell.row}:${cell.column}`)).toEqual(['3:3', '3:4'])
    expect(table.every(cell => !cell.occupiable)).toBe(true)
    expect(case011.board.filter(cell => cell.object?.id === 'shelfA' || cell.object?.id === 'shelfB').every(cell => !cell.occupiable)).toBe(true)
  })

  it('gives Mónica and Sofía precise, visible and non-interchangeable references', () => {
    const monica = case011.characters.find(character => character.id === 'monica')!
    const sofia = case011.characters.find(character => character.id === 'sofia')!
    expect(case011.solution.find(placement => placement.characterId === 'monica')?.position).toEqual({ row: 1, column: 1 })
    expect(case011.solution.find(placement => placement.characterId === 'sofia')?.position).toEqual({ row: 2, column: 2 })
    expect(monica.clues.map(clue => clue.text)).toEqual(['Estaba sentada en una esquina.', 'Estaba sentada en la silla de la entrada.'])
    expect(sofia.clues.map(clue => clue.text)).toEqual(['Estaba sentada en una silla.', 'Estaba al noreste de una estantería.'])
    const clueText = case011.characters.flatMap(character => character.clues.map(clue => clue.text)).join(' ')
    expect(clueText).not.toContain('Estaba sentada en el acceso.')
    expect(clueText).not.toContain('Estaba sentada al fondo de la sala.')
    expect(clueText).not.toMatch(/ocupaba/i)
    expect(isBoardCorner(getCell(case011.board, { row: 1, column: 1 })!, case011.rows, case011.columns)).toBe(true)
    expect(areAllCluesSatisfied(case011, case011.solution)).toBe(true)

    const candidatesFor = (characterId: string) => case011.board.filter(cell => cell.occupiable && evaluateCharacterClues(characterId, case011, [{ characterId, position: cell }]).every(result => result.evaluation === 'satisfied'))
    expect(candidatesFor('monica').map(cell => `${cell.row}:${cell.column}`)).toEqual(['1:1'])
    expect(candidatesFor('sofia').map(cell => `${cell.row}:${cell.column}`)).toEqual(['2:2'])

    const swapped = case011.solution.map(placement => placement.characterId === 'monica'
      ? { ...placement, position: { row: 2, column: 2 } }
      : placement.characterId === 'sofia'
        ? { ...placement, position: { row: 1, column: 1 } }
        : placement)
    expect(areAllCluesSatisfied(case011, swapped)).toBe(false)
    expect(evaluateCharacterClues('monica', case011, swapped).some(result => result.evaluation === 'violated')).toBe(true)
    expect(evaluateCharacterClues('sofia', case011, swapped).some(result => result.evaluation === 'violated')).toBe(true)
  })

  it('remains uniquely canonical and identifies Raúl after clarifying the two seats', () => {
    const solved = solveCaseWithStats(case011)
    expect(solved.truncated).toBeUndefined()
    expect(solved.solutionsFound).toBe(1)
    expect(placementsEqual(solved.solutions[0], case011.solution)).toBe(true)
    expect(findKiller(case011, case011.solution)?.id).toBe('raul')
  })
})
