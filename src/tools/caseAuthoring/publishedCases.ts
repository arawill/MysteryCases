import { case001 } from '../../data/cases/case001'
import { manualNormalCases } from '../../data/cases/manualNormalCases'
import { getPublishedNormalNumbers } from '../../game/normal/availability'
import type { RegisteredSerializedCase } from './validation'

export const registeredSerializedNormalCases: RegisteredSerializedCase[] = [
  { difficulty: 1, caseNumber: 1, caseData: case001 },
  ...[...manualNormalCases.entries()].flatMap(([key, caseData]) => {
    const [difficulty, caseNumber] = key.split(':').map(Number)
    return difficulty === 1 ? [{ difficulty, caseNumber, caseData }] : []
  }),
].sort((left, right) => left.caseNumber - right.caseNumber)

export const expectedSerializedNormalCaseIds = getPublishedNormalNumbers(1).map(caseNumber => `case${String(caseNumber).padStart(3, '0')}`)
