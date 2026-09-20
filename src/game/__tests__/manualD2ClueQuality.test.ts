import { describe, expect, it } from 'vitest'
import { manualNormalCases } from '../../data/cases/manualNormalCases'
import { evaluateCharacterClues } from '../clues'
import { getCell } from '../rules'

const manualD2Cases = () => [...manualNormalCases.values()].filter(caseData => caseData.difficulty === 2)

describe('manual D2 clue quality', () => {
  it('does not give a non-victim both an exact row and an exact column', () => {
    for (const caseData of manualD2Cases()) for (const character of caseData.characters.filter(candidate => !candidate.isVictim)) {
      const types = character.clues.map(clue => clue.type)
      expect(types, `${caseData.id}: ${character.name} combines an exact row and column.`).not.toEqual(expect.arrayContaining(['row', 'column']))
    }
  })

  it('leaves at least two legal candidates when only a character’s own clues are applied', () => {
    for (const caseData of manualD2Cases()) for (const character of caseData.characters.filter(candidate => !candidate.isVictim)) {
      const candidates = caseData.board.filter(cell => cell.occupiable && evaluateCharacterClues(character.id, caseData, [{ characterId: character.id, position: { row: cell.row, column: cell.column } }])
        .every(result => result.evaluation !== 'violated'))
      expect(candidates.length, `${caseData.id}: ${character.name} has only ${candidates.length} individual candidate(s): ${candidates.map(cell => `${cell.row}:${cell.column}`).join(', ')}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('keeps every canonical D2 clue true without using hidden data', () => {
    for (const caseData of manualD2Cases()) for (const character of caseData.characters) {
      const placement = caseData.solution.find(candidate => candidate.characterId === character.id)!
      expect(getCell(caseData.board, placement.position)?.occupiable, `${caseData.id}: ${character.name} is not on a legal cell.`).toBe(true)
      expect(evaluateCharacterClues(character.id, caseData, caseData.solution).every(result => result.evaluation === 'satisfied'), `${caseData.id}: ${character.name} has an unsatisfied canonical clue.`).toBe(true)
      expect(character.clues.some(clue => clue.text.toLocaleLowerCase('es').includes('ocupaba')), `${caseData.id}: ${character.name} uses “ocupaba”.`).toBe(false)
    }
  })
})
