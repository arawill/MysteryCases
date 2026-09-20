import { describe, expect, it } from 'vitest'
import { manualNormalCases } from '../../data/cases/manualNormalCases'
import { areAllCluesSatisfied, evaluateCharacterClues } from '../clues'
import { findKiller, getCell, placementsEqual } from '../rules'
import { solveCaseWithStats } from '../solver'
import { validateCaseDefinition } from '../validation'

const manualD2Cases = () => [...manualNormalCases.values()].filter(caseData => caseData.difficulty === 2)
const directCoordinateTypes = new Set(['row', 'column'])
const objectClueTypes = new Set(['onObject', 'besideObject', 'notOnObject', 'notBesideObject', 'oneOfObjects', 'sameColumnAsObject', 'relativeToObject'])
const characterRelationTypes = new Set(['northOfCharacter', 'southOfCharacter', 'sameZoneAsCharacter', 'besideCharacter', 'rowOffsetFromCharacter'])

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

  it('uses varied, visual clue vocabulary without coordinate-heavy or long-distance designs', () => {
    for (const caseData of manualD2Cases()) {
      const nonVictims = caseData.characters.filter(character => !character.isVictim)
      const clues = nonVictims.flatMap(character => character.clues)
      const directCoordinates = clues.filter(clue => directCoordinateTypes.has(clue.type))
      const objectCharacters = nonVictims.filter(character => character.clues.some(clue => objectClueTypes.has(clue.type)))
      const personRelationCharacters = nonVictims.filter(character => character.clues.some(clue => characterRelationTypes.has(clue.type)))

      expect(directCoordinates.length, `${caseData.id} has too many direct coordinates.`).toBeLessThanOrEqual(3)
      expect(objectCharacters.length, `${caseData.id} needs at least two people tied to visible objects.`).toBeGreaterThanOrEqual(2)
      expect(clues.some(clue => clue.type === 'zone'), `${caseData.id} needs at least one zone clue.`).toBe(true)
      expect(personRelationCharacters.length, `${caseData.id} has too many character-relation clues.`).toBeLessThanOrEqual(2)
      expect(clues.filter(clue => clue.type === 'rowOffsetFromCharacter').length, `${caseData.id} has too many exact character distances.`).toBeLessThanOrEqual(1)
      for (const clue of clues) if (clue.type === 'rowOffsetFromCharacter') expect(Math.abs(clue.rowOffset), `${caseData.id} has an excessive exact distance.`).toBeLessThanOrEqual(2)
      for (const character of nonVictims) {
        const justifiedThirdClue = caseData.id === 'case-d2-05' && character.id === 'paula' || caseData.id === 'case-d2-06' && character.id === 'daniel'
        expect(character.clues.length, `${caseData.id}: ${character.name} has too many clues.`).toBeLessThanOrEqual(justifiedThirdClue ? 3 : 2)
        if (justifiedThirdClue) {
          expect(character.clues.length).toBe(3)
        }
      }
    }
  })

  it('keeps every registered D2 case valid, unique, canonical, fully occupied by zones, and resistant to pairwise swaps', () => {
    for (const caseData of manualD2Cases()) {
      expect(validateCaseDefinition(caseData), `${caseData.id} is invalid.`).toEqual([])
      const solved = solveCaseWithStats(caseData)
      expect(solved.truncated, `${caseData.id} truncated its search.`).not.toBe(true)
      expect(solved.solutionsFound, `${caseData.id} is not unique.`).toBe(1)
      expect(placementsEqual(solved.solutions[0], caseData.solution), `${caseData.id} does not match its canonical solution.`).toBe(true)
      expect(areAllCluesSatisfied(caseData, caseData.solution), `${caseData.id} has an unsatisfied canonical clue.`).toBe(true)
      expect(findKiller(caseData, caseData.solution), `${caseData.id} has no killer.`).not.toBeNull()
      expect(new Set(caseData.solution.map(placement => placement.position.row)).size, `${caseData.id} repeats a row.`).toBe(caseData.rows)
      expect(new Set(caseData.solution.map(placement => placement.position.column)).size, `${caseData.id} repeats a column.`).toBe(caseData.columns)
      for (const zone of caseData.zones) expect(caseData.solution.some(placement => getCell(caseData.board, placement.position)?.zoneId === zone.id), `${caseData.id}: ${zone.name} is empty.`).toBe(true)

      for (let index = 0; index < caseData.solution.length; index += 1) for (let otherIndex = index + 1; otherIndex < caseData.solution.length; otherIndex += 1) {
        const first = caseData.solution[index]
        const second = caseData.solution[otherIndex]
        const swapped = caseData.solution.map(placement => placement.characterId === first.characterId
          ? { ...placement, position: { ...second.position } }
          : placement.characterId === second.characterId
            ? { ...placement, position: { ...first.position } }
            : placement)
        expect(areAllCluesSatisfied(caseData, swapped), `${caseData.id} accepts swapping ${first.characterId} and ${second.characterId}.`).toBe(false)
      }
    }
  })
})
