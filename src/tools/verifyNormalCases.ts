import { case001 } from '../data/cases/case001'
import { frozenNormalCaseSet } from '../data/normal/frozen'
import { analyzeCase } from '../game/analysis'
import { getDifficultyPreset } from '../game/difficultyPresets'
import { hydrateFrozenNormalCase, NORMAL_CASE_SET_VERSION } from '../game/normal/frozen'
import { boardSignature, boardSimilarity, caseFingerprint, clueSignature, solutionSignature } from '../game/normal/signatures'
import { findKiller } from '../game/rules'
import { solveCase } from '../game/solver'
import { validateCaseDefinition } from '../game/validation'

const PACK_IDS = ['cafeteria', 'house', 'office', 'outdoor', 'hotel', 'hospital'] as const
const expected = {
  1: { cafeteria: 14, house: 14, office: 13, outdoor: 13, hotel: 13, hospital: 13 },
  2: { cafeteria: 13, house: 13, office: 14, outdoor: 14, hotel: 13, hospital: 13 },
  3: { cafeteria: 13, house: 13, office: 13, outdoor: 13, hotel: 14, hospital: 14 },
  4: { cafeteria: 14, house: 13, office: 14, outdoor: 13, hotel: 13, hospital: 13 },
  5: { cafeteria: 13, house: 14, office: 13, outdoor: 14, hotel: 13, hospital: 13 },
} as const
if (NORMAL_CASE_SET_VERSION !== 1 || frozenNormalCaseSet.formatVersion !== 1 || frozenNormalCaseSet.proceduralGenerationVersion !== 6 || frozenNormalCaseSet.cases.length !== 399) throw new Error('Frozen Normal case set metadata is invalid.')
const all = [{ caseData: case001, difficulty: 1, caseNumber: 1, scenarioPackId: 'cafeteria', killerId: 'bruno', roster: case001.characters.map(character => ({ id: character.id, name: character.name, isVictim: character.isVictim })) }, ...frozenNormalCaseSet.cases.map(item => ({ caseData: hydrateFrozenNormalCase(item), difficulty: item.difficulty, caseNumber: item.caseNumber, scenarioPackId: item.scenarioPackId, killerId: item.killerId, roster: item.characters }))] as const
const fingerprints = new Set<string>()
for (const item of all) {
  const errors = validateCaseDefinition(item.caseData)
  if (errors.length > 0) throw new Error(`${item.caseData.id}: ${errors.join('; ')}`)
  const solved = solveCase(item.caseData)
  const analysis = analyzeCase(item.caseData)
  if (solved.solutionsFound !== 1 || analysis.status !== 'unique' || analysis.matchesCanonical !== true) throw new Error(`${item.caseData.id}: puzzle is not uniquely canonical.`)
  if (findKiller(item.caseData, item.caseData.solution)?.id !== item.killerId) throw new Error(`${item.caseData.id}: frozen killer mismatch.`)
  const preset = getDifficultyPreset(item.difficulty as 1 | 2 | 3 | 4 | 5)
  if (item.caseData.rows !== preset.rows || item.caseData.columns !== preset.columns || item.caseData.characters.length !== preset.characterCount) throw new Error(`${item.caseData.id}: difficulty dimensions are invalid.`)
  const fingerprint = caseFingerprint(item.caseData, item.scenarioPackId, item.killerId, item.roster)
  if (fingerprints.has(fingerprint)) throw new Error(`${item.caseData.id}: duplicate fingerprint.`)
  fingerprints.add(fingerprint)
}
for (const difficulty of [1, 2, 3, 4, 5] as const) {
  const cases = all.filter(item => item.difficulty === difficulty).sort((a, b) => a.caseNumber - b.caseNumber)
  if (cases.length !== 80 || cases.some((item, index) => item.caseNumber !== index + 1)) throw new Error(`Difficulty ${difficulty} does not contain 80 contiguous cases.`)
  for (let index = 1; index < cases.length; index += 1) if (cases[index - 1].scenarioPackId === cases[index].scenarioPackId) throw new Error(`Difficulty ${difficulty} has consecutive packs.`)
  for (const pack of PACK_IDS) if (cases.filter(item => item.scenarioPackId === pack).length !== expected[difficulty][pack]) throw new Error(`Difficulty ${difficulty} pack distribution is invalid.`)
  for (let left = 0; left < cases.length; left += 1) for (let right = 0; right < left; right += 1) {
    if (boardSignature(cases[left].caseData) === boardSignature(cases[right].caseData)) throw new Error(`Difficulty ${difficulty} has duplicate boards.`)
    if (solutionSignature(cases[left].caseData.solution) === solutionSignature(cases[right].caseData.solution)) throw new Error(`Difficulty ${difficulty} has duplicate solution geometry.`)
    if (clueSignature(cases[left].caseData) === clueSignature(cases[right].caseData)) throw new Error(`Difficulty ${difficulty} has duplicate clue logic.`)
    if (cases[left].scenarioPackId === cases[right].scenarioPackId && boardSimilarity(cases[left].caseData, cases[right].caseData) >= .9) throw new Error(`Difficulty ${difficulty} has near-duplicate boards.`)
  }
}
for (const pack of PACK_IDS) {
  const expectedTotal = pack === 'hotel' || pack === 'hospital' ? 66 : 67
  if (all.filter(item => item.scenarioPackId === pack).length !== expectedTotal) throw new Error(`Global pack distribution is invalid for ${pack}.`)
}
console.log(`Verified ${all.length} frozen Normal cases with ${fingerprints.size} unique fingerprints.`)
