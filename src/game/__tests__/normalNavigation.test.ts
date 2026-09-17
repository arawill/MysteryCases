import { describe, expect, it } from 'vitest'
import { getNormalCaseNavigation } from '../normal/navigation'
import type { DifficultyRating } from '../types'
import type { NormalModeProgress } from '../persistence/normalProgress'

const progress = (highestUnlocked: DifficultyRating): NormalModeProgress => {
  const completed = { 1: [], 2: [], 3: [], 4: [], 5: [] } as Record<DifficultyRating, number[]>
  for (let difficulty = 1; difficulty < highestUnlocked; difficulty += 1) completed[difficulty as DifficultyRating] = Array.from({ length: 15 }, (_, index) => index + 1)
  return { saveVersion: 1, selectedDifficulty: 1, completedCaseNumbersByDifficulty: completed }
}

describe('normal case navigation', () => {
  it('moves within a difficulty and stops before the first case', () => {
    expect(getNormalCaseNavigation({ difficulty: 1, caseNumber: 1, progress: progress(1) })).toEqual({ previous: null, next: { difficulty: 1, caseNumber: 2 } })
    expect(getNormalCaseNavigation({ difficulty: 1, caseNumber: 2, progress: progress(1) })).toEqual({ previous: { difficulty: 1, caseNumber: 1 }, next: { difficulty: 1, caseNumber: 3 } })
  })
  it('does not cross into a blocked difficulty', () => {
    expect(getNormalCaseNavigation({ difficulty: 1, caseNumber: 15, progress: progress(1) }).next).toBeNull()
  })
  it('crosses unlocked difficulties in both directions', () => {
    expect(getNormalCaseNavigation({ difficulty: 1, caseNumber: 15, progress: progress(2) }).next).toEqual({ difficulty: 2, caseNumber: 1 })
    expect(getNormalCaseNavigation({ difficulty: 2, caseNumber: 1, progress: progress(2) }).previous).toEqual({ difficulty: 1, caseNumber: 15 })
    expect(getNormalCaseNavigation({ difficulty: 4, caseNumber: 15, progress: progress(5) }).next).toEqual({ difficulty: 5, caseNumber: 1 })
  })
  it('never wraps beyond the final case', () => {
    expect(getNormalCaseNavigation({ difficulty: 5, caseNumber: 15, progress: progress(5) }).next).toBeNull()
  })
})
