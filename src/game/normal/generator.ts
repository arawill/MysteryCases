import { case001 } from '../../data/cases/case001'
import { generateProceduralCase, type GeneratedProceduralCase } from '../generation/proceduralCase'
import type { DifficultyRating } from '../types'
import { getNormalCaseId, getNormalCaseSeed } from './ids'

export interface NormalCaseRequest { difficulty: DifficultyRating; caseNumber: number }
const validate = ({ difficulty, caseNumber }: NormalCaseRequest) => { if (![1, 2, 3, 4, 5].includes(difficulty) || !Number.isInteger(caseNumber) || caseNumber < 1 || caseNumber > 80) throw new Error('Normal case difficulty or number is invalid.') }
export function generateNormalCase(request: NormalCaseRequest): GeneratedProceduralCase {
  validate(request)
  const { difficulty, caseNumber } = request
  const baseSeed = getNormalCaseSeed(difficulty, caseNumber)
  if (difficulty === 1 && caseNumber === 1) return { caseData: case001, baseSeed, effectiveSeed: baseSeed, seedOffset: 0, killerId: 'bruno', scenarioAttempts: 0 }
  return generateProceduralCase({ id: getNormalCaseId(difficulty, caseNumber), title: `Expediente ${String(caseNumber).padStart(2, '0')}`, intro: 'Reconstruye la escena a partir de las declaraciones y descubre quién se quedó a solas con la víctima.', difficulty, seed: baseSeed })
}
