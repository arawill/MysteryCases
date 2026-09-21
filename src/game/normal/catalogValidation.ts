import { publishedNormalCases } from './availability'
import { getManualNormalCase } from '../../data/cases/manualNormalCases'
import { areAllCluesSatisfied } from '../clues'
import { validateHumanClueQuality } from '../generation/clueQuality'
import type { GameCase } from '../types'
import { generateNormalCase, type NormalCaseRequest } from './generator'

export function getEffectiveNormalCatalog() {
  return publishedNormalCases.map(request => ({ ...generateNormalCase(request), ...request }))
}

export function validateEffectiveNormalClues(request: NormalCaseRequest, caseData: GameCase): string[] {
  const manual = request.difficulty === 1 && request.caseNumber === 1 || !!getManualNormalCase(request.difficulty, request.caseNumber)
  const errors = manual ? [] : validateHumanClueQuality(caseData)
  if (!areAllCluesSatisfied(caseData, caseData.solution)) errors.push('Canonical clues are not satisfied.')
  if (caseData.characters.some(character => character.isVictim && character.clues.length > 0)) errors.push('Victim must have no logical clues.')
  return errors
}
