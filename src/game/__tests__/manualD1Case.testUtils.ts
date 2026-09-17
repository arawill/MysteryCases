import { expect } from 'vitest'
import { getManualNormalCase } from '../../data/cases/manualNormalCases'
import { getObjectFootprint } from '../objects/footprints'
import { findKiller, placementsEqual } from '../rules'
import { solveCaseWithStats } from '../solver'
import { validateCaseDefinition } from '../validation'
import type { GameCase } from '../types'

export function expectManualD1Case(caseData: GameCase, caseNumber: number, killerId: string) {
  const solved = solveCaseWithStats(caseData)
  expect(validateCaseDefinition(caseData)).toEqual([])
  expect(caseData.rows).toBe(6)
  expect(caseData.columns).toBe(6)
  expect(caseData.characters).toHaveLength(6)
  expect(caseData.characters.find(character => character.isVictim)?.clues).toEqual([])
  expect(solved.truncated).toBeUndefined()
  expect(solved.solutionsFound).toBe(1)
  expect(placementsEqual(solved.solutions[0], caseData.solution)).toBe(true)
  expect(findKiller(caseData, caseData.solution)?.id).toBe(killerId)
  const victim = caseData.characters.find(character => character.isVictim)!
  const victimPlacement = caseData.solution.find(placement => placement.characterId === victim.id)!
  const victimZone = caseData.board.find(cell => cell.row === victimPlacement.position.row && cell.column === victimPlacement.position.column)!.zoneId
  expect(caseData.solution.filter(placement => caseData.board.find(cell => cell.row === placement.position.row && cell.column === placement.position.column)?.zoneId === victimZone)).toHaveLength(2)
  expect(getManualNormalCase(1, caseNumber)).toBe(caseData)
  for (const cell of caseData.board.filter(candidate => candidate.object)) {
    const footprint = getObjectFootprint(cell.object!, cell)
    expect(footprint.every(position => caseData.board.some(candidate => candidate.row === position.row && candidate.column === position.column))).toBe(true)
  }
}
