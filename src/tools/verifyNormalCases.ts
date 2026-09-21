import { getEffectiveNormalCatalog, validateEffectiveNormalClues } from '../game/normal/catalogValidation'
import { PUBLISHED_NORMAL_TOTAL } from '../game/normal/availability'
import { findKiller, placementsEqual } from '../game/rules'
import { solveCaseWithStats } from '../game/solver'
import { validateCaseDefinition } from '../game/validation'

const cases = getEffectiveNormalCatalog()
if (cases.length !== PUBLISHED_NORMAL_TOTAL) throw new Error('Published Normal catalog is incomplete.')
const ids = new Set<string>()
for (const item of cases) {
  const errors = [...validateCaseDefinition(item.caseData), ...validateEffectiveNormalClues(item, item.caseData)]
  if (errors.length) throw new Error(`${item.caseData.id}: ${errors.join('; ')}`)
  const solved = solveCaseWithStats(item.caseData)
  if (solved.truncated || solved.solutionsFound !== 1 || !placementsEqual(solved.solutions[0], item.caseData.solution)) throw new Error(`${item.caseData.id}: not uniquely canonical or search truncated.`)
  if (findKiller(item.caseData, item.caseData.solution)?.id !== item.killerId) throw new Error(`${item.caseData.id}: killer mismatch.`)
  if (ids.has(item.caseData.id)) throw new Error(`${item.caseData.id}: duplicate public case.`)
  ids.add(item.caseData.id)
}
console.log(`${cases.length} casos Normal publicados verificados.`)
